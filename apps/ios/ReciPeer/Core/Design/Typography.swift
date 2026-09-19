import SwiftUI

/// Font families matching the @expo-google-fonts loaded by the RN app.
enum AppFont {
    static let display = "Fraunces_500Medium"
    static let displaySemibold = "Fraunces_600SemiBold"
    static let body = "Inter_400Regular"
    static let bodyMedium = "Inter_500Medium"
    static let bodySemibold = "Inter_600SemiBold"
}

/// Role-based text variants mirroring packages/core/src/theme/typography.ts.
enum TextVariant {
    case display, title, heading, body, bodyStrong, label, button, caption, micro

    var font: Font {
        switch self {
        case .display: return .custom(AppFont.display, size: 36)
        case .title: return .custom(AppFont.display, size: 28)
        case .heading: return .custom(AppFont.displaySemibold, size: 22)
        case .body: return .custom(AppFont.body, size: 16)
        case .bodyStrong: return .custom(AppFont.bodyMedium, size: 16)
        case .label: return .custom(AppFont.bodyMedium, size: 14)
        case .button: return .custom(AppFont.bodySemibold, size: 16)
        case .caption: return .custom(AppFont.body, size: 14)
        case .micro: return .custom(AppFont.body, size: 12)
        }
    }

    var lineHeight: CGFloat {
        switch self {
        case .display: return 42
        case .title: return 34
        case .heading: return 28
        case .body, .bodyStrong: return 24
        case .label, .button, .caption: return 20
        case .micro: return 16
        }
    }

    var tracking: CGFloat {
        switch self {
        case .display: return -0.5
        case .title: return -0.3
        case .micro: return 0.4
        default: return 0
        }
    }
}

extension View {
    func textStyle(_ variant: TextVariant) -> some View {
        self.font(variant.font)
            .tracking(variant.tracking)
            .lineSpacing(variant.lineHeight - fontSize(for: variant))
    }

    private func fontSize(for variant: TextVariant) -> CGFloat {
        switch variant {
        case .display: return 36
        case .title: return 28
        case .heading: return 22
        case .body, .bodyStrong, .button: return 16
        case .label, .caption: return 14
        case .micro: return 12
        }
    }
}
