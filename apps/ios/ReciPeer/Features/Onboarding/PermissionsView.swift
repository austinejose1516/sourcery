import SwiftUI

struct PermissionItem: Identifiable {
    let icon: String
    let tint: Color
    let title: String
    let description: String
    var id: String { title }
}

/// Mirrors permission-row.tsx.
struct PermissionRow: View {
    let item: PermissionItem

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.lg) {
            Image(systemName: item.icon)
                .font(.system(size: 22))
                .foregroundStyle(item.tint)
                .frame(width: 48, height: 48)
                .background(AppColors.surfaceMuted)
                .clipShape(RoundedRectangle(cornerRadius: Radius.md))

            VStack(alignment: .leading, spacing: Spacing.xs) {
                AppText(item.title, variant: .bodyStrong)
                AppText(item.description, variant: .caption, color: AppColors.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

/// Mirrors permissions-screen.tsx.
struct PermissionsView: View {
    /// Called when onboarding fully completes — enters the app.
    var onDone: () -> Void

    private let permissions: [PermissionItem] = [
        PermissionItem(
            icon: "camera.fill",
            tint: AppColors.primary,
            title: "Camera",
            description: "So you can record your recipe — and so we can help you check doneness while you cook.",
        ),
        PermissionItem(
            icon: "mic.fill",
            tint: AppColors.herb,
            title: "Microphone",
            description: "To capture you talking through the dish, in your own language.",
        ),
        PermissionItem(
            icon: "bell.fill",
            tint: AppColors.accent,
            title: "Notifications",
            description: "When someone cooks one of your recipes, you'll know.",
        ),
    ]

    var body: some View {
        AppScreen(scroll: true) {
            VStack(alignment: .leading, spacing: Spacing.xxl) {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    AppText("A few things we'd like to ask.", variant: .title)
                    AppText(
                        "ReciPeer only uses these while you're recording or cooking. You can turn them off any time.",
                        variant: .body,
                        color: AppColors.textSecondary,
                    )
                }

                VStack(spacing: Spacing.xl) {
                    ForEach(permissions) { item in
                        PermissionRow(item: item)
                    }
                }

                VStack(spacing: Spacing.sm) {
                    AppButton(label: "Allow & continue", action: onDone)
                    AppButton(label: "Not now", variant: .ghost, action: onDone)
                }
            }
            .padding(.vertical, Spacing.xxl)
        }
    }
}
