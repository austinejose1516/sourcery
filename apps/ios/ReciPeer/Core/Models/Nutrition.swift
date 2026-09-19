import Foundation

// MARK: - Nutrition + body-model contracts (packages/core/src/nutrition/types.ts)

enum BiologicalSex: String, Codable { case male = "MALE", female = "FEMALE" }

enum ActivityLevel: String, Codable, CaseIterable, Identifiable {
    case sedentary = "SEDENTARY", light = "LIGHT", moderate = "MODERATE"
    case active = "ACTIVE", veryActive = "VERY_ACTIVE"
    var id: String { rawValue }
    var label: String {
        switch self {
        case .sedentary: "Sedentary"
        case .light: "Lightly active"
        case .moderate: "Moderately active"
        case .active: "Active"
        case .veryActive: "Very active"
        }
    }
}

enum DietGoal: String, Codable, CaseIterable, Identifiable {
    case lose = "LOSE", maintain = "MAINTAIN", gain = "GAIN"
    var id: String { rawValue }
    var label: String {
        switch self {
        case .lose: "Lose weight"
        case .maintain: "Maintain weight"
        case .gain: "Gain weight"
        }
    }
}

/// FDA/EU "big-9" major allergens, canonical order.
enum Allergen: String, Codable, CaseIterable, Identifiable {
    case peanuts = "PEANUTS", treeNuts = "TREE_NUTS", milk = "MILK", egg = "EGG"
    case wheatGluten = "WHEAT_GLUTEN", soy = "SOY", fish = "FISH"
    case shellfish = "SHELLFISH", sesame = "SESAME"
    var id: String { rawValue }
    var label: String {
        switch self {
        case .peanuts: "Peanuts"
        case .treeNuts: "Tree nuts"
        case .milk: "Milk"
        case .egg: "Egg"
        case .wheatGluten: "Wheat / gluten"
        case .soy: "Soy"
        case .fish: "Fish"
        case .shellfish: "Shellfish"
        case .sesame: "Sesame"
        }
    }
}

enum NutritionSource: String, Codable { case aiEstimated = "AI_ESTIMATED", manual = "MANUAL", computed = "COMPUTED" }

/// Per-serving nutrition facts. Every metric nullable — a partial estimate still shows.
struct RecipeNutritionDTO: Codable, Equatable {
    let calories: Double?
    let proteinG: Double?
    let carbsG: Double?
    let fatG: Double?
    let fiberG: Double?
    let sugarG: Double?
    let satFatG: Double?
    let sodiumMg: Double?
    let source: NutritionSource
}

enum BmiCategory: String, Codable { case underweight, normal, overweight, obese }

struct BmiResult: Codable, Equatable {
    let value: Double
    let category: BmiCategory
}

struct MacroTargetsDTO: Codable, Equatable {
    let proteinG: Double
    let carbsG: Double
    let fatG: Double
}

struct ProfileMetrics: Codable, Equatable {
    let bmi: BmiResult?
    let dailyCalorieTarget: Double?
    let macroTargets: MacroTargetsDTO?
}

/// GET /users/me response.
struct UserProfileDTO: Codable, Equatable {
    let id: String
    let username: String
    let displayName: String
    let sex: BiologicalSex?
    let dateOfBirth: String?
    let heightCm: Double?
    let weightKg: Double?
    let activityLevel: ActivityLevel?
    let dietGoal: DietGoal?
    let allergens: [Allergen]
    let dietaryPrefs: [String]
    let metrics: ProfileMetrics
}
