import Foundation

/// Single source of truth for the current session — the SwiftUI equivalent of the
/// zustand auth store + AuthProvider. Hydrated at startup; views read it, never
/// write the session directly. Also feeds fresh bearer tokens to the API layer.
@Observable
@MainActor
final class SessionStore: AuthTokenProvider {
    private(set) var status: AuthStatus = .loading
    private(set) var session: AuthSession?

    private let auth: AuthService

    init(auth: AuthService = SupabaseAuthService()) {
        self.auth = auth
        APIClient.tokenProvider = self
    }

    var isAuthenticated: Bool { status == .authenticated }

    /// Resolve any persisted session at startup.
    func bootstrap() async {
        let resolved = (try? await auth.getSession()) ?? nil
        apply(resolved)
    }

    func signIn(email: String, password: String) async throws {
        apply(try await auth.signIn(email: email, password: password))
    }

    func signUp(name: String, email: String, password: String) async throws {
        apply(try await auth.signUp(name: name, email: email, password: password))
    }

    func sendPasswordReset(email: String) async throws {
        try await auth.sendPasswordReset(email: email)
    }

    func signOut() async throws {
        try await auth.signOut()
        apply(nil)
    }

    private func apply(_ session: AuthSession?) {
        self.session = session
        self.status = session == nil ? .unauthenticated : .authenticated
    }

    // MARK: - AuthTokenProvider

    /// Fresh (auto-refreshed) token from the shared Supabase client.
    nonisolated func accessToken() async -> String? {
        let session = try? await SupabaseManager.client.auth.session
        return session?.accessToken
    }
}
