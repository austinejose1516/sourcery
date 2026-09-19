import SwiftUI

/// Raw brand palette — the only place hex values live.
/// Mirrors packages/core/src/theme/colors.ts.
enum Palette {
    static let cream = Color(hex: 0xFBF6EC)
    static let butter = Color(hex: 0xF4E4BC)
    static let espresso = Color(hex: 0x3D2817)
    static let bark = Color(hex: 0x6B4423)
    static let paprika = Color(hex: 0xC2410C)
    static let paprikaDark = Color(hex: 0xA83209)
    static let saffron = Color(hex: 0xE8A53D)
    static let herb = Color(hex: 0x7A8B3F)
    static let chili = Color(hex: 0x9B2C2C)
    static let white = Color.white
    static let hairline = Color(hex: 0xE8DCC4)

    static let apricot = Color(hex: 0xF4D3A8)
    static let apricotInk = Color(hex: 0x9A5B16)
    static let bleu = Color(hex: 0xC7D6DE)
    static let bleuInk = Color(hex: 0x2F5A6E)
    static let burgundy = Color(hex: 0xD9B8B8)
    static let burgundyInk = Color(hex: 0x7A2E2E)
    static let editorial = Color(hex: 0xDCE0C4)
    static let editorialInk = Color(hex: 0x566034)

    static let ink04 = Palette.espresso.opacity(0.04)
    static let ink06 = Palette.espresso.opacity(0.06)
    static let ink08 = Palette.espresso.opacity(0.08)
    static let ink12 = Palette.espresso.opacity(0.12)
    static let ink18 = Palette.espresso.opacity(0.18)
    static let ink40 = Palette.espresso.opacity(0.40)
}

/// Semantic colour tokens. Reference these from views, never `Palette` directly.
enum AppColors {
    // Surfaces
    static let background = Palette.cream
    static let surface = Palette.white
    static let surfaceMuted = Palette.butter
    static let surfacePressed = Palette.ink06

    // Text
    static let textPrimary = Palette.espresso
    static let textSecondary = Palette.bark
    static let textInverse = Palette.cream
    static let textPlaceholder = Palette.ink40

    // Brand / interactive
    static let primary = Palette.paprika
    static let primaryPressed = Palette.paprikaDark
    static let onPrimary = Palette.cream
    static let accent = Palette.saffron
    static let herb = Palette.herb
    static let danger = Palette.chili

    // Lines & borders
    static let border = Palette.hairline
    static let borderStrong = Palette.ink18
    static let divider = Palette.hairline

    // Interaction
    static let overlayPressed = Palette.ink08
    static let focusRing = Palette.saffron

    // Editorial chip accents
    static let apricot = Palette.apricot
    static let apricotInk = Palette.apricotInk
    static let bleu = Palette.bleu
    static let bleuInk = Palette.bleuInk
    static let burgundy = Palette.burgundy
    static let burgundyInk = Palette.burgundyInk
    static let editorial = Palette.editorial
    static let editorialInk = Palette.editorialInk
}

extension Color {
    init(hex: UInt32) {
        let r = Double((hex >> 16) & 0xFF) / 255
        let g = Double((hex >> 8) & 0xFF) / 255
        let b = Double(hex & 0xFF) / 255
        self.init(.sRGB, red: r, green: g, blue: b, opacity: 1)
    }
}
