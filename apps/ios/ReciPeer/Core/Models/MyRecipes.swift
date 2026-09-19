import Foundation

// MARK: - My Recipes / review DTOs (packages/core/src/recipe/mine.ts)

enum IngestionJobStatus: String, Codable {
    case uploading = "UPLOADING"
    case transcribing = "TRANSCRIBING"
    case structuring = "STRUCTURING"
    case translating = "TRANSLATING"
    case review = "REVIEW"
    case complete = "COMPLETE"
    case failed = "FAILED"

    var isActive: Bool {
        switch self {
        case .uploading, .transcribing, .structuring, .translating: true
        case .review, .complete, .failed: false
        }
    }

    var label: String {
        switch self {
        case .uploading: "Uploading"
        case .transcribing: "Transcribing"
        case .structuring: "Structuring"
        case .translating: "Translating"
        case .review: "Ready to review"
        case .complete: "Complete"
        case .failed: "Failed"
        }
    }
}

enum IngestionSourceType: String, Codable {
    case video = "VIDEO", audio = "AUDIO", link = "LINK"
    case handwritten = "HANDWRITTEN", manual = "MANUAL"
}

enum RecipeStatusDTO: String, Codable {
    case draft = "DRAFT", processing = "PROCESSING"
    case published = "PUBLISHED", archived = "ARCHIVED"
}

enum RecipeVisibilityDTO: String, Codable {
    case `public` = "PUBLIC", `private` = "PRIVATE"
}

/// A recipe still being processed (no finished recipe yet, or it failed).
struct ProcessingJobDTO: Codable, Equatable, Identifiable {
    let jobId: String
    let status: IngestionJobStatus
    let sourceType: IngestionSourceType
    let title: String?
    let recipeId: String?
    let errorMessage: String?
    let createdAt: String

    var id: String { jobId }
}

/// A compact card for the Needs review / Published / Private sections.
struct MyRecipeCardDTO: Codable, Equatable, Identifiable {
    let id: String
    let title: String
    let titleOriginal: String?
    let coverImageUrl: String?
    let status: RecipeStatusDTO
    let visibility: RecipeVisibilityDTO
    /// Link imports can never be published publicly.
    let isLinkImport: Bool
    let updatedAt: String
}

struct MyRecipesResponse: Codable, Equatable {
    let processing: [ProcessingJobDTO]
    let needsReview: [MyRecipeCardDTO]
    let published: [MyRecipeCardDTO]
    let `private`: [MyRecipeCardDTO]
}

struct RecipeDetailIngredientDTO: Codable, Equatable, Identifiable {
    let id: String
    let name: String
    let nameOriginal: String?
    let amount: Double?
    let unit: String?
    let quantityNote: String?
    let substitutionNote: String?
    let orderIndex: Int
}

struct RecipeDetailStepDTO: Codable, Equatable, Identifiable {
    let id: String
    let stepNumber: Int
    let instruction: String
    let videoStartMs: Int?
    let videoEndMs: Int?
}

/// Full recipe for the Review & publish screen.
struct RecipeDetailDTO: Codable, Equatable {
    let id: String
    let title: String
    let titleOriginal: String?
    let description: String?
    let status: RecipeStatusDTO
    let visibility: RecipeVisibilityDTO
    let originalLanguage: String?
    let totalTimeMinutes: Double?
    let baseServings: Int
    let isLinkImport: Bool
    let coverImageUrl: String?
    let videoUrl: String?
    let ingredients: [RecipeDetailIngredientDTO]
    let steps: [RecipeDetailStepDTO]
}

/// Body for editing a recipe on the review screen.
struct UpdateRecipeInput: Encodable {
    struct Ingredient: Encodable {
        var name: String
        var nameOriginal: String?
        var amount: Double?
        var unit: String?
        var quantityNote: String?
        var substitutionNote: String?
    }
    struct Step: Encodable {
        var instruction: String
        var videoStartMs: Int?
        var videoEndMs: Int?
    }

    var title: String?
    var description: String?
    var baseServings: Int?
    var totalTimeMinutes: Double?
    var coverImageUrl: String?
    var ingredients: [Ingredient]?
    var steps: [Step]?
}
