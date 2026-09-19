import SwiftUI

// MARK: - Library grid cards (features/recipes/components.tsx)

/// Stage copy for a processing job.
func jobStage(_ status: IngestionJobStatus) -> (label: String, eta: String?, working: Bool) {
    switch status {
    case .uploading: return ("Uploading", "~5 min", true)
    case .transcribing, .structuring: return ("Watching & listening", "~3 min", true)
    case .translating: return ("Writing it up", "~2 min", true)
    case .review: return ("Almost ready", nil, true)
    case .failed: return ("Something went wrong", nil, false)
    default: return ("Ready", nil, false)
    }
}

/// Square cover image with icon fallback, sized to fill a grid cell.
private struct Cover: View {
    let uri: String?
    let icon: String

    var body: some View {
        Group {
            if let url = uri.flatMap(URL.init) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image): image.resizable().scaledToFill()
                    default: fallback(icon)
                    }
                }
            } else {
                fallback(icon)
            }
        }
        .aspectRatio(1, contentMode: .fill)
        .frame(maxWidth: .infinity)
        .clipped()
    }
}

private func fallback(_ icon: String) -> some View {
    ZStack {
        AppColors.surfaceMuted
        Image(systemName: icon)
            .font(.system(size: 24))
            .foregroundStyle(AppColors.textSecondary)
    }
}

/// Card chrome shared by all library grid cards.
private struct CardShell<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) { content }
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: Radius.card))
            .overlay {
                RoundedRectangle(cornerRadius: Radius.card).stroke(AppColors.border, lineWidth: 1)
            }
    }
}

struct SectionHeading: View {
    let title: String
    let count: Int

    var body: some View {
        HStack {
            Text(title).textStyle(.label).foregroundStyle(AppColors.textSecondary)
            Spacer()
            Text("\(count)").textStyle(.label).foregroundStyle(AppColors.textSecondary)
        }
        .padding(.top, Spacing.xl)
        .padding(.bottom, Spacing.sm)
    }
}

struct ProcessingCard: View {
    let job: ProcessingJobDTO
    let onPress: () -> Void

    private var stage: (label: String, eta: String?, working: Bool) {
        jobStage(job.status)
    }

    var body: some View {
        Button(action: onPress) {
            CardShell {
                ZStack {
                    fallback(job.sourceType == .link ? "link" : "video.fill")
                    if stage.working {
                        ProgressView()
                            .tint(AppColors.primary)
                            .padding(Spacing.md)
                            .background(.thinMaterial, in: Circle())
                    }
                }
                .aspectRatio(1, contentMode: .fill)
                .frame(maxWidth: .infinity)
                .clipped()

                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(job.title ?? (job.sourceType == .link ? "Imported video" : "Untitled upload"))
                        .textStyle(.bodyStrong).lineLimit(2)
                    Text(stage.eta.map { "\(stage.label) · \($0)" } ?? stage.label)
                        .textStyle(.caption)
                        .foregroundStyle(AppColors.textSecondary)
                }
                .padding(Spacing.md)
            }
        }
        .buttonStyle(.pressScale)
    }
}

struct NeedsReviewCard: View {
    let recipe: MyRecipeCardDTO
    let onPress: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Button(action: onPress) {
                CardShell {
                    Cover(uri: recipe.coverImageUrl, icon: recipe.isLinkImport ? "link" : "fork.knife")
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text(recipe.title.isEmpty ? "Untitled recipe" : recipe.title)
                            .textStyle(.bodyStrong).lineLimit(2)
                        HStack(spacing: Spacing.xs) {
                            if recipe.isLinkImport {
                                Image(systemName: "link").font(.system(size: 11))
                            }
                            Text(recipe.isLinkImport ? "Imported · ready" : "Written up & ready")
                                .textStyle(.caption)
                                .foregroundStyle(AppColors.textSecondary)
                        }
                    }
                    .padding(Spacing.md)
                }
            }
            .buttonStyle(.pressScale)

            AppButton(label: "Review & publish", action: onPress)
        }
    }
}

struct PublishedCard: View {
    let recipe: MyRecipeCardDTO
    let onPress: () -> Void

    var body: some View {
        Button(action: onPress) {
            CardShell {
                Cover(uri: recipe.coverImageUrl, icon: "fork.knife")
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(recipe.title.isEmpty ? "Untitled recipe" : recipe.title)
                        .textStyle(.bodyStrong).lineLimit(2)
                    Text(FeedUtils.relativeDate(recipe.updatedAt))
                        .textStyle(.caption)
                        .foregroundStyle(AppColors.textSecondary)
                }
                .padding(Spacing.md)
            }
        }
        .buttonStyle(.pressScale)
    }
}

struct PrivateDraftCard: View {
    let recipe: MyRecipeCardDTO
    let onPress: () -> Void

    var body: some View {
        Button(action: onPress) {
            CardShell {
                ZStack(alignment: .topLeading) {
                    Cover(uri: recipe.coverImageUrl, icon: recipe.isLinkImport ? "link" : "fork.knife")
                    HStack(spacing: Spacing.xxs) {
                        Image(systemName: "lock").font(.system(size: 10, weight: .semibold))
                        Text("Private").textStyle(.micro)
                    }
                    .foregroundStyle(AppColors.onPrimary)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xs)
                    .background(.black.opacity(0.45))
                    .clipShape(Capsule())
                    .padding(Spacing.sm)
                }
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(recipe.title.isEmpty ? "Untitled recipe" : recipe.title)
                        .textStyle(.bodyStrong).lineLimit(2)
                    Text("Only visible to you")
                        .textStyle(.caption)
                        .foregroundStyle(AppColors.textSecondary)
                }
                .padding(Spacing.md)
            }
        }
        .buttonStyle(.pressScale)
    }
}

struct FailedCard: View {
    let job: ProcessingJobDTO
    let onDismiss: () -> Void

    var body: some View {
        Button(action: onDismiss) {
            CardShell {
                ZStack {
                    AppColors.surfaceMuted
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 24))
                        .foregroundStyle(AppColors.danger)
                }
                .aspectRatio(1, contentMode: .fill)
                .frame(maxWidth: .infinity)
                .clipped()

                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(job.title ?? "Upload failed").textStyle(.bodyStrong).lineLimit(2)
                    Text(job.errorMessage ?? "Something went wrong")
                        .textStyle(.caption)
                        .foregroundStyle(AppColors.danger)
                        .lineLimit(2)
                    HStack {
                        Spacer()
                        Text("Dismiss").textStyle(.caption).foregroundStyle(AppColors.textSecondary)
                    }
                }
                .padding(Spacing.md)
            }
        }
        .buttonStyle(.pressScale)
    }
}

struct TriedCard: View {
    let tried: TriedRecipeCardDTO
    let onPress: () -> Void

    var body: some View {
        Button(action: onPress) {
            CardShell {
                Cover(uri: tried.recipe.coverImageUrl, icon: "fork.knife")
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(tried.recipe.title.isEmpty ? "Untitled recipe" : tried.recipe.title)
                        .textStyle(.bodyStrong).lineLimit(2)
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 11))
                            .foregroundStyle(AppColors.herb)
                        Text(tried.note?.trimmingCharacters(in: .whitespaces).isEmpty == false
                            ? tried.note! : "You cooked this")
                            .textStyle(.caption)
                            .foregroundStyle(AppColors.textSecondary)
                            .lineLimit(1)
                    }
                }
                .padding(Spacing.md)
            }
        }
        .buttonStyle(.pressScale)
    }
}
