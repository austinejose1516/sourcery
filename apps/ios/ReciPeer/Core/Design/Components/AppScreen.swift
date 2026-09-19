import SwiftUI

/// App-wide page shell: themed background, centred max-width content column.
/// Mirrors components/ui/screen.tsx. Wrap in a ScrollView via `scroll`.
struct AppScreen<Content: View>: View {
    var scroll = false
    @ViewBuilder var content: Content

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()
            Group {
                if scroll {
                    ScrollView {
                        contentColumn
                    }
                    .scrollDismissesKeyboard(.interactively)
                } else {
                    contentColumn
                }
            }
        }
    }

    private var contentColumn: some View {
        VStack {
            content
        }
        .frame(maxWidth: Sizing.maxContentWidth)
        .frame(maxWidth: .infinity)
        .padding(.horizontal, Spacing.xl)
    }
}

/// "OR" divider followed by third-party sign-in buttons. Social auth is stubbed —
/// pressing explains it's coming soon. Mirrors social-auth-group.tsx.
struct SocialAuthGroup: View {
    var providers: [SocialProvider] = [.apple, .google]
    @State private var showComingSoon = false

    var body: some View {
        VStack(spacing: Spacing.md) {
            OrDivider()
            ForEach(providers, id: \.self) { provider in
                SocialButton(provider: provider) { showComingSoon = true }
            }
        }
        .alert("Coming soon", isPresented: $showComingSoon) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Social sign-in isn't available just yet — use your email for now.")
        }
    }
}

enum SocialProvider: Hashable {
    case apple, google

    var label: String {
        switch self {
        case .apple: "Continue with Apple"
        case .google: "Continue with Google"
        }
    }

    var systemImage: String {
        switch self {
        case .apple: "apple.logo"
        case .google: "g.circle.fill" // placeholder glyph
        }
    }
}

/// Outlined third-party sign-in button. Mirrors components/ui/social-button.tsx.
struct SocialButton: View {
    let provider: SocialProvider
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: provider.systemImage)
                    .font(.system(size: 18))
                Text(provider.label).textStyle(.bodyStrong)
            }
            .foregroundStyle(AppColors.textPrimary)
            .frame(maxWidth: .infinity)
            .frame(height: Sizing.buttonHeight)
            .background(AppColors.surface)
            .overlay { Capsule().stroke(AppColors.border, lineWidth: 1) }
            .clipShape(Capsule())
        }
        .buttonStyle(.pressScale)
    }
}
