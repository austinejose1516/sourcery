import SwiftUI

/// Dark, immersive palette for cook mode — high-contrast for glancing at while
/// your hands are busy. Mirrors recipe-view/cook-theme.ts.
enum CookColors {
    static let bg = Color(hex: 0x1A1208)
    static let fg = Color(hex: 0xFBF6EC)
    static let fgMuted = Color(hex: 0xFBF6EC).opacity(0.60)
    static let fgFaint = Color(hex: 0xFBF6EC).opacity(0.40)
    static let panel = Color.white.opacity(0.055)
    static let panelStrong = Color.white.opacity(0.09)
    static let border = Color.white.opacity(0.10)
    static let chip = Color.white.opacity(0.08)
    static let overlay = Color(hex: 0x0C0803).opacity(0.86)
    static let scrim = Color.black.opacity(0.5)
    static let sheet = Color(hex: 0x15100A)

    // Brand accents from the light palette.
    static let accent = Color(hex: 0xE8A53D) // saffron
    static let primary = Color(hex: 0xC2410C) // paprika
    static let success = Color(hex: 0x7A8B3F) // herb
    static let danger = Color(hex: 0xD9533F) // chili
    static let onAccent = Color(hex: 0x1A1208)
    static let frame = Color(hex: 0x120D07)
}

/// Visual treatment for a step caution, by severity.
struct CautionVisual {
    let accent: Color
    let label: String
    let icon: String
}

func cautionVisual(_ level: CautionLevelDTO) -> CautionVisual {
    switch level {
    case .critical:
        CautionVisual(accent: CookColors.danger, label: "Important", icon: "exclamationmark.circle")
    case .warn:
        CautionVisual(accent: CookColors.primary, label: "Take care", icon: "flame")
    case .caution:
        CautionVisual(accent: Color(hex: 0xB8862F), label: "Heads up", icon: "exclamationmark.circle")
    }
}

/// seconds → "m:ss".
func fmtClock(_ totalSeconds: Double) -> String {
    let s = max(0, Int(totalSeconds.rounded()))
    return "\(s / 60):\(String(format: "%02d", s % 60))"
}

/// milliseconds → "m:ss" (clip ranges + durations).
func fmtMs(_ ms: Int) -> String {
    fmtClock(Double(ms) / 1000)
}
