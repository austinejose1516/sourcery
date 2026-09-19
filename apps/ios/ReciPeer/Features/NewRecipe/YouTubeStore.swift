import Foundation

/// Videos one batch may import. Mirrors MAX_BATCH in apps/api routes/youtube.ts.
let maxImportBatch = 5

/// Connection + paginated uploads + import actions (features/youtube/hooks.ts).
@Observable
@MainActor
final class YouTubeStore {
    var connection: YouTubeConnection?
    var connectionStatus: LoadStatus = .idle

    var videos: [YouTubeVideoDTO] = []
    var uploadsStatus: LoadStatus = .idle
    private var nextPageToken: String?
    private var loadingMore = false
    private var uploadsEnabled = false

    var selected: Set<String> = []
    var importing = false
    var connectError: String?
    var connecting = false

    var isBatchFull: Bool { selected.count >= maxImportBatch }

    func loadConnection() async {
        connectionStatus = .loading
        do {
            connection = try await YouTubeService.fetchConnection()
            connectionStatus = .loaded
            uploadsEnabled = connection?.isConnected == true
        } catch {
            connectionStatus = .failed((error as? ApiError)?.message ?? "Could not check the connection.")
        }
    }

    func loadUploads() async {
        guard uploadsEnabled else { return }
        if !videos.isEmpty { return }
        uploadsStatus = .loading
        do {
            let page = try await YouTubeService.fetchUploads(pageToken: nil)
            videos = page.videos
            nextPageToken = page.nextPageToken
            uploadsStatus = .loaded
        } catch {
            uploadsStatus = .failed((error as? ApiError)?.message ?? "Could not load your uploads.")
        }
    }

    func loadMore() async {
        guard uploadsEnabled, let token = nextPageToken, !loadingMore else { return }
        loadingMore = true
        defer { loadingMore = false }
        if let page = try? await YouTubeService.fetchUploads(pageToken: token) {
            videos += page.videos
            nextPageToken = page.nextPageToken
        }
    }

    func toggle(_ videoId: String) {
        if selected.contains(videoId) {
            selected.remove(videoId)
        } else if selected.count < maxImportBatch {
            selected.insert(videoId)
        }
    }

    /// "Select all" fills to the cap rather than selecting every upload.
    func selectAllOrClear(selectable: [YouTubeVideoDTO]) {
        if !selected.isEmpty {
            selected = []
        } else {
            selected = Set(selectable.prefix(maxImportBatch).map(\.videoId))
        }
    }

    // MARK: Actions

    /// Opens Google consent; resolves whether the channel ended up connected.
    func connect() async -> Bool {
        connecting = true
        connectError = nil
        defer { connecting = false }
        do {
            let authURL = try await YouTubeService.startOAuth()
            let callback = await OAuthSession.open(authURL)
            let (status, reason) = OAuthSession.callbackStatus(callback)
            if status == "error" {
                connectError = describeOAuthError(reason ?? "")
                return false
            }
            // Dismissed, cancelled, or deep-linked: ask the API for the truth.
            connection = try await YouTubeService.fetchConnection()
            uploadsEnabled = connection?.isConnected == true
            return connection?.isConnected == true
        } catch let error as ApiError {
            connectError = error.message
            return false
        } catch {
            connectError = "Could not connect."
            return false
        }
    }

    func disconnect() async {
        try? await YouTubeService.disconnect()
        connection = .disconnected
        uploadsEnabled = false
        videos = []
        selected = []
    }

    func importSelected() async throws {
        importing = true
        defer { importing = false }
        _ = try await YouTubeService.importVideos(Array(selected))
        selected = []
        // Re-badge imported rows.
        nextPageToken = nil
        if let page = try? await YouTubeService.fetchUploads(pageToken: nil) {
            videos = page.videos
            nextPageToken = page.nextPageToken
        }
    }
}

/// Why a row can't be picked (video-row.tsx blockedReason).
func blockedReason(_ video: YouTubeVideoDTO) -> String? {
    switch video.importState {
    case .imported: "Already imported"
    case .importing: "Importing…"
    case .none:
        video.privacyStatus == "public" ? nil : "\(video.privacyStatus) videos can't be imported"
    }
}

/// `PT14M2S`-style seconds → `14:02`; hours get a leading `1:`.
func formatDuration(_ totalSeconds: Int) -> String {
    let h = totalSeconds / 3600
    let m = (totalSeconds % 3600) / 60
    let s = totalSeconds % 60
    return h > 0 ? "\(h):\(String(format: "%02d", m)):\(String(format: "%02d", s))"
        : "\(m):\(String(format: "%02d", s))"
}

/// 8_248 → `8.2k`, 1_200_000 → `1.2M`.
func formatViews(_ views: Int) -> String {
    if views >= 1_000_000 {
        return trim(String(format: "%.1f", Double(views) / 1_000_000)) + "M"
    }
    if views >= 1_000 {
        return trim(String(format: "%.1f", Double(views) / 1_000)) + "k"
    }
    return String(views)
}

private func trim(_ s: String) -> String {
    s.hasSuffix(".0") ? String(s.dropLast(2)) : s
}
