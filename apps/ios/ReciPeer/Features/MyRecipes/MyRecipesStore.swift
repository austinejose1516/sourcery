import Foundation

/// My Recipes data + polling (features/recipes/hooks.ts).
@Observable
@MainActor
final class MyRecipesStore {
    var data: MyRecipesResponse?
    var status: LoadStatus = .idle
    var tried: [TriedRecipeCardDTO] = []
    var triedStatus: LoadStatus = .idle

    private var pollTask: Task<Void, Never>?
    private var prevActiveJobIDs: Set<String> = []

    func load(force: Bool = false) async {
        if !force, case .loaded = status { return }
        status = .loading
        do {
            data = try await RecipesService.fetchMyRecipes()
            status = .loaded
        } catch {
            status = .failed((error as? ApiError)?.message ?? "Could not load your recipes.")
        }
        detectCompletions()
        schedulePolling()
    }

    /// Fire a local notification when a job leaves the active set (RN's
    /// my-recipes-screen useEffect).
    private func detectCompletions() {
        guard let data else { return }
        let nowActive = Set(
            data.processing
                .filter { $0.status.isActive }
                .map(\.jobId),
        )
        let completed = prevActiveJobIDs.subtracting(nowActive)
        if !prevActiveJobIDs.isEmpty, !completed.isEmpty {
            Task { await RecipeNotifications.notifyRecipeReady() }
        }
        prevActiveJobIDs = nowActive
    }

    /// Refetch every 4s while any job is still processing (useMyRecipes).
    private func schedulePolling() {
        pollTask?.cancel()
        guard let data, data.processing.contains(where: { $0.status.isActive }) else {
            return
        }
        pollTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(4))
                guard !Task.isCancelled else { return }
                guard let self else { return }
                if let fresh = try? await RecipesService.fetchMyRecipes() {
                    self.data = fresh
                }
            }
        }
    }

    func loadTried(force: Bool = false) async {
        if !force, case .loaded = triedStatus { return }
        triedStatus = .loading
        do {
            tried = try await RecipesService.fetchTriedRecipes()
            triedStatus = .loaded
        } catch {
            triedStatus = .failed((error as? ApiError)?.message ?? "Could not load your tried recipes.")
        }
    }

    func refresh() async {
        await load(force: true)
    }

    /// Optimistically drop a failed job from the Processing section.
    func dismissJob(_ jobID: String) async {
        let prev = data
        if let data {
            self.data = MyRecipesResponse(
                processing: data.processing.filter { $0.jobId != jobID },
                needsReview: data.needsReview,
                published: data.published,
                private: data.private,
            )
        }
        do {
            try await RecipesService.dismissJob(jobID)
        } catch {
            data = prev
        }
        await load(force: true)
    }
}
