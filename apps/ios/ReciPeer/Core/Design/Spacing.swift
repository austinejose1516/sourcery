import SwiftUI

/// 4pt spacing scale + radii + sizing, mirroring packages/core/src/theme/spacing.ts.
enum Spacing {
    static let xxs: CGFloat = 2
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 20
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 48
}

enum Radius {
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let input: CGFloat = 14
    static let card: CGFloat = 20
    static let pill: CGFloat = 999
}

enum Sizing {
    static let buttonHeight: CGFloat = 52
    static let inputHeight: CGFloat = 54
    static let iconButton: CGFloat = 44
    static let maxContentWidth: CGFloat = 480
}
