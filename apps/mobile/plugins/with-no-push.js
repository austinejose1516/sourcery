const { withEntitlementsPlist } = require('@expo/config-plugins');

/**
 * Strip the `aps-environment` (Push Notifications) entitlement that
 * expo-notifications adds during prebuild. We only use LOCAL notifications
 * (scheduleNotificationAsync), which don't need it, and the app is signed with a
 * free/personal Apple team that can't use the Push Notifications capability —
 * so its presence breaks device provisioning. Listed last in app.json plugins so
 * it runs after expo-notifications' entitlement mod.
 */
module.exports = function withNoPush(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
