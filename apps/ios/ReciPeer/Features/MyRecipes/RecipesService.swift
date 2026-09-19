import Foundation

/// My Recipes + recipe-view read endpoints (features/recipes/api.ts + recipe-view/api.ts).
enum RecipesService {
    static func fetchMyRecipes() async throws -> MyRecipesResponse {
        try await APIClient.get("/recipes/mine")
    }

    static func fetchJob(_ jobId: String) async throws -> ProcessingJobDTO {
        try await APIClient.get("/recipes/jobs/\(jobId)")
    }

    static func fetchRecipeDetail(_ recipeId: String) async throws -> RecipeDetailDTO {
        try await APIClient.get("/recipes/\(recipeId)")
    }

    static func fetchRecipeView(_ recipeId: String) async throws -> RecipeViewDTO {
        try await APIClient.get("/recipes/\(recipeId)/view")
    }

    static func fetchRecipeVideo(_ recipeId: String) async throws -> RecipeVideoDTO {
        try await APIClient.get("/recipes/\(recipeId)/video")
    }

    static func fetchTriedRecipes() async throws -> [TriedRecipeCardDTO] {
        struct Response: Decodable { let tried: [TriedRecipeCardDTO] }
        let response: Response = try await APIClient.get("/recipes/tried")
        return response.tried
    }

    static func updateRecipe(_ recipeId: String, _ input: UpdateRecipeInput) async throws {
        try await APIClient.send("/recipes/\(recipeId)", method: .patch, body: input)
    }

    static func publishRecipe(_ recipeId: String, visibility: RecipeVisibilityDTO) async throws {
        struct Body: Encodable { let visibility: RecipeVisibilityDTO }
        try await APIClient.send("/recipes/\(recipeId)/publish", method: .post, body: Body(visibility: visibility))
    }

    static func deleteRecipe(_ recipeId: String) async throws {
        try await APIClient.send("/recipes/\(recipeId)", method: .delete)
    }

    static func dismissJob(_ jobId: String) async throws {
        try await APIClient.send("/recipes/jobs/\(jobId)", method: .delete)
    }

    static func markTried(_ recipeId: String, _ input: MarkTriedInput) async throws {
        try await APIClient.send("/recipes/\(recipeId)/tried", method: .post, body: input)
    }
}
