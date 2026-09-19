import SwiftUI

/// Circular back control for stacked screens. Mirrors components/ui/back-button.tsx.
struct BackButton: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Button {
            dismiss()
        } label: {
            Image(systemName: "chevron.left")
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(AppColors.textPrimary)
                .frame(width: Sizing.iconButton, height: Sizing.iconButton)
                .background(AppColors.surface)
                .clipShape(Circle())
                .overlay { Circle().stroke(AppColors.border, lineWidth: 1) }
        }
        .buttonStyle(.pressScale)
    }
}

/// Wordmark + tagline. Mirrors components/ui/logo.tsx.
struct Logo: View {
    var fontSize: CGFloat = 48

    private let honey = Color(hex: 0xD4A574)

    var body: some View {
        VStack(spacing: Spacing.xxs) {
            (Text("Reci").foregroundStyle(AppColors.textPrimary)
                + Text("Peer").foregroundStyle(AppColors.primary))
                .font(.custom(AppFont.display, size: fontSize))
                .tracking(-0.96)

            HStack(spacing: Spacing.sm) {
                rule
                Text("cook · share · connect")
                    .font(.custom(AppFont.bodyMedium, size: 9))
                    .tracking(2.2)
                    .foregroundStyle(AppColors.textSecondary)
                rule
            }
        }
    }

    private var rule: some View {
        Capsule()
            .fill(honey)
            .frame(width: Spacing.lg, height: 1)
    }
}

/// Plain hairline rule + labelled "OR" separator. Mirrors components/ui/divider.tsx.
struct Hairline: View {
    var body: some View {
        Rectangle()
            .fill(AppColors.divider)
            .frame(height: 0.5)
    }
}

struct OrDivider: View {
    var label = "OR"

    var body: some View {
        HStack(spacing: Spacing.md) {
            Hairline()
            AppText(label, variant: .micro, color: AppColors.textSecondary)
            Hairline()
        }
    }
}
