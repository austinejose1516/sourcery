import Foundation

/// Runtime configuration read from Info.plist (populated from xcconfig).
enum AppConfig {
    private static func info(_ key: String) -> String {
        (Bundle.main.object(forInfoDictionaryKey: key) as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    }

    static var supabaseURL: URL {
        guard let url = URL(string: info("SupabaseURL")) else {
            fatalError("Missing/invalid SupabaseURL — check Config/*.xcconfig")
        }
        return url
    }

    static var supabaseAnonKey: String {
        let key = info("SupabaseAnonKey")
        precondition(!key.isEmpty, "Missing SupabaseAnonKey — check Config/*.xcconfig")
        return key
    }

    /// Base URL of the Hono API (apps/api). Debug → localhost, Release → Railway.
    static var apiBaseURL: URL {
        guard let url = URL(string: info("APIBaseURL")) else {
            fatalError("Missing/invalid APIBaseURL — check Config/*.xcconfig")
        }
        return url
    }
}
