import Foundation

/// Port of the original RN app's api-client.ts — a tiny typed fetch wrapper around
/// the Hono API (apps/api). Centralises the base URL, JSON encoding and error
/// normalisation so feature services stay declarative.
struct ApiError: Error, LocalizedError {
    let message: String
    let status: Int

    var errorDescription: String? { message }
}

enum HTTPMethod: String {
    case get = "GET", post = "POST", patch = "PATCH", delete = "DELETE", put = "PUT"
}

/// Source of the current bearer token. The session store installs itself here so
/// `APIClient` never imports Supabase directly.
protocol AuthTokenProvider: Sendable {
    func accessToken() async -> String?
}

enum APIClient {
    static var tokenProvider: (any AuthTokenProvider)?

    static func get<T: Decodable>(_ path: String, query: [URLQueryItem] = []) async throws -> T {
        try await request(path, method: .get, query: query)
    }

    static func post<T: Decodable>(_ path: String, body: (any Encodable)? = nil) async throws -> T {
        try await request(path, method: .post, anyBody: body)
    }

    static func patch<T: Decodable>(_ path: String, body: (any Encodable)? = nil) async throws -> T {
        try await request(path, method: .patch, anyBody: body)
    }

    static func delete<T: Decodable>(_ path: String, body: (any Encodable)? = nil) async throws -> T {
        try await request(path, method: .delete, anyBody: body)
    }

    /// POST/PATCH/DELETE with no meaningful response body.
    static func send(_ path: String, method: HTTPMethod, body: (any Encodable)? = nil) async throws {
        let _: EmptyResponse = try await request(path, method: method, anyBody: body)
    }

    /// Bearer token for direct uploads / requests outside the JSON wrapper.
    static func authToken() async -> String? {
        await tokenProvider?.accessToken()
    }

    static func url(for path: String, query: [URLQueryItem] = []) -> URL {
        let base = AppConfig.apiBaseURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard var components = URLComponents(string: base + path) else {
            preconditionFailure("Invalid API path: \(path)")
        }
        if !query.isEmpty { components.queryItems = query }
        guard let url = components.url else {
            preconditionFailure("Invalid API URL for path: \(path)")
        }
        return url
    }

    private static func request<T: Decodable>(
        _ path: String,
        method: HTTPMethod,
        body: (any Encodable)? = nil,
        anyBody: (any Encodable)? = nil,
        query: [URLQueryItem] = [],
    ) async throws -> T {
        var request = URLRequest(url: url(for: path, query: query))
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = await authToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let payload = anyBody ?? body
        if let payload {
            request.httpBody = try JSONEncoder().encode(AnyEncodable(payload))
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            // Network-level failure (server down, wrong API URL, no LAN route).
            throw ApiError(
                message: "Couldn't reach the server. Is the API running and the API URL correct?",
                status: 0,
            )
        }

        guard let http = response as? HTTPURLResponse else {
            throw ApiError(message: "Invalid server response.", status: 0)
        }

        guard (200..<300).contains(http.statusCode) else {
            let message = (try? JSONDecoder().decode(ErrorBody.self, from: data).error)
                ?? "Request failed (\(http.statusCode))"
            throw ApiError(message: message, status: http.statusCode)
        }

        return try JSONDecoder().decode(T.self, from: data)
    }
}

private struct ErrorBody: Decodable { let error: String? }
struct EmptyResponse: Decodable {}

/// Type-erased Encodable wrapper so `request` can take `any Encodable`.
private struct AnyEncodable: Encodable {
    private let encodeClosure: (Encoder) throws -> Void
    init(_ wrapped: any Encodable) { encodeClosure = wrapped.encode }
    func encode(to encoder: Encoder) throws { try encodeClosure(encoder) }
}
