import SwiftUI

/// "By continuing you agree to …" with tappable terms / privacy links.
struct LegalNotice: View {
    private let termsURL = URL(string: "https://recipeer.app/terms")!
    private let privacyURL = URL(string: "https://recipeer.app/privacy")!

    var body: some View {
        Text(makeAttributed())
            .font(.custom(AppFont.body, size: 12))
            .tracking(0.4)
            .foregroundStyle(AppColors.textSecondary)
    }

    private func makeAttributed() -> AttributedString {
        var text = AttributedString("By continuing you agree to ReciPeer's terms and privacy notice.")

        if let range = text.range(of: "terms") {
            text[range].link = termsURL
            text[range].foregroundColor = AppColors.primary
        }
        if let range = text.range(of: "privacy notice") {
            text[range].link = privacyURL
            text[range].foregroundColor = AppColors.primary
        }
        return text
    }
}

/// Mirrors create-kitchen-screen.tsx.
struct CreateKitchenView: View {
    @Environment(SessionStore.self) private var session
    var onNeedsOnboarding: (() -> Void)? = nil

    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var nameError: String?
    @State private var emailError: String?
    @State private var passwordError: String?
    @State private var submitError: String?
    @State private var loading = false

    var body: some View {
        AppScreen(scroll: true) {
            VStack(alignment: .leading, spacing: Spacing.xl) {
                BackButton()

                AuthHeader(
                    title: "Make a kitchen.",
                    subtitle: "Save recipes, follow cooks, share what you've made.",
                )

                VStack(spacing: Spacing.lg) {
                    AppTextField(
                        label: "Name",
                        text: $name,
                        error: nameError,
                        textContentType: .name,
                        autocapitalization: .words,
                        submitLabel: .next,
                    )
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
                        hint: "Choose something you'll remember.",
                        isSecure: true,
                        textContentType: .newPassword,
                        onSubmit: submit,
                    )

                    LegalNotice()

                    if let submitError {
                        AppText(submitError, variant: .caption, color: AppColors.danger)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    AppButton(label: "Create account", loading: loading, action: submit)
                }

                SocialAuthGroup(providers: [.apple, .google])

                HStack(spacing: Spacing.xxs) {
                    AppText("Already have an account? ", variant: .caption, color: AppColors.textSecondary)
                    NavigationLink(value: AuthRoute.signIn) {
                        Text("Sign in")
                            .font(.custom(AppFont.bodyMedium, size: 14))
                            .foregroundStyle(AppColors.primary)
                    }
                }
                .frame(maxWidth: .infinity)
            }
            .padding(.vertical, Spacing.lg)
        }
    }

    private func submit() {
        nameError = AuthValidator.name(name)
        emailError = AuthValidator.email(email)
        passwordError = AuthValidator.signUpPassword(password)
        submitError = nil
        guard nameError == nil, emailError == nil, passwordError == nil else { return }

        loading = true
        Task {
            do {
                try await session.signUp(name: name, email: email, password: password)
                onNeedsOnboarding?()
            } catch let error as AuthError {
                submitError = error.message
            } catch {
                submitError = "Something went wrong. Please try again."
            }
            loading = false
        }
    }
}
