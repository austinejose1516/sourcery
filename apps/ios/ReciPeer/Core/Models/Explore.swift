import Foundation

// MARK: - Explore DTOs (packages/core/src/explore/types.ts)

/// A cook as shown on the Explore › Cooks tab.
struct ExploreCookDTO: Codable, Equatable, Identifiable {
    let id: String
    let username: String
    let displayName: String
    let avatarUrl: String?
    let bio: String?
    let region: FeedRegionDTO?
    /// Cuisine names the cook publishes in, e.g. ["Vietnamese", "Korean"].
    let specialties: [String]
    let recipeCount: Int
    let followerCount: Int
    let isFollowing: Bool
}

/// A curated/editorial collection card on the Explore › Collections tab.
struct CollectionCardDTO: Codable, Equatable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let coverImageUrl: String?
    /// Display name of the curator; nil → render as "Curated by Sourcery".
    let curatedBy: String?
    let recipeCount: Int
    /// Up to three member-recipe covers, for a collage when there's no cover.
    let previewCovers: [String]
}

struct ExploreFilterTag: Codable, Equatable, Identifiable {
    let slug: String
    let name: String
    var id: String { slug }
}

struct ExploreFiltersDTO: Codable, Equatable {
    let dietary: [ExploreFilterTag]
}

/// Holistic search payload — every entity type the search box spans.
struct ExploreSearchResults: Codable, Equatable {
    let recipes: [RecipeCardDTO]
    let cooks: [ExploreCookDTO]
    let collections: [CollectionCardDTO]
}

enum ExploreDifficulty: String, Codable, CaseIterable, Identifiable {
    case easy = "EASY", medium = "MEDIUM", hard = "HARD"
    var id: String { rawValue }
    var label: String {
        switch self {
        case .easy: "Easy"
        case .medium: "Medium"
        case .hard: "Hard"
        }
    }
}

/// Querystring contract for GET /explore/recipes — all optional.
struct ExploreRecipeQuery {
    var q: String?
    var cuisine: String?
    var region: String?
    var difficulty: ExploreDifficulty?
    var maxMinutes: Int?
    var diet: String?

    var queryItems: [URLQueryItem] {
        var items: [URLQueryItem] = []
        if let q, !q.isEmpty { items.append(.init(name: "q", value: q)) }
        if let cuisine { items.append(.init(name: "cuisine", value: cuisine)) }
        if let region { items.append(.init(name: "region", value: region)) }
        if let difficulty { items.append(.init(name: "difficulty", value: difficulty.rawValue)) }
        if let maxMinutes { items.append(.init(name: "maxMinutes", value: String(maxMinutes))) }
        if let diet { items.append(.init(name: "diet", value: diet)) }
        return items
    }
}
