import SwiftUI

/// Optional, skippable onboarding step capturing the body model + allergies.
/// Everything is voluntary: "Skip for now" and "Continue" both advance.
/// Mirrors health-profile-screen.tsx.
struct HealthProfileView: View {
    /// Called when onboarding completes (Continue or Skip) — routes to permissions.
    var onNext: () -> Void

    @State private var sex: BiologicalSex?
    @State private var dob = ""
    @State private var dobError: String?
    @State private var heightCm = ""
    @State private var weightKg = ""
    @State private var activityLevel: ActivityLevel?
    @State private var dietGoal: DietGoal?
    @State private var allergens: Set<Allergen> = []
    @State private var saving = false
    @State private var submitError: String?

    private let dobPattern = #"^\d{4}-\d{2}-\d{2}$"#

    var body: some View {
        AppScreen(scroll: true) {
            VStack(alignment: .leading, spacing: Spacing.xxl) {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    AppText("Cook for your body.", variant: .title)
                    AppText(
                        "Tell us a little about you and we'll show what each recipe means for your day — and flag anything you're allergic to. All optional, and private to you.",
                        variant: .body,
                        color: AppColors.textSecondary,
                    )
                }

                VStack(spacing: Spacing.xl) {
                    Field(label: "Sex", hint: "Used only to estimate your energy needs.") {
                        SingleChoice(
                            options: [
                                SelectOption(value: BiologicalSex.male, label: "Male"),
                                SelectOption(value: BiologicalSex.female, label: "Female"),
                            ],
                            value: $sex,
                        )
                    }

                    AppTextField(
                        label: "Date of birth",
                        text: $dob,
                        placeholder: "YYYY-MM-DD",
                        error: dobError,
                        keyboardType: .numbersAndPunctuation,
                        autocapitalization: .never,
                    )

                    AppTextField(
                        label: "Height (cm)",
                        text: $heightCm,
                        placeholder: "e.g. 165",
                        keyboardType: .decimalPad,
                    )

                    AppTextField(
                        label: "Weight (kg)",
                        text: $weightKg,
                        placeholder: "e.g. 60",
                        keyboardType: .decimalPad,
                    )

                    Field(label: "Activity level") {
                        SingleChoice(
                            options: ActivityLevel.allCases.map { SelectOption(value: $0, label: $0.label) },
                            value: $activityLevel,
                        )
                    }

                    Field(label: "Goal") {
                        SingleChoice(
                            options: DietGoal.allCases.map { SelectOption(value: $0, label: $0.label) },
                            value: $dietGoal,
                        )
                    }

                    Field(label: "Food allergies", hint: "We'll warn you when a recipe contains these.") {
                        MultiChoice(
                            options: Allergen.allCases.map { SelectOption(value: $0, label: $0.label) },
                            values: $allergens,
                        )
                    }

                    if let submitError {
                        AppText(submitError, variant: .caption, color: AppColors.danger)
                    }
                }

                VStack(spacing: Spacing.sm) {
                    AppButton(label: "Continue", loading: saving, action: submit)
                    AppButton(label: "Skip for now", variant: .ghost, disabled: saving) {
                        onNext()
                    }
                }
            }
            .padding(.vertical, Spacing.lg)
        }
    }

    private func submit() {
        if !dob.isEmpty, dob.range(of: dobPattern, options: .regularExpression) == nil {
            dobError = "Use the format YYYY-MM-DD."
            return
        }
        dobError = nil

        var input = HealthProfileInput()
        input.sex = sex
        input.dateOfBirth = dob.isEmpty ? nil : dob
        if let height = Double(heightCm), height > 0 { input.heightCm = height }
        if let weight = Double(weightKg), weight > 0 { input.weightKg = weight }
        input.activityLevel = activityLevel
        input.dietGoal = dietGoal
        input.allergens = Allergen.allCases.filter { allergens.contains($0) }
        input.dietaryPrefs = []

        saving = true
        Task {
            do {
                try await ProfileService.saveHealthProfile(input)
                onNext()
            } catch let error as ApiError {
                submitError = error.message
            } catch {
                submitError = "Something went wrong. Please try again."
            }
            saving = false
        }
    }
}
