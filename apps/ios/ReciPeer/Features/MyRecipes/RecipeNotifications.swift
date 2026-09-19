import Foundation
import UserNotifications

/// Local "your recipe is ready" notification (features/recipes/notifications.ts).
/// Local notifications only — no push entitlement needed.
enum RecipeNotifications {
    /// Show banners even when the app is foregrounded.
    static func configure() {
        let center = UNUserNotificationCenter.current()
        center.delegate = NotificationCenterBridge.shared
    }

    /// Fires a local "your recipe is ready" notification, requesting perms if needed.
    static func notifyRecipeReady() async {
        do {
            let center = UNUserNotificationCenter.current()
            var granted = (try? await center.notificationSettings().authorizationStatus == .authorized)
                ?? false
            if !granted {
                granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
            }
            guard granted else { return }

            let content = UNMutableNotificationContent()
            content.title = "Your recipe is ready"
            content.body = "Tap to review and publish it."
            let request = UNNotificationRequest(
                identifier: "recipe-ready-\(UUID().uuidString)",
                content: content,
                trigger: nil,
            )
            try await center.add(request)
        } catch {
            // Notifications are a nicety — never let them break the flow.
        }
    }
}

/// Foreground presentation delegate — banners show even while the app is open.
final class NotificationCenterBridge: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationCenterBridge()

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void,
    ) {
        completionHandler([.banner, .list])
    }
}
