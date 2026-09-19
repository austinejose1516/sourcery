import SwiftUI

/// The Profile tab. Mirrors profile-screen.tsx.
struct ProfileView: View {
    @Environment(SessionStore.self) private var session
    @State private var signingOut = false

    private var firstName: String {
        session.session?.displayName?.split(separator: " ").first.map(String.init) ?? "cook"
    }

    var body: some View {
        AppScreen {
            VStack(spacing: Spacing.lg) {
                Spacer()

                VStack(alignment: .leading, spacing: Spacing.md) {
                    Capsule()
                        .fill(AppColors.accent)
                        .frame(width: 56, height: 2)
                    Text("Profile").textStyle(.display)
                    Text("Signed in as \(firstName).")
                        .textStyle(.body)
                        .foregroundStyle(AppColors.textSecondary)
                }

                Spacer()

                AppButton(label: "Sign out", variant: .secondary, loading: signingOut) {
                    signingOut = true
                    Task {
                        try? await session.signOut()
                        signingOut = false
                    }
                }
            }
            .padding(.vertical, Spacing.xxxl)
        }
        .toolbar(.hidden, for: .navigationBar)
    }
}
