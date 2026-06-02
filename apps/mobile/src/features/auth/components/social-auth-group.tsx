import { Alert, StyleSheet, View } from 'react-native';
import { spacing } from '@sourcery/core';

import { OrDivider, SocialButton, type SocialProvider } from '@/components/ui';

export interface SocialAuthGroupProps {
  providers?: SocialProvider[];
}

/**
 * "OR" divider followed by third-party sign-in buttons. Social auth is stubbed
 * for now — pressing a provider explains it's coming soon. When it's wired up,
 * replace `notifyComingSoon` with the real OAuth calls.
 */
export function SocialAuthGroup({ providers = ['apple', 'google'] }: SocialAuthGroupProps) {
  const notifyComingSoon = () =>
    Alert.alert('Coming soon', 'Social sign-in isn’t available just yet — use your email for now.');

  return (
    <View style={styles.container}>
      <OrDivider />
      {providers.map((provider) => (
        <SocialButton key={provider} provider={provider} onPress={notifyComingSoon} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
});
