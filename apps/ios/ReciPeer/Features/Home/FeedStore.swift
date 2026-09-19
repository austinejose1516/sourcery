import Foundation
import SwiftUI

enum LoadStatus: Equatable {
    case idle
    case loading
    case loaded
    case failed(String)

    var isLoading: Bool { self == .loading }
}

/// Holds feed data + performs optimistic save/like/follow flips (the React Query
/// caches in features/home/hooks.ts, collapsed into one observable store).
@Observable
@MainActor
final class FeedStore {
    var itemsByTab: [FeedTab: [FeedItem]] = [:]
    var statusByTab: [FeedTab: LoadStatus] = [:]
    var suggestions: [SuggestedCookDTO] = []
    var suggestionsStatus: LoadStatus = .idle
    var mostLoved: [RecipeCardDTO] = []
    var mostLovedStatus: LoadStatus = .idle
    var pendingCookID: String?

    func items(for tab: FeedTab) -> [FeedItem] { itemsByTab[tab] ?? [] }
    func status(for tab: FeedTab) -> LoadStatus { statusByTab[tab] ?? .idle }

    func load(_ tab: FeedTab) async {
        if case .loaded = status(for: tab) { return }
        statusByTab[tab] = (items(for: tab).isEmpty ? .loading : statusByTab[tab])
        do {
            itemsByTab[tab] = try await FeedService.fetchFeed(tab)
            statusByTab[tab] = .loaded
        } catch {
            if items(for: tab).isEmpty {
                statusByTab[tab] = .failed((error as? ApiError)?.message ?? "Something went wrong.")
            } else {
                statusByTab[tab] = .loaded
            }
        }
    }

    func refresh(_ tab: FeedTab) async {
        statusByTab[tab] = .loading
        do {
            itemsByTab[tab] = try await FeedService.fetchFeed(tab)
            statusByTab[tab] = .loaded
        } catch {
            statusByTab[tab] = .loaded
        }
    }

    func loadSuggestions() async {
        if case .loaded = suggestionsStatus { return }
        suggestionsStatus = .loading
        do {
            suggestions = try await FeedService.fetchSuggestions()
            suggestionsStatus = .loaded
        } catch {
            suggestionsStatus = suggestions.isEmpty
                ? .failed((error as? ApiError)?.message ?? "Something went wrong.") : .loaded
        }
    }

    func loadMostLoved() async {
        if case .loaded = mostLovedStatus { return }
        mostLovedStatus = .loading
        do {
            mostLoved = try await FeedService.fetchMostLoved()
            mostLovedStatus = .loaded
        } catch {
            mostLovedStatus = mostLoved.isEmpty
                ? .failed((error as? ApiError)?.message ?? "Something went wrong.") : .loaded
        }
    }

    /// Optimistic save flip + count delta across every cached feed + most-loved.
    func toggleSave(_ recipe: RecipeCardDTO) async {
        let wasSaved = recipe.isSaved
        let delta = wasSaved ? -1 : 1
        patchRecipeCard(id: recipe.id) { card in
            var updated = card
            updated = RecipeCardDTO(
                id: card.id, title: card.title, titleOriginal: card.titleOriginal,
                description: card.description, cuisine: card.cuisine, region: card.region,
                author: card.author, coverImageUrl: card.coverImageUrl,
                endorsementCount: card.endorsementCount,
                saveCount: max(0, card.saveCount + delta),
                isSaved: !wasSaved,
            )
            return updated
        }
        do {
            try await (wasSaved ? SocialService.unsave : SocialService.save)(recipe.id)
        } catch {
            patchRecipeCard(id: recipe.id) { card in
                RecipeCardDTO(
                    id: card.id, title: card.title, titleOriginal: card.titleOriginal,
                    description: card.description, cuisine: card.cuisine, region: card.region,
                    author: card.author, coverImageUrl: card.coverImageUrl,
                    endorsementCount: card.endorsementCount,
                    saveCount: max(0, card.saveCount - delta),
                    isSaved: wasSaved,
                )
            }
        }
    }

