import SwiftUI

/// Live status of a single extraction job (processing/[jobId].tsx useJob).
@Observable
@MainActor
final class JobStore {
    var job: ProcessingJobDTO?
    var hadError = false

    func load(_ jobId: String) async {
        do {
            job = try await RecipesService.fetchJob(jobId)
        } catch {
            hadError = true
        }
        if job?.status.isActive == true {
            try? await Task.sleep(for: .seconds(3))
            guard !Task.isCancelled else { return }
            await load(jobId)
        }
    }
}

private let processingStages = [
    "Uploaded",
    "Watching & listening",
    "Writing ingredients & steps",
    "Almost ready",
]

private func stageIndex(_ status: IngestionJobStatus) -> Int {
    switch status {
    case .uploading: 0
    case .transcribing, .structuring: 1
    case .translating: 2
    case .review, .complete: 3
    case .failed: 0
    }
}

/// The processing status screen: 4 stages, polls until the recipe is ready.
/// Mirrors processing/[jobId].tsx.
struct ProcessingView: View {
    let jobId: String
    @State private var store = JobStore()

    var body: some View {
        AppScreen {
            VStack(alignment: .leading, spacing: Spacing.md) {
                if let job = store.job, job.status == .failed {
                    failedState(job)
                } else {
                    progressState
                }
            }
            .padding(.top, Spacing.sm)
        }
        .toolbar(.hidden, for: .navigationBar)
        .task { await store.load(jobId) }
    }

    private var progressState: some View {
        let current = store.job.map { stageIndex($0.status) } ?? 0
        let complete = store.job?.status == .complete

        return VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Making your recipe").textStyle(.display)
            Text("This usually takes a couple of minutes. We'll keep working in the background and notify you the moment it's ready to review.")
                .textStyle(.body)
                .foregroundStyle(AppColors.textSecondary)

            VStack(alignment: .leading, spacing: Spacing.lg) {
                ForEach(Array(processingStages.enumerated()), id: \.offset) { index, label in
                    HStack(spacing: Spacing.md) {
                        ZStack {
                            if index < current || complete {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 20))
                                    .foregroundStyle(AppColors.herb)
                            } else if index == current {
                                ProgressView().tint(AppColors.primary)
                            } else {
                                Image(systemName: "circle")
                                    .font(.system(size: 20))
                                    .foregroundStyle(AppColors.border)
                            }
                        }
                        .frame(width: 24)

                        Text(label)
                            .textStyle(.body)
                            .foregroundStyle(
                                (index < current || complete || index == current)
                                    ? AppColors.textPrimary : AppColors.textSecondary,
                            )
                    }
                }
            }
            .padding(.vertical, Spacing.xl)

            if store.hadError {
                Text("Lost connection — still working. This screen will catch up.")
                    .textStyle(.caption)
                    .foregroundStyle(AppColors.textSecondary)
            }

            if complete, let recipeId = store.job?.recipeId {
                NavigationLink(value: AppRoute.review(id: recipeId)) {
                    Text("Review your recipe")
                        .textStyle(.button)
                        .foregroundStyle(AppColors.onPrimary)
                        .frame(maxWidth: .infinity)
                        .frame(height: Sizing.buttonHeight)
                        .background(AppColors.primary)
                        .clipShape(Capsule())
                }
                .buttonStyle(.pressScale)
            } else {
                AppButton(label: "Leave — we'll notify you", variant: .secondary) {
                    // Pops back to My Recipes (root of the tab's stack).
                    popToRoot()
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    private func failedState(_ job: ProcessingJobDTO) -> some View {
        VStack(spacing: Spacing.md) {
            Spacer()
            Image(systemName: "exclamationmark.circle")
                .font(.system(size: 26))
                .foregroundStyle(AppColors.danger)
                .frame(width: 72, height: 72)
                .background(AppColors.surfaceMuted)
                .clipShape(Circle())
            Text("We couldn't finish this one")
                .textStyle(.heading)
                .multilineTextAlignment(.center)
            Text(job.errorMessage ?? "Something went wrong while writing up your recipe.")
                .textStyle(.body)
                .foregroundStyle(AppColors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.lg)
            AppButton(label: "Back to My Recipes") {
                popToRoot()
            }
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    /// Pops this pushed screen back to the My Recipes root.
    private func popToRoot() {
        dismissSelf()
    }

    @Environment(\.dismiss) private var dismissSelf
}
