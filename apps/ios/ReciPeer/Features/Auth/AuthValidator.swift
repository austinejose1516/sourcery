import Foundation

/// Client-side form validation mirroring features/auth/schema.ts (zod).
enum AuthValidator {
    private static let emailPattern = #"^[^\s@]+@[^\s@]+\.[^\s@]+$"#

    static func email(_ value: String) -> String? {
        let trimmed = value.trimmingCharacters(in: .whitespaces)
        if trimmed.isEmpty { return "Email is required" }
        if trimmed.range(of: emailPattern, options: .regularExpression) == nil {
            return "Enter a valid email"
        }
        return nil
    }

    static func signInPassword(_ value: String) -> String? {
        value.isEmpty ? "Password is required" : nil
    }

    static func name(_ value: String) -> String? {
        value.trimmingCharacters(in: .whitespaces).isEmpty ? "Name is required" : nil
    }

    static func signUpPassword(_ value: String) -> String? {
        value.count < 8 ? "Use at least 8 characters" : nil
    }
}
