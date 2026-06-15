import * as Notifications from 'expo-notifications';

// Show a banner even when the app is foregrounded (the user may be on another
// tab when a background extraction finishes).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Fires a local "your recipe is ready" notification, requesting perms if needed. */
export async function notifyRecipeReady(): Promise<void> {
  try {
    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted && current.canAskAgain) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return;
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Your recipe is ready', body: 'Tap to review and publish it.' },
      trigger: null,
    });
  } catch {
    // Notifications are a nicety — never let them break the flow.
  }
}
