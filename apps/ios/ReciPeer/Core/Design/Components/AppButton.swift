import SwiftUI

/// The app's button — mirrors components/ui/button.tsx.
enum AppButtonVariant {
    case primary, secondary, ghost
}

struct AppButton: View {
    let label: String
    var variant: AppButtonVariant = .primary
    var loading: Bool = false
    var disabled: Bool = false
    var systemImage: String? = nil
    var action: () -> Void

    private var isDisabled: Bool { disabled || loading }

    private var background: Color {
        switch variant {
        case .primary: AppColors.primary
        case .secondary: AppColors.surface
        case .ghost: .clear
        }
    }

    private var labelColor: Color {
        switch variant {
        case .primary: AppColors.onPrimary
        case .secondary: AppColors.textPrimary
        case .ghost: AppColors.primary
        }
    }

    var body: some View {
        Button(action: action) {
            ZStack {
                if loading {
                    ProgressView().tint(labelColor)
                } else {
                    HStack(spacing: Spacing.sm) {
                        if let systemImage {
                            Image(systemName: systemImage)
                        }
                        Text(label).textStyle(.button)
                    }
                    .foregroundStyle(labelColor)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: Sizing.buttonHeight)
            .background(background)
            .overlay {
                if variant == .secondary {
                    Capsule().stroke(AppColors.border, lineWidth: 1)
                }
            }
            .clipShape(Capsule())
            .opacity(isDisabled ? 0.5 : 1)
        }
        .buttonStyle(.pressScale)
        .disabled(isDisabled)
    }
}
