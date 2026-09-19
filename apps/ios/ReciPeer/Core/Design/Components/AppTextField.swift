import SwiftUI

/// Labelled text input with focus ring, error state and a show/hide toggle for
/// password fields. Mirrors components/ui/text-field.tsx.
struct AppTextField: View {
    let label: String?
    @Binding var text: String
    var placeholder: String = ""
    var error: String? = nil
    var hint: String? = nil
    var isSecure: Bool = false
    var keyboardType: UIKeyboardType = .default
    var textContentType: UITextContentType? = nil
    var autocapitalization: TextInputAutocapitalization = .sentences
    var submitLabel: SubmitLabel = .done
    var onSubmit: (() -> Void)? = nil

    @State private var hidden = true
    @FocusState private var focused: Bool

    init(
        label: String? = nil,
        text: Binding<String>,
        placeholder: String = "",
        error: String? = nil,
        hint: String? = nil,
        isSecure: Bool = false,
        keyboardType: UIKeyboardType = .default,
        textContentType: UITextContentType? = nil,
        autocapitalization: TextInputAutocapitalization = .sentences,
        submitLabel: SubmitLabel = .done,
        onSubmit: (() -> Void)? = nil,
    ) {
        self.label = label
        _text = text
        self.placeholder = placeholder
        self.error = error
        self.hint = hint
        self.isSecure = isSecure
        self.keyboardType = keyboardType
        self.textContentType = textContentType
        self.autocapitalization = autocapitalization
        self.submitLabel = submitLabel
        self.onSubmit = onSubmit
    }

    private var borderColor: Color {
        if error != nil { return AppColors.danger }
        return focused ? AppColors.focusRing : AppColors.border
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            if let label {
                AppText(label, variant: .label, color: AppColors.textSecondary)
                    .padding(.leading, Spacing.xs)
            }

            HStack(spacing: Spacing.sm) {
                field
                    .font(.custom(AppFont.body, size: 16))
                    .foregroundStyle(AppColors.textPrimary)
                    .keyboardType(keyboardType)
                    .textContentType(textContentType)
                    .textInputAutocapitalization(autocapitalization)
                    .submitLabel(submitLabel)
                    .focused($focused)
                    .onSubmit { onSubmit?() }

                if isSecure {
                    Button {
                        hidden.toggle()
                    } label: {
                        Image(systemName: hidden ? "eye" : "eye.slash")
                            .foregroundStyle(AppColors.textSecondary)
                    }
                }
            }
            .padding(.horizontal, Spacing.lg)
            .frame(height: Sizing.inputHeight)
            .background(AppColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: Radius.input))
            .overlay {
                RoundedRectangle(cornerRadius: Radius.input)
                    .stroke(borderColor, lineWidth: 1)
            }
            .animation(.easeOut(duration: 0.16), value: focused)

            if let error {
                AppText(error, variant: .micro, color: AppColors.danger)
                    .padding(.leading, Spacing.xs)
            } else if let hint {
                AppText(hint, variant: .micro, color: AppColors.textSecondary)
                    .padding(.leading, Spacing.xs)
            }
        }
        .onAppear { hidden = isSecure }
    }

    @ViewBuilder
    private var field: some View {
        if isSecure && hidden {
            SecureField(placeholder, text: $text)
        } else {
            TextField(placeholder, text: $text)
        }
    }
}
