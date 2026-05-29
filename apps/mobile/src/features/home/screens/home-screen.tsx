import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '@sourcery/core';

import { FadeInUp } from '@/components/motion/fade-in-up';
import { Button, Screen, Text } from '@/components/ui';
import { useSession, useSignOut } from '@/features/auth/hooks';

/** Placeholder authenticated landing — proves the full flow end-to-end. */
export function HomeScreen() {
  const session = useSession();
  const signOut = useSignOut();
  const firstName = session?.displayName?.split(' ')[0] ?? 'cook';

  return (
    <Screen keyboardAvoiding={false} contentStyle={styles.content}>
      <FadeInUp style={styles.hero}>
        <View style={styles.rule} />
        <Text variant="display">Welcome, {firstName}.</Text>
        <Text variant="body" color="textSecondary">
          Your kitchen is set up. Recipes, cooks to follow, and your feed will live here.
        </Text>
      </FadeInUp>

      <FadeInUp delay={120}>
        <Button
          label="Sign out"
          variant="secondary"
          onPress={() => signOut.mutate()}
          loading={signOut.isPending}
        />
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'space-between', paddingVertical: spacing.xxxl },
  hero: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  rule: { width: 56, height: 2, borderRadius: 2, backgroundColor: colors.accent },
});
