import SwiftUI

// MARK: - Loading / error / empty placeholders for feeds (home/components/feed-states.tsx)
struct FeedSkeleton: View {
    var body: some View {
        VStack(spacing: Spacing.lg) {
            ForEach(0..<3, id: \.self) { _ in
                VStack(spacing: 0) {
                    Rectangle().fill(AppColors.surfaceMuted)
                        .aspectRatio(4 / 3, contentMode: .fill)
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        RoundedRectangle(cornerRadius: Radius.sm).fill(AppColors.surfaceMuted)
                            .frame(width: 150, height: 12)
                        RoundedRectangle(cornerRadius: Radius.sm).fill(AppColors.surfaceMuted)
                            .frame(height: 12)
                        RoundedRectangle(cornerRadius: Radius.sm).fill(AppColors.surfaceMuted)
                            .frame(width: 100, height: 12)
                    }
                    .padding(Spacing.lg)
                }
                .background(AppColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: Radius.card))
                .overlay { RoundedRectangle(cornerRadius: Radius.card).stroke(AppColors.border, lineWidth: 1) }
            }
        }
        .padding(.horizontal, Spacing.xl)
    }
}

struct FeedError: View {
    let message: String?
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: Spacing.md) {
            Text("Couldn't load your feed").textStyle(.heading)
                .multilineTextAlignment(.center)
            Text(message ?? "Something went wrong.")
                .textStyle(.body)
                .foregroundStyle(AppColors.textSecondary)
                .multilineTextAlignment(.center)
            AppButton(label: "Try again", variant: .secondary, action: onRetry)
                .frame(maxWidth: 200)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, Spacing.xl)
        .padding(.vertical, Spacing.xxxl)
    }
}

struct FeedEmpty: View {
    let message: String

    var body: some View {
        Text(message)
            .textStyle(.body)
            .foregroundStyle(AppColors.textSecondary)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, Spacing.xl)
            .padding(.vertical, Spacing.xxl)
    }
}
