import SwiftUI

/// Primary text primitive — renders a design-token `TextVariant` so screens never
/// hand-assemble font/size/lineHeight. Mirrors components/ui/text.tsx.
struct AppText: View {
    let string: String
    let variant: TextVariant
    let color: Color

    init(_ string: String, variant: TextVariant = .body, color: Color = AppColors.textPrimary) {
        self.string = string
        self.variant = variant
        self.color = color
    }

    var body: some View {
        Text(string)
            .textStyle(variant)
            .foregroundStyle(color)
    }
}

/// Press feedback shared by every tappable surface — gently scales down on touch.
struct ScaleButtonStyle: ButtonStyle {
    var activeScale: CGFloat = 0.97

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? activeScale : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == ScaleButtonStyle {
    static var pressScale: ScaleButtonStyle { ScaleButtonStyle() }
}
