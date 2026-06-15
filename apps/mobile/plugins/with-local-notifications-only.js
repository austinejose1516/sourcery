const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Strips the `aps-environment` (Push Notifications) entitlement that the
 * expo-notifications config plugin adds by default.
 *
 * We only use *local* notifications, which do not require this capability.
 * Leaving it in breaks signing on a free/personal Apple team, which cannot
 * provision the Push Notifications capability. Add this plugin AFTER
 * "expo-notifications" in app.json so it removes what that plugin added.
 *
 * If/when we move to real push notifications (paid Apple Developer account),
 * remove this plugin so the entitlement is generated again.
 */
module.exports = function withLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
