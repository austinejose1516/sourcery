import Foundation
import SwiftUI

/// Explore data + optimistic toggles (features/explore/hooks.ts).
@Observable
@MainActor
final class ExploreStore {
    var filters: ExploreFiltersDTO?
    var currentQuery = ExploreRecipeQuery()

    var recipes: [RecipeCardDTO] = []
    var recipesStatus: LoadStatus = .idle

    var cooks: [ExploreCookDTO] = []
    var cooksStatus: LoadStatus = .idle

    var collections: [CollectionCardDTO] = []
    var collectionsStatus: LoadStatus = .idle

    var searchQuery = ""
    var searchResults: ExploreSearchResults?
    var searchStatus: LoadStatus = .idle

    var pendingCookID: String?

    func loadFilters() async {
        guard filters == nil else { return }
        filters = try? await ExploreService.fetchFilters()
    }

    func loadRecipes() async {
        if case .loaded = recipesStatus, recipes.isEmpty == false, currentQuery == loadedQuery { return }
        loadedQuery = currentQuery
        recipesStatus = .loading
        do {
            recipes = try await ExploreService.fetchRecipes(currentQuery)
            recipesStatus = .loaded
        } catch {
            recipesStatus = recipes.isEmpty
                ? .failed((error as? ApiError)?.message ?? "Something went wrong.") : .loaded
        }
    }

    func loadCooks() async {
        if case .loaded = cooksStatus { return }
        cooksStatus = .loading
        do {
            cooks = try await ExploreService.fetchCooks()
            cooksStatus = .loaded
        } catch {
            cooksStatus = cooks.isEmpty
                ? .failed((error as? ApiError)?.message ?? "Something went wrong.") : .loaded
        }
    }

    func loadCollections() async {
        if case .loaded = collectionsStatus { return }
        collectionsStatus = .loading
        do {
            collections = try await ExploreService.fetchCollections()
            collectionsStatus = .loaded
        } catch {
            collectionsStatus = collections.isEmpty
                ? .failed((error as? ApiError)?.message ?? "Something went wrong.") : .loaded
        }
    }

    /// Holistic search; only fires at ≥2 chars.
    func search() async {
        let q = searchQuery.trimmingCharacters(in: .whitespaces)
        guard q.count >= 2 else { return }
        searchStatus = .loading
        do {
            searchResults = try await ExploreService.search(q)
            searchStatus = .loaded
        } catch {
            searchStatus = .failed((error as? ApiError)?.message ?? "Something went wrong.")
        }
    }

    /// Optimistic save flip across recipe lists + search results.
    func toggleSave(_ recipe: RecipeCardDTO) async {
        let wasSaved = recipe.isSaved
        let delta = wasSaved ? -1 : 1
        let transform: (RecipeCardDTO) -> RecipeCardDTO = { card in
            RecipeCardDTO(
                id: card.id, title: card.title, titleOriginal: card.titleOriginal,
                description: card.description, cuisine: card.cuisine, region: card.region,
                author: card.author, coverImageUrl: card.coverImageUrl,
                endorsementCount: card.endorsementCount,
                saveCount: max(0, card.saveCount + delta), isSaved: !wasSaved,
            )
        }
        patchRecipe(recipe.id, transform)
        do {
            try await (wasSaved ? SocialService.unsave : SocialService.save)(recipe.id)
        } catch {
            let revert: (RecipeCardDTO) -> RecipeCardDTO = { card in
                RecipeCardDTO(
                    id: card.id, title: card.title, titleOriginal: card.titleOriginal,
                    description: card.description, cuisine: card.cuisine, region: card.region,
                    author: card.author, coverImageUrl: card.coverImageUrl,
                    endorsementCount: card.endorsementCount,
                    saveCount: max(0, card.saveCount - delta), isSaved: wasSaved,
                )
            }
            patchRecipe(recipe.id, revert)
        }
    }

    /// Optimistic follow flip across cooks + search results.
    func toggleFollow(_ cook: ExploreCookDTO) async {
        let wasFollowing = cook.isFollowing
        let delta = wasFollowing ? -1 : 1
        let transform: (ExploreCookDTO) -> ExploreCookDTO = { c in
            ExploreCookDTO(
                id: c.id, username: c.username, displayName: c.displayName, avatarUrl: c.avatarUrl,
                bio: c.bio, region: c.region, specialties: c.specialties, recipeCount: c.recipeCount,
                followerCount: max(0, c.followerCount + delta), isFollowing: !wasFollowing,
            )
        }
        pendingCookID = cook.id
        patchCook(cook.id, transform)
        do {
            try await (wasFollowing ? SocialService.unfollow : SocialService.follow)(cook.id)
        } catch {
            let revert: (ExploreCookDTO) -> ExploreCookDTO = { c in
                ExploreCookDTO(
                    id: c.id, username: c.username, displayName: c.displayName, avatarUrl: c.avatarUrl,
                    bio: c.bio, region: c.region, specialties: c.specialties, recipeCount: c.recipeCount,
                    followerCount: max(0, c.followerCount - delta), isFollowing: wasFollowing,
                )
            }
            patchCook(cook.id, revert)
        }
        pendingCookID = nil
    }

    private func patchRecipe(_ id: String, _ transform: (RecipeCardDTO) -> RecipeCardDTO) {
        recipes = recipes.map { $0.id == id ? transform($0) : $0 }
        if let results = searchResults {
            searchResults = ExploreSearchResults(
                recipes: results.recipes.map { $0.id == id ? transform($0) : $0 },
                cooks: results.cooks,
                collections: results.collections,
            )
        }
    }

    private func patchCook(_ id: String, _ transform: (ExploreCookDTO) -> ExploreCookDTO) {
        cooks = cooks.map { $0.id == id ? transform($0) : $0 }
        if let results = searchResults {
            searchResults = ExploreSearchResults(
                recipes: results.recipes,
                cooks: results.cooks.map { $0.id == id ? transform($0) : $0 },
                collections: results.collections,
            )
        }
    }

    private var loadedQuery = ExploreRecipeQuery()
}

extension ExploreRecipeQuery: Equatable {
    static func == (lhs: ExploreRecipeQuery, rhs: ExploreRecipeQuery) -> Bool {
        lhs.q == rhs.q && lhs.cuisine == rhs.cuisine && lhs.region == rhs.region
            && lhs.difficulty == rhs.difficulty && lhs.maxMinutes == rhs.maxMinutes && lhs.diet == rhs.diet
    }
}
