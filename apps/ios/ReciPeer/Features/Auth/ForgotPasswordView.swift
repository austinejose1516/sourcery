import SwiftUI

/// Mirrors forgot-password-screen.tsx.
struct ForgotPasswordView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var emailError: String?
    @State private var submitError: String?
    @State private var loading = false
    @State private var sent = false

    var body: some View {
        AppScreen(scroll: true) {
            VStack(alignment: .leading, spacing: Spacing.xl) {
                BackButton()

                AuthHeader(
                    title: "Reset your password.",
                    subtitle: "Pop in your email and we'll send a one-tap link. No need to remember anything.",
                )

                if sent {
                    successCard
                } else {
                    form
                }
            }
            .padding(.vertical, Spacing.lg)
        }
    }

    private var form: some View {
        VStack(spacing: Spacing.lg) {
            AppTextField(
                label: "Email",
                text: $email,
                error: emailError,
                keyboardType: .emailAddress,
                textContentType: .emailAddress,
                autocapitalization: .never,
                onSubmit: submit,
            )

            if let submitError {
                AppText(submitError, variant: .caption, color: AppColors.danger)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            AppButton(label: "Send reset link", loading: loading, action: submit)

            AppText(
                "If you signed up with Apple or Google, head back and use that button instead — you don't have a password to reset.",
                variant: .caption,
                color: AppColors.textSecondary,
            )
            .padding(Spacing.lg)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.surfaceMuted)
            .clipShape(RoundedRectangle(cornerRadius: Radius.md))
        }
    }

    private var successCard: some View {
        VStack(spacing: Spacing.sm) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 28))
                .foregroundStyle(AppColors.herb)
            AppText("Check your inbox", variant: .bodyStrong)
            AppText(
                "If an account exists for \(email), a reset link is on its way.",
                variant: .caption,
                color: AppColors.textSecondary,
            )
            .multilineTextAlignment(.center)
            AppButton(label: "Back to sign in", variant: .secondary) {
                dismiss()
            }
        }
        .padding(Spacing.xl)
        .frame(maxWidth: .infinity)
        .background(AppColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: Radius.card))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.card)
                .stroke(AppColors.border, lineWidth: 1)
        }
    }

    private func submit() {
        emailError = AuthValidator.email(email)
        submitError = nil
        guard emailError == nil else { return }

        loading = true
        Task {
            do {
                try await session.sendPasswordReset(email: email)
                sent = true
            } catch let error as AuthError {
                submitError = error.message
            } catch {
                submitError = "Something went wrong. Please try again."
            }
            loading = false
        }
    }
}
