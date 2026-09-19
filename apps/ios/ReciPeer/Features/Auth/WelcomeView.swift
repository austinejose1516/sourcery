import SwiftUI

/// Mirrors welcome-screen.tsx.
struct WelcomeView: View {
    @Binding var path: NavigationPath

    var body: some View {
        AppScreen {
            VStack(spacing: Spacing.lg) {
                Spacer()
                Logo()
                    .frame(maxWidth: .infinity)
                AppText("Recipes from the cooks who actually make them.", variant: .title)
                    .frame(maxWidth: 320, alignment: .leading)
                AppText(
                    "Watch home cooks worldwide make their grandmothers' dishes. Cook along. Share what you make.",
                    variant: .body,
                    color: AppColors.textSecondary,
                )
                Spacer()
            }
            .frame(maxWidth: .infinity)

            VStack(spacing: Spacing.sm) {
                AppButton(label: "Get started") {
                    path.append(AuthRoute.createKitchen)
                }
                AppButton(label: "I already have an account", variant: .ghost) {
                    path.append(AuthRoute.signIn)
                }
            }
        }
    }
}
