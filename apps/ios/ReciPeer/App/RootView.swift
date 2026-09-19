import SwiftUI

/// Gates the app on auth state: loading → auth stack, and authenticated →
/// onboarding (until completed) → the main tabs.
struct RootView: View {
    @Environment(SessionStore.self) private var session
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false

    var body: some View {
        Group {
            switch session.status {
            case .loading:
                ZStack {
                    AppColors.background.ignoresSafeArea()
                    ProgressView().tint(AppColors.primary)
                }

            case .unauthenticated:
                AuthFlow()

            case .authenticated:
                if hasCompletedOnboarding {
                    MainTabView()
                } else {
                    OnboardingFlow {
                        withAnimation { hasCompletedOnboarding = true }
                    }
                }
            }
        }
    }
}

#Preview {
    RootView().environment(SessionStore())
}
