import SwiftUI

/// Routes within the unauthenticated flow.
enum AuthRoute: Hashable {
    case welcome
    case signIn
    case forgotPassword
    case createKitchen
}

/// The auth stack shown when signed out. On successful sign-in/sign-up the
/// SessionStore flips to `.authenticated` and RootView swaps to the main app.
struct AuthFlow: View {
    @State private var path = NavigationPath()
    /// Set when sign-up succeeds — pushes onboarding onto the stack.
    var onNeedsOnboarding: (() -> Void)? = nil

    var body: some View {
        NavigationStack(path: $path) {
            WelcomeView(path: $path)
                .navigationDestination(for: AuthRoute.self) { route in
                    switch route {
                    case .welcome:
                        WelcomeView(path: $path)
                    case .signIn:
                        SignInView(path: $path)
                    case .forgotPassword:
                        ForgotPasswordView()
                    case .createKitchen:
                        CreateKitchenView(onNeedsOnboarding: onNeedsOnboarding)
                    }
                }
                .toolbar(.hidden, for: .navigationBar)
        }
    }
}
