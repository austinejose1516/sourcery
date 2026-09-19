import SwiftUI

@main
struct ReciPeerApp: App {
    @State private var session = SessionStore()
    @State private var feed = FeedStore()

    init() {
        // Foreground banners for "recipe ready" local notifications.
        RecipeNotifications.configure()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .environment(feed)
                .task { await session.bootstrap() }
                .onOpenURL { url in
                    // recipeer://youtube-connected — the OAuth deep-link fallback.
                    // The API is the source of truth for connection state; the
                    // connect screen re-checks it on appear, so nothing to do here.
                    _ = url
                }
        }
    }
}
