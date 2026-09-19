import Foundation
import AuthenticationServices
import UIKit

// MARK: - DTOs (features/youtube/api.ts)

/// Whether the viewer already pulled this video in, or is pulling it now.
enum ImportState: String, Codable {
    case none = "NONE"
    case importing = "IMPORTING"
    case imported = "IMPORTED"
}

struct YouTubeVideoDTO: Codable, Equatable, Identifiable {
    let videoId: String
    let title: String
    let thumbnailUrl: String?
    let durationSec: Int
    let viewCount: Int
    let publishedAt: String
    /// 'public' | 'unlisted' | 'private'
    let privacyStatus: String
    let importState: ImportState

    var id: String { videoId }
}

enum YouTubeConnection: Equatable {
    case disconnected
    case connected(
        channelTitle: String,
        channelHandle: String?,
        channelThumbUrl: String?,
        videoCount: Int,
    )

    var isConnected: Bool {
        if case .connected = self { return true }
        return false
    }
}

struct VideoPage: Codable, Equatable {
    let videos: [YouTubeVideoDTO]
    let nextPageToken: String?
}

struct ImportResultDTO: Decodable {
    struct Item: Decodable {
        let videoId: String
        let jobId: String?
        let recipeId: String?
        let deduped: Bool
    }
    let imported: [Item]
}

// MARK: - Service

/// YouTube connect + uploads endpoints (features/youtube/api.ts).
enum YouTubeService {
    private struct ConnectionWrapper: Decodable {
        let connected: Bool
        let channelTitle: String?
        let channelHandle: String?
        let channelThumbUrl: String?
        let videoCount: Int?

        var connection: YouTubeConnection {
            connected
                ? .connected(
                    channelTitle: channelTitle ?? "",
                    channelHandle: channelHandle,
                    channelThumbUrl: channelThumbUrl,
                    videoCount: videoCount ?? 0,
                )
                : .disconnected
        }
    }

    static func fetchConnection() async throws -> YouTubeConnection {
        let response: ConnectionWrapper = try await APIClient.get("/youtube/connection")
        return response.connection
    }

    static func disconnect() async throws {
        try await APIClient.send("/youtube/connection", method: .delete)
    }

    static func fetchUploads(pageToken: String?) async throws -> VideoPage {
        var query: [URLQueryItem] = []
        if let pageToken { query.append(.init(name: "pageToken", value: pageToken)) }
        return try await APIClient.get("/youtube/videos", query: query)
    }

    static func importVideos(_ videoIds: [String]) async throws -> ImportResultDTO {
        struct Body: Encodable { let videoIds: [String] }
        return try await APIClient.post("/youtube/import", body: Body(videoIds: videoIds))
    }

    static func startOAuth() async throws -> URL {
        struct Response: Decodable { let authUrl: String }
        let response: Response = try await APIClient.post("/youtube/oauth/start")
        guard let url = URL(string: response.authUrl) else {
            throw ApiError(message: "Invalid OAuth URL from the server.", status: 0)
        }
        return url
    }
}

// MARK: - OAuth session helper

/// Opens Google's consent screen in an ASWebAuthenticationSession. Google refuses
/// embedded webviews, so this must be a real auth session (hooks.ts useConnectYouTube).
enum OAuthSession {
    /// Where the API's OAuth callback redirects. Must match
    /// YOUTUBE_OAUTH_APP_RETURN_URL on the server exactly.
    static let returnUrl = "recipeer://youtube-connected"

    nonisolated(unsafe) private static var liveSession: ASWebAuthenticationSession?
    nonisolated(unsafe) private static let anchor = OAuthAnchor()

    /// Presents the session and returns the final callback URL (nil = dismissed).
    @MainActor
    static func open(_ authURL: URL) async -> URL? {
        await withCheckedContinuation { (continuation: CheckedContinuation<URL?, Never>) in
            let session = ASWebAuthenticationSession(
                url: authURL,
                callbackURLScheme: "recipeer",
            ) { callbackURL, _ in
                liveSession = nil
                continuation.resume(returning: callbackURL)
            }
            session.presentationContextProvider = anchor
            session.prefersEphemeralWebBrowserSession = false
            liveSession?.cancel()
            liveSession = session
            session.start()
        }
    }

    /// status=ok / status=error(&reason=…) from the callback URL.
    static func callbackStatus(_ url: URL?) -> (status: String?, reason: String?) {
        guard let url, let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return (nil, nil)
        }
        let items = components.queryItems ?? []
        return (
            items.first { $0.name == "status" }?.value,
            items.first { $0.name == "reason" }?.value,
        )
    }
}

/// Turn the callback's `reason` query param into something a person can act on.
func describeOAuthError(_ reason: String) -> String {
    switch reason {
    case "access_denied": "You cancelled the Google sign-in."
    case "channel_already_connected": "That YouTube channel is already connected to another account."
    case "invalid_state", "expired_state": "That sign-in attempt timed out. Please try again."
    default: reason.isEmpty ? "Could not connect your YouTube account." : reason
    }
}

/// Key-window anchor for the auth-session presentation.
private final class OAuthAnchor: NSObject, ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}
