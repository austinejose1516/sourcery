import Foundation

/// Recipe viewer data + optimistic save/follow + mark-tried
/// (features/recipe-view/hooks.ts + the follow mutation in recipe/[recipeId]/index.tsx).
@Observable
@MainActor
final class RecipeViewStore {
    var recipe: RecipeViewDTO?
    var status: LoadStatus = .idle

    func load(_ recipeId: String) async {
        if recipe != nil { return }
        status = .loading
        do {
            recipe = try await RecipesService.fetchRecipeView(recipeId)
            status = .loaded
        } catch {
            status = .failed((error as? ApiError)?.message ?? "We couldn't load this recipe.")
        }
    }

    func reload(_ recipeId: String) async {
        if let fresh = try? await RecipesService.fetchRecipeView(recipeId) {
            recipe = fresh
            status = .loaded
        }
    }

    /// Optimistic bookmark flip on the viewer's own counts.
    func toggleSave() async {
        guard let recipe else { return }
        let wasSaved = recipe.isSaved
        let delta = wasSaved ? -1 : 1
        apply(saved: !wasSaved, saveCount: max(0, recipe.saveCount + delta))
        do {
            try await (wasSaved ? SocialService.unsave : SocialService.save)(recipe.id)
        } catch {
            apply(saved: wasSaved, saveCount: max(0, recipe.saveCount - delta))
        }
    }

    /// Optimistic follow flip on the contributor strip.
    func toggleFollow() async {
        guard let recipe else { return }
        let wasFollowing = recipe.contributor.isFollowing
        let delta = wasFollowing ? -1 : 1
        applyContributor(
            isFollowing: !wasFollowing,
            followerCount: max(0, recipe.contributor.followerCount + delta),
        )
        do {
            try await (wasFollowing ? SocialService.unfollow : SocialService.follow)(recipe.contributor.id)
        } catch {
            applyContributor(
                isFollowing: wasFollowing,
                followerCount: max(0, recipe.contributor.followerCount - delta),
            )
        }
    }

    /// Record that the viewer cooked this recipe.
    func markTried() async throws {
        guard let current = recipe else { return }
        try await RecipesService.markTried(current.id, MarkTriedInput(photoUrl: nil, note: nil))
        recipe = RecipeViewDTO(
            id: current.id, title: current.title, titleOriginal: current.titleOriginal,
            description: current.description, region: current.region, cuisine: current.cuisine,
            difficulty: current.difficulty, dietaryTags: current.dietaryTags, nutrition: current.nutrition,
            containsAllergens: current.containsAllergens, totalTimeMinutes: current.totalTimeMinutes,
            handsOnMinutes: current.handsOnMinutes, baseServings: current.baseServings,
            endorsementCount: current.endorsementCount, cookCount: current.cookCount,
            saveCount: current.saveCount, isSaved: current.isSaved, triedByMe: true,
            contributor: current.contributor, coverImageUrl: current.coverImageUrl,
            videoKind: current.videoKind, videoDurationMs: current.videoDurationMs,
            ingredients: current.ingredients, steps: current.steps,
        )
    }

    private func apply(saved: Bool, saveCount: Int) {
        guard let r = recipe else { return }
        recipe = RecipeViewDTO(
            id: r.id, title: r.title, titleOriginal: r.titleOriginal, description: r.description,
            region: r.region, cuisine: r.cuisine, difficulty: r.difficulty,
            dietaryTags: r.dietaryTags, nutrition: r.nutrition, containsAllergens: r.containsAllergens,
            totalTimeMinutes: r.totalTimeMinutes, handsOnMinutes: r.handsOnMinutes,
            baseServings: r.baseServings, endorsementCount: r.endorsementCount,
            cookCount: r.cookCount, saveCount: saveCount, isSaved: saved, triedByMe: r.triedByMe,
            contributor: r.contributor, coverImageUrl: r.coverImageUrl, videoKind: r.videoKind,
            videoDurationMs: r.videoDurationMs, ingredients: r.ingredients, steps: r.steps,
        )
    }

    private func applyContributor(isFollowing: Bool, followerCount: Int) {
        guard let r = recipe else { return }
        let c = r.contributor
        recipe = RecipeViewDTO(
            id: r.id, title: r.title, titleOriginal: r.titleOriginal, description: r.description,
            region: r.region, cuisine: r.cuisine, difficulty: r.difficulty,
            dietaryTags: r.dietaryTags, nutrition: r.nutrition, containsAllergens: r.containsAllergens,
            totalTimeMinutes: r.totalTimeMinutes, handsOnMinutes: r.handsOnMinutes,
            baseServings: r.baseServings, endorsementCount: r.endorsementCount,
            cookCount: r.cookCount, saveCount: r.saveCount, isSaved: r.isSaved, triedByMe: r.triedByMe,
            contributor: ViewContributorDTO(
                id: c.id, displayName: c.displayName, username: c.username, avatarUrl: c.avatarUrl,
                region: c.region, country: c.country, recipeCount: c.recipeCount,
                followerCount: followerCount, isFollowing: isFollowing,
            ),
            coverImageUrl: r.coverImageUrl, videoKind: r.videoKind,
            videoDurationMs: r.videoDurationMs, ingredients: r.ingredients, steps: r.steps,
        )
    }
}
