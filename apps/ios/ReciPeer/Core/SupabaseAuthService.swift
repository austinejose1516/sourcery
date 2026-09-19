import Foundation
import Supabase

/// Shared Supabase client for the whole app. Auth state lives in `SessionStore`;
/// this client also serves fresh (auto-refreshed) access tokens to the API layer.
enum SupabaseManager {
    static let client = SupabaseClient(
        supabaseURL: AppConfig.supabaseURL,
        supabaseKey: AppConfig.supabaseAnonKey,
    )
}

/// Supabase-backed `AuthService`. Normalizes provider errors onto `AuthError`
/// codes, mirroring services/auth/supabase-auth.ts.
final class SupabaseAuthService: AuthService {
    private let client: SupabaseClient

    init(client: SupabaseClient = SupabaseManager.client) {
        self.client = client
    }

    static func toSession(_ user: User) -> AuthSession {
        let meta = user.userMetadata
        let displayName =
            (meta["name"]?.stringValue).flatMap { $0.isEmpty ? nil : $0 }
            ?? (meta["full_name"]?.stringValue).flatMap { $0.isEmpty ? nil : $0 }
        return AuthSession(userId: user.id.uuidString, email: user.email, displayName: displayName)
    }

    private static func normalize(_ error: Error) -> AuthError {
        if let authError = error as? AuthError { return authError }
        let raw = String(describing: error).lowercased()
        let description = (error as NSError).localizedDescription.lowercased()

        if raw.contains("invalid_credentials") || raw.contains("invalid login") {
            return AuthError(code: .invalidCredentials, message: "That email or password doesn't look right.")
        }
        if raw.contains("user_already_exists") || raw.contains("email_exists") || raw.contains("already registered") {
            return AuthError(code: .emailTaken, message: "An account with this email already exists.")
        }
        if raw.contains("weak_password") || (raw.contains("password") && raw.contains("weak")) {
            return AuthError(code: .weakPassword, message: "Please choose a stronger password.")
        }
        if raw.contains("email_not_confirmed") || raw.contains("not confirmed") {
            return AuthError(code: .emailNotConfirmed, message: "Please confirm your email, then sign in.")
        }
        if description.contains("network") || raw.contains("network") || raw.contains("offline") {
            return AuthError(code: .network, message: "Network problem — check your connection and try again.")
        }
        return AuthError(code: .unknown, message: "Something went wrong. Please try again.")
    }

    func getSession() async throws -> AuthSession? {
        do {
            let session = try await client.auth.session
            return Self.toSession(session.user)
        } catch {
            // No persisted session — treat as signed out rather than an error.
            return nil
        }
    }

    func signUp(name: String, email: String, password: String) async throws -> AuthSession {
        do {
            let response = try await client.auth.signUp(
                email: email,
                password: password,
                data: ["name": .string(name)],
            )
            guard let session = response.session else {
                // "Confirm email" enabled — no session yet.
                throw AuthError(
                    code: .emailNotConfirmed,
                    message: "Almost there — check your email to confirm your account, then sign in.",
                )
            }
            return Self.toSession(session.user)
        } catch let error as AuthError {
            throw error
        } catch {
            throw Self.normalize(error)
        }
    }

    func signIn(email: String, password: String) async throws -> AuthSession {
        do {
            let session = try await client.auth.signIn(email: email, password: password)
            return Self.toSession(session.user)
        } catch {
            throw Self.normalize(error)
        }
    }

    func sendPasswordReset(email: String) async throws {
        do {
            try await client.auth.resetPasswordForEmail(email)
        } catch {
            throw Self.normalize(error)
        }
    }

    func signOut() async throws {
        do {
            try await client.auth.signOut()
        } catch {
            throw Self.normalize(error)
        }
    }
}

extension AnyJSON {
    var stringValue: String? {
        if case .string(let value) = self { return value }
        return nil
    }
}
