import Foundation

/// Body accepted by PATCH /users/me — all fields optional (the health step is
/// skippable). Mirrors profile/hooks.ts HealthProfileInput.
struct HealthProfileInput: Encodable {
    var sex: BiologicalSex?
    var dateOfBirth: String?
    var heightCm: Double?
    var weightKg: Double?
    var activityLevel: ActivityLevel?
    var dietGoal: DietGoal?
    var allergens: [Allergen]?
    var dietaryPrefs: [String]?
}

enum ProfileService {
    /// The current viewer's profile + computed BMI / calorie / macro targets.
    static func fetchProfile() async throws -> UserProfileDTO {
        try await APIClient.get("/users/me")
    }

    /// Persist the onboarding health answers (and profile edits).
    @discardableResult
    static func saveHealthProfile(_ input: HealthProfileInput) async throws -> UserProfileDTO {
        try await APIClient.patch("/users/me", body: input)
    }
}
