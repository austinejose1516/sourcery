import SwiftUI

/// The "Nutrition & dietary" block on the recipe overview. Mirrors
/// nutrition/nutrition-section.tsx. Needs the viewer's allergen profile, so the
/// screen passes in `profile` (nil while loading / when absent).
struct NutritionSection: View {
    let recipe: RecipeViewDTO
    var profile: UserProfileDTO?

    private var hasTags: Bool { !recipe.dietaryTags.isEmpty }
    private var hasFacts: Bool { recipe.nutrition != nil }

    /// Allergens both in the recipe and declared by the viewer.
    private var conflicts: [Allergen] {
        guard let profile else { return [] }
        let declared = Set(profile.allergens)
        return recipe.containsAllergens.filter { declared.contains($0) }
    }

    var body: some View {
        if hasTags || hasFacts || !recipe.containsAllergens.isEmpty {
            VStack(alignment: .leading, spacing: Spacing.md) {
                Text("Nutrition & dietary")
                    .textStyle(.heading)
                    .padding(.top, Spacing.xxl)
                    .padding(.bottom, Spacing.md)

                if hasTags { DietaryPills(tags: recipe.dietaryTags) }
                if !conflicts.isEmpty { AllergyWarning(conflicts: conflicts) }

                if let nutrition = recipe.nutrition {
                    NutritionFactsGrid(nutrition: nutrition, servings: recipe.baseServings)
                    PersonalizedCallout(nutrition: nutrition, profile: profile)
                }
            }
        }
    }
}

/// Objective dietary tags as tinted editorial pills.
private struct DietaryPills: View {
    let tags: [String]

    private static let tints: [(Color, Color)] = [
        (Palette.apricot, Palette.apricotInk),
        (Palette.bleu, Palette.bleuInk),
        (Palette.burgundy, Palette.burgundyInk),
        (Palette.editorial, Palette.editorialInk),
    ]

    var body: some View {
        FlowLayout(spacing: Spacing.sm) {
            ForEach(Array(tags.enumerated()), id: \.offset) { index, tag in
                let tint = Self.tints[index % Self.tints.count]
                Text(tag)
                    .textStyle(.label)
                    .foregroundStyle(tint.1)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.xs)
                    .background(tint.0)
                    .clipShape(Capsule())
            }
        }
    }
}

/// Safety callout when the recipe contains an allergen the viewer declared.
private struct AllergyWarning: View {
    let conflicts: [Allergen]

    var body: some View {
        let names = conflicts.map(\.label)
        let list = names.count == 1
            ? names[0]
            : "\(names.dropLast().joined(separator: ", ")) and \(names.last ?? "")"

        HStack(alignment: .top, spacing: Spacing.sm) {
            Image(systemName: "exclamationmark.circle.fill")
                .font(.system(size: 16))
                .foregroundStyle(AppColors.primary)
            (Text("Heads up — contains \(list). ").fontWeight(.semibold)
                + Text("This recipe conflicts with your allergy profile."))
                .textStyle(.caption)
                .foregroundStyle(Palette.apricotInk)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(Spacing.md)
        .background(Palette.apricot)
        .clipShape(RoundedRectangle(cornerRadius: Radius.md))
        .padding(.top, Spacing.md)
    }
}

/// Per-serving facts grid: 8 metrics, two rows of four.
private struct NutritionFactsGrid: View {
    let nutrition: RecipeNutritionDTO
    let servings: Int

    private var cells: [(String, String)] {
        [
            ("Calories", nutrition.calories.map { "\(Int($0.rounded()))" } ?? "—"),
            ("Protein", fmtG(nutrition.proteinG)),
            ("Carbs", fmtG(nutrition.carbsG)),
            ("Fat", fmtG(nutrition.fatG)),
            ("Fiber", fmtG(nutrition.fiberG)),
            ("Sugar", fmtG(nutrition.sugarG)),
            ("Sat. fat", fmtG(nutrition.satFatG)),
            ("Sodium", nutrition.sodiumMg.map { "\(Int($0.rounded()))mg" } ?? "—"),
        ]
    }

    private func fmtG(_ v: Double?) -> String {
        v.map { "\(Int($0.rounded()))g" } ?? "—"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Per serving · makes \(servings)\(nutrition.source == .aiEstimated ? " · estimated" : "")")
                .textStyle(.caption)
                .foregroundStyle(AppColors.textSecondary)
                .padding(.top, Spacing.md)

            LazyVGrid(
                columns: Array(repeating: GridItem(.flexible()), count: 4),
                spacing: Spacing.sm,
            ) {
                ForEach(cells, id: \.0) { cell in
                    VStack(spacing: 3) {
                        Text(cell.1).textStyle(.bodyStrong)
                        Text(cell.0.uppercased())
                            .font(.custom(AppFont.body, size: 9.5))
                            .tracking(0.6)
                            .foregroundStyle(AppColors.textSecondary)
                    }
                    .padding(.vertical, Spacing.sm)
                }
            }
            .padding(.vertical, Spacing.md)
            .background(AppColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: Radius.card))
            .overlay {
                RoundedRectangle(cornerRadius: Radius.card).stroke(AppColors.border, lineWidth: 0.5)
            }
        }
    }
}

/// The personalized "% of your day" line — or a gentle nudge when no body model exists.
private struct PersonalizedCallout: View {
    let nutrition: RecipeNutritionDTO
    let profile: UserProfileDTO?

    private var parts: [String] {
        guard let profile, let target = profile.metrics.dailyCalorieTarget else { return [] }
        var out: [String] = []
        if let cal = nutrition.calories, cal > 0 {
            out.append("\(Int((cal / target * 100).rounded()))% of your daily calories")
        }
        if let macros = profile.metrics.macroTargets, let protein = nutrition.proteinG, protein > 0 {
            out.append("\(Int((protein / macros.proteinG * 100).rounded()))% of your protein target")
        }
        return out
    }

    private var target: Double? {
        profile?.metrics.dailyCalorieTarget
    }

    var body: some View {
        if let profile, let target = profile.metrics.dailyCalorieTarget {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(parts.isEmpty ? "Fill in a few more details to personalize this." : "One serving is about \(join(parts)).")
                    .textStyle(.caption)
                    .foregroundStyle(AppColors.textPrimary)
                Text("Your target ~\(Int(target)) kcal/day\(bmiSuffix)")
                    .textStyle(.micro)
                    .foregroundStyle(AppColors.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(Spacing.md)
            .background(AppColors.surfaceMuted)
            .clipShape(RoundedRectangle(cornerRadius: Radius.md))
            .padding(.top, Spacing.md)
        } else {
            Text("Add your height, weight and activity in your profile to see what one serving means for your day.")
                .textStyle(.caption)
                .foregroundStyle(AppColors.textSecondary)
                .padding(Spacing.md)
                .overlay {
                    RoundedRectangle(cornerRadius: Radius.md)
                        .stroke(AppColors.border, style: StrokeStyle(lineWidth: 1, dash: [4]))
                }
                .padding(.top, Spacing.md)
        }
    }

    private var bmiSuffix: String {
        if let bmi = profile?.metrics.bmi {
            return " · BMI \(Int(bmi.value.rounded())) (\(bmi.category.rawValue))"
        }
        return ""
    }

    private func join(_ parts: [String]) -> String {
        parts.count == 1 ? parts[0] : "\(parts.dropLast().joined(separator: ", ")) and \(parts.last ?? "")"
    }
}
