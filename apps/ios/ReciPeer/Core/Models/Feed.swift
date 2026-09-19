import Foundation

// MARK: - Feed DTOs (packages/core/src/feed/types.ts)

struct FeedAuthorDTO: Codable, Equatable, Identifiable {
    let id: String
    let username: String
    let displayName: String
    let avatarUrl: String?
    /// ISO-3166 alpha-2 — render as a flag emoji.
    let country: String?

    var flagEmoji: String? { Self.flagEmoji(for: country) }

    static func flagEmoji(for country: String?) -> String? {
        guard let country, country.count == 2 else { return nil }
        let base: UInt32 = 127397
        var s = ""
        for scalar in country.uppercased().unicodeScalars {
            guard let flag = UnicodeScalar(base + scalar.value) else { return nil }
            s.unicodeScalars.append(flag)
        }
        return s
    }
}

struct FeedCuisineDTO: Codable, Equatable {
    let name: String
    let slug: String
}

struct FeedRegionDTO: Codable, Equatable {
    let name: String
    let country: String

    var flagEmoji: String? { FeedAuthorDTO.flagEmoji(for: country) }
}

/// A recipe card in the timeline / most-loved rail.
struct RecipeCardDTO: Codable, Equatable, Identifiable {
    let id: String
    let title: String
    let titleOriginal: String?
    let description: String?
    let cuisine: FeedCuisineDTO?
    let region: FeedRegionDTO?
    let author: FeedAuthorDTO
    let coverImageUrl: String?
    let endorsementCount: Int
    let saveCount: Int
    let isSaved: Bool
}

/// A "tried this" social post in the timeline.
struct TriedThisCardDTO: Codable, Equatable, Identifiable {
    struct PostRecipe: Codable, Equatable {
        struct PostRecipeAuthor: Codable, Equatable { let displayName: String }
        let id: String
        let title: String
        let author: PostRecipeAuthor
    }

    let id: String
    let user: FeedAuthorDTO
    let note: String?
    let photoUrl: String?
    /// ISO timestamp; render as a relative "· 2h".
    let createdAt: String
    let recipe: PostRecipe
    let likeCount: Int
    let commentCount: Int
    let isLiked: Bool
}

struct PostCommentDTO: Codable, Equatable, Identifiable {
    let id: String
    let user: FeedAuthorDTO
    let body: String
    let createdAt: String
}

/// Discriminated union for the mixed Following timeline.
enum FeedItem: Codable, Equatable, Identifiable {
    case recipe(RecipeCardDTO)
    case tried(TriedThisCardDTO)

    var id: String {
        switch self {
        case .recipe(let card): "recipe-\(card.id)"
        case .tried(let post): "tried-\(post.id)"
        }
    }

    private enum Kind: String, Codable { case recipe, tried }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let kind = try container.decode(Kind.self, forKey: .kind)
        switch kind {
        case .recipe: self = .recipe(try RecipeCardDTO(from: decoder))
        case .tried: self = .tried(try TriedThisCardDTO(from: decoder))
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .recipe(let card):
            try container.encode(Kind.recipe, forKey: .kind)
            try card.encode(to: encoder)
        case .tried(let post):
            try container.encode(Kind.tried, forKey: .kind)
            try post.encode(to: encoder)
        }
    }

    private enum CodingKeys: String, CodingKey { case kind }
}

/// A cook surfaced on the Cold-start screen.
struct SuggestedCookDTO: Codable, Equatable, Identifiable {
    let id: String
    let displayName: String
    let avatarUrl: String?
    let region: FeedRegionDTO?
    let recipeCount: Int
    let isFollowing: Bool
}

/// The three top-of-feed segments.
enum FeedTab: String, CaseIterable, Identifiable {
    case tonight, following, trending
    var id: String { rawValue }
    var label: String {
        switch self {
        case .tonight: "Tonight"
        case .following: "Following"
        case .trending: "Trending"
        }
    }
}
