import Foundation

/// Feed endpoints (features/home/api.ts).
enum FeedService {
    private struct ItemsResponse: Decodable { let items: [FeedItem] }
    private struct CooksResponse: Decodable { let cooks: [SuggestedCookDTO] }
    private struct RecipesResponse: Decodable { let recipes: [RecipeCardDTO] }

    static func fetchFeed(_ tab: FeedTab) async throws -> [FeedItem] {
        let path: String
        switch tab {
        case .tonight: path = "/feed/tonight"
        case .following: path = "/feed/following"
        case .trending: path = "/feed/trending"
        }
        let response: ItemsResponse = try await APIClient.get(path)
        return response.items
    }

    static func fetchSuggestions() async throws -> [SuggestedCookDTO] {
        let response: CooksResponse = try await APIClient.get("/feed/suggestions")
        return response.cooks
    }

    static func fetchMostLoved() async throws -> [RecipeCardDTO] {
        let response: RecipesResponse = try await APIClient.get("/feed/most-loved")
        return response.recipes
    }
}

/// Social mutations shared by home + explore (/social/* contract).
enum SocialService {
    private struct IdBody: Encodable {
        var followingId: String?
        var recipeId: String?
        var postId: String?
        var body: String?
    }

    static func follow(_ cookId: String) async throws {
        try await APIClient.send("/social/follow", method: .post, body: IdBody(followingId: cookId))
    }

    static func unfollow(_ cookId: String) async throws {
        try await APIClient.send("/social/follow", method: .delete, body: IdBody(followingId: cookId))
    }

    static func save(_ recipeId: String) async throws {
        try await APIClient.send("/social/save", method: .post, body: IdBody(recipeId: recipeId))
    }

    static func unsave(_ recipeId: String) async throws {
        try await APIClient.send("/social/save", method: .delete, body: IdBody(recipeId: recipeId))
    }

    static func like(_ postId: String) async throws {
        try await APIClient.send("/social/like", method: .post, body: IdBody(postId: postId))
    }

    static func unlike(_ postId: String) async throws {
        try await APIClient.send("/social/like", method: .delete, body: IdBody(postId: postId))
    }

    static func fetchComments(_ postId: String) async throws -> [PostCommentDTO] {
        struct Response: Decodable { let comments: [PostCommentDTO] }
        let response: Response = try await APIClient.get(
            "/social/comments",
            query: [URLQueryItem(name: "postId", value: postId)],
        )
        return response.comments
    }

    static func addComment(_ postId: String, body: String) async throws {
        try await APIClient.send("/social/comments", method: .post, body: IdBody(postId: postId, body: body))
    }

    static func createPost(recipeId: String, note: String?) async throws {
        struct Input: Encodable { let recipeId: String; let note: String? }
        try await APIClient.send("/social/posts", method: .post, body: Input(recipeId: recipeId, note: note))
    }
}
