import Foundation

/// Explore endpoints (features/explore/api.ts).
enum ExploreService {
    private struct RecipesResponse: Decodable { let recipes: [RecipeCardDTO] }
    private struct CooksResponse: Decodable { let cooks: [ExploreCookDTO] }
    private struct CollectionsResponse: Decodable { let collections: [CollectionCardDTO] }

    static func fetchRecipes(_ query: ExploreRecipeQuery) async throws -> [RecipeCardDTO] {
        let response: RecipesResponse = try await APIClient.get("/explore/recipes", query: query.queryItems)
        return response.recipes
    }

    static func fetchCooks(_ q: String? = nil) async throws -> [ExploreCookDTO] {
        var items: [URLQueryItem] = []
        if let q, !q.isEmpty { items.append(.init(name: "q", value: q)) }
        let response: CooksResponse = try await APIClient.get("/explore/cooks", query: items)
        return response.cooks
    }

    static func fetchCollections() async throws -> [CollectionCardDTO] {
        let response: CollectionsResponse = try await APIClient.get("/explore/collections")
        return response.collections
    }

    static func fetchFilters() async throws -> ExploreFiltersDTO {
        try await APIClient.get("/explore/filters")
    }

    static func search(_ q: String) async throws -> ExploreSearchResults {
        try await APIClient.get("/explore/search", query: [URLQueryItem(name: "q", value: q)])
    }
}
