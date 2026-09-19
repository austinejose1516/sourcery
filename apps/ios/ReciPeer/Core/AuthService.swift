import Foundation

/// The app's normalized notion of a signed-in user.
struct AuthSession: Equatable {
    let userId: String
    let email: String?
    let displayName: String?
}

enum AuthErrorCode {
    case invalidCredentials
    case emailTaken
    case weakPassword
    case emailNotConfirmed
    case network
    case unknown
}

/// Normalized, provider-independent error so the UI can branch on `code`.
struct AuthError: Error, LocalizedError {
    let code: AuthErrorCode
    let message: String
    var errorDescription: String? { message }
}

enum AuthStatus {
    /// Until the persisted session has been resolved at startup.
    case loading
    case authenticated
    case unauthenticated
}

/// Backend-agnostic auth contract. The session store depends only on this port —
/// swapping providers means one new implementation, mirroring services/auth/types.ts.
protocol AuthService {
    func getSession() async throws -> AuthSession?
    func signUp(name: String, email: String, password: String) async throws -> AuthSession
    func signIn(email: String, password: String) async throws -> AuthSession
    func sendPasswordReset(email: String) async throws
    func signOut() async throws
}
