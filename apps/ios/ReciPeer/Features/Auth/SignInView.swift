import SwiftUI

/// Mirrors sign-in-screen.tsx.
struct SignInView: View {
    @Binding var path: NavigationPath
    @Environment(SessionStore.self) private var session

    @State private var email = ""
    @State private var password = ""
    @State private var emailError: String?
    @State private var passwordError: String?
    @State private var submitError: String?
    @State private var loading = false

    var body: some View {
        AppScreen(scroll: true) {
            VStack(alignment: .leading, spacing: Spacing.xl) {
                BackButton()

                AuthHeader(
                    title: "Welcome back.",
                    subtitle: "Your kitchen and saved recipes are waiting.",
                )

                VStack(spacing: Spacing.lg) {
                    AppTextField(
                        label: "Email",
                        text: $email,
                        error: emailError,
                        keyboardType: .emailAddress,
                        textContentType: .emailAddress,
                        autocapitalization: .never,
                        submitLabel: .next,
                    )
                    AppTextField(
                        label: "Password",
                        text: $password,
                        error: passwordError,
                        isSecure: true,
                        textContentType: .password,
                        onSubmit: submit,
                    )

                    Button("Forgot password?") {
                        path.append(AuthRoute.forgotPassword)
                    }
                    .font(.custom(AppFont.bodyMedium, size: 14))
                    .foregroundStyle(AppColors.primary)
                    .frame(maxWidth: .infinity, alignment: .trailing)

                    if let submitError {
                        AppText(submitError, variant: .caption, color: AppColors.danger)
                    }

                    AppButton(label: "Sign in", loading: loading, action: submit)
                }

                SocialAuthGroup(providers: [.apple])

                HStack(spacing: Spacing.xxs) {
                    AppText("New here? ", variant: .caption, color: AppColors.textSecondary)
                    Button("Make a kitchen") {
                        path.append(AuthRoute.createKitchen)
                    }
                    .font(.custom(AppFont.bodyMedium, size: 14))
                    .foregroundStyle(AppColors.primary)
                }
                .frame(maxWidth: .infinity)
            }
            .padding(.vertical, Spacing.lg)
        }
    }

    private func submit() {
        emailError = AuthValidator.email(email)
        passwordError = AuthValidator.signInPassword(password)
        submitError = nil
        guard emailError == nil, passwordError == nil else { return }

        loading = true
        Task {
            do {
                try await session.signIn(email: email, password: password)
            } catch let error as AuthError {
                submitError = error.message
            } catch {
                submitError = "Something went wrong. Please try again."
            }
            loading = false
        }
    }
}