    /// Optimistic like flip + count delta across every cached feed.
    func toggleLike(_ post: TriedThisCardDTO) async {
        let wasLiked = post.isLiked
        let delta = wasLiked ? -1 : 1
        patchPost(id: post.id) { p in
            TriedThisCardDTO(
                id: p.id, user: p.user, note: p.note, photoUrl: p.photoUrl, createdAt: p.createdAt,
                recipe: p.recipe,
                likeCount: max(0, p.likeCount + delta), commentCount: p.commentCount, isLiked: !wasLiked,
            )
        }
        do {
            try await (wasLiked ? SocialService.unlike : SocialService.like)(post.id)
        } catch {
            patchPost(id: post.id) { p in
                TriedThisCardDTO(
                    id: p.id, user: p.user, note: p.note, photoUrl: p.photoUrl, createdAt: p.createdAt,
                    recipe: p.recipe,
                    likeCount: max(0, p.likeCount - delta), commentCount: p.commentCount, isLiked: wasLiked,
                )
            }
        }
    }

    /// Optimistic follow flip on the suggestions list.
    func toggleFollow(_ cook: SuggestedCookDTO) async {
        let wasFollowing = cook.isFollowing
        pendingCookID = cook.id
        patchCook(id: cook.id) { c in
            SuggestedCookDTO(
                id: c.id, displayName: c.displayName, avatarUrl: c.avatarUrl, region: c.region,
                recipeCount: c.recipeCount, isFollowing: !wasFollowing,
            )
        }
        do {
            try await (wasFollowing ? SocialService.unfollow : SocialService.follow)(cook.id)
        } catch {
            patchCook(id: cook.id) { c in
                SuggestedCookDTO(
                    id: c.id, displayName: c.displayName, avatarUrl: c.avatarUrl, region: c.region,
                    recipeCount: c.recipeCount, isFollowing: wasFollowing,
                )
            }
        }
        pendingCookID = nil
    }

    func addComment(postID: String, body: String) async throws {
        try await SocialService.addComment(postID, body: body)
        patchPost(id: postID) { p in
            TriedThisCardDTO(
                id: p.id, user: p.user, note: p.note, photoUrl: p.photoUrl, createdAt: p.createdAt,
                recipe: p.recipe, likeCount: p.likeCount, commentCount: p.commentCount + 1,
                isLiked: p.isLiked,
            )
        }
    }

    func createPost(recipeID: String, note: String?) async throws {
        try await SocialService.createPost(recipeId: recipeID, note: note)
        await refresh(.following)
    }

    // MARK: - Patch helpers

    private func patchRecipeCard(id: String, _ transform: (RecipeCardDTO) -> RecipeCardDTO) {
        for tab in FeedTab.allCases {
            itemsByTab[tab] = itemsByTab[tab]?.map { item in
                if case .recipe(let card) = item, card.id == id {
                    return .recipe(transform(card))
                }
                return item
            }
        }
        mostLoved = mostLoved.map { card in card.id == id ? transform(card) : card }
    }

    private func patchPost(id: String, _ transform: (TriedThisCardDTO) -> TriedThisCardDTO) {
        for tab in FeedTab.allCases {
            itemsByTab[tab] = itemsByTab[tab]?.map { item in
                if case .tried(let post) = item, post.id == id {
                    return .tried(transform(post))
                }
                return item
            }
        }
    }

    private func patchCook(id: String, _ transform: (SuggestedCookDTO) -> SuggestedCookDTO) {
        suggestions = suggestions.map { cook in cook.id == id ? transform(cook) : cook }
    }
}

/// Bridge that lets card views trigger store actions (cards receive this as an
/// ObservableObject so they stay passive and testable).
@MainActor
final class FeedActions: ObservableObject {
    let store: FeedStore

    init(store: FeedStore) {
        self.store = store
    }

    func toggleSave(_ recipe: RecipeCardDTO) {
        Task { await store.toggleSave(recipe) }
    }

    func toggleLike(_ post: TriedThisCardDTO) {
        Task { await store.toggleLike(post) }
    }

    func toggleFollow(_ cook: SuggestedCookDTO) {
        Task { await store.toggleFollow(cook) }
    }

    func share(_ post: TriedThisCardDTO) {
        let text = "\(post.user.displayName) tried \(post.recipe.title) on Sourcery"
        Task { @MainActor in
            UIPasteboard.general.string = text
        }
    }
}
