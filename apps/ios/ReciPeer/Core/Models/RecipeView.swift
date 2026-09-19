import Foundation

// MARK: - Recipe viewer + cook-mode DTOs (packages/core/src/recipe/view.ts)

enum CautionLevelDTO: String, Codable {
    case caution = "CAUTION", warn = "WARN", critical = "CRITICAL"
}

enum DifficultyDTO: String, Codable {
    case easy = "EASY", medium = "MEDIUM", hard = "HARD"
    var label: String {
        switch self {
        case .easy: "Easy"
        case .medium: "Medium"
        case .hard: "Hard"
        }
    }
}

/// The cook who shared the recipe, as shown in the overview contributor strip.
struct ViewContributorDTO: Codable, Equatable, Identifiable {
    let id: String
    let displayName: String
    let username: String
    let avatarUrl: String?
    /// Human label like "Kochi, Kerala", or nil.
    let region: String?
    /// ISO-3166 alpha-2; the client turns this into a flag emoji.
    let country: String?
    let recipeCount: Int
    let followerCount: Int
    let isFollowing: Bool

    var flagEmoji: String? { FeedAuthorDTO.flagEmoji(for: country) }
}

struct ViewRegionDTO: Codable, Equatable {
    let name: String
    let country: String
    var flagEmoji: String? { FeedAuthorDTO.flagEmoji(for: country) }
}

struct ViewCuisineDTO: Codable, Equatable {
    let name: String
}

/// A "For this step" chip — a recipe ingredient referenced by one step.
struct ViewStepIngredientDTO: Codable, Equatable {
    let name: String
    /// Measured qty ("500 g") or a free note ("from step 1"); may be nil.
    let qty: String?
}

/// The ingredients-at-a-glance rows on the overview.
struct RecipeViewIngredientDTO: Codable, Equatable, Identifiable {
    let id: String
    let name: String
    /// Pre-formatted display quantity, or nil for unit-less items.
    let qty: String?
    let substitutionNote: String?
}

struct StepCaution: Codable, Equatable {
    let level: CautionLevelDTO
    let text: String
}

struct StepClip: Codable, Equatable {
    /// Trimmed clip range within the source video, in milliseconds.
    let startMs: Int
    let endMs: Int
}

struct StepVoiceQA: Codable, Equatable {
    let question: String
    let answer: String
}

struct RecipeViewStepDTO: Codable, Equatable, Identifiable {
    let id: String
    let stepNumber: Int
    /// Short verb-led label ("Poach the fish") for the outline + cook header.
    let summary: String?
    let instruction: String
    let timerSeconds: Int?
    let timerLabel: String?
    let caution: StepCaution?
    /// The "Look for…" sensory cue.
    let donenessCue: String?
    let tipText: String?
    let clip: StepClip?
    let stepIngredients: [ViewStepIngredientDTO]
    /// Seeded hands-free Q&A shown in the voice overlay; nil when none.
    let voice: StepVoiceQA?
}

enum VideoKindDTO: String, Codable {
    case upload = "UPLOAD", youtube = "YOUTUBE"
}

/// Full recipe payload for the viewer + cook flow.
struct RecipeViewDTO: Codable, Equatable {
    let id: String
    let title: String
    let titleOriginal: String?
    let description: String?
    let region: ViewRegionDTO?
    let cuisine: ViewCuisineDTO?
    let difficulty: DifficultyDTO?
    let dietaryTags: [String]
    let nutrition: RecipeNutritionDTO?
    /// Major allergens the recipe contains; empty = unknown, not "allergen-free".
    let containsAllergens: [Allergen]
    let totalTimeMinutes: Int?
    /// Active "hands-on" time; nil when unknown.
    let handsOnMinutes: Int?
    let baseServings: Int
    let endorsementCount: Int
    let cookCount: Int
    let saveCount: Int
    let isSaved: Bool
    let triedByMe: Bool
    let contributor: ViewContributorDTO
    let coverImageUrl: String?
    /// Which player the recipe's video needs; nil when there's no playable video.
    let videoKind: VideoKindDTO?
    let videoDurationMs: Int?
    let ingredients: [RecipeViewIngredientDTO]
    let steps: [RecipeViewStepDTO]
}

/// On-demand playback descriptor (GET /recipes/:id/video).
struct RecipeVideoDTO: Codable, Equatable {
    let kind: VideoKindDTO
    /// Freshly signed R2 URL (UPLOAD) or the source YouTube URL (YOUTUBE).
    let url: String
    /// Parsed YouTube video id for the embed player; nil for uploads.
    let youtubeId: String?
    let durationMs: Int?
}

/// A card in the My Recipes → Tried tab.
struct TriedRecipeCardDTO: Codable, Equatable, Identifiable {
    struct TriedRecipe: Codable, Equatable {
        let id: String
        let title: String
        let titleOriginal: String?
        let coverImageUrl: String?
    }

    let triedId: String
    /// ISO timestamp.
    let triedAt: String
    let recipe: TriedRecipe
    let photoUrl: String?
    let note: String?

    var id: String { triedId }
}

/// Body for marking a recipe as tried from the cook-mode complete screen.
struct MarkTriedInput: Encodable {
    var photoUrl: String?
    var note: String?
}
