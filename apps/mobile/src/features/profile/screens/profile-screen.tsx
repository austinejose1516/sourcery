import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '@recipeer/core';

import { FadeInUp } from '@/components/motion/fade-in-up';
import { Button, Screen, Text } from '@/components/ui';
import { useSession, useSignOut } from '@/features/auth/hooks';

export function ProfileScreen() {
  const session = useSession();
  const signOut = useSignOut();
  const firstName = session?.displayName?.split(' ')[0] ?? 'cook';

  return (
    <Screen keyboardAvoiding={false} contentStyle={styles.content}>
      <FadeInUp style={styles.block}>
        <View style={styles.rule} />
        <Text variant="display">Profile</Text>
        <Text variant="body" color="textSecondary">
          Signed in as {firstName}.
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
  block: { flex: 1, justifyContent: 'center', gap: spacing.md },
  rule: { width: 56, height: 2, borderRadius: 2, backgroundColor: colors.accent },
});
