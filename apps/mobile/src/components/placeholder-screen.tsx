import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '@sourcery/core';

import { FadeInUp } from '@/components/motion/fade-in-up';
import { Screen, Text } from '@/components/ui';

export interface PlaceholderScreenProps {
  title: string;
  subtitle?: string;
}

/**
 * Bare titled screen for the tab destinations we haven't built yet. Styling is
 * intentionally minimal for this phase — just enough to prove navigation.
 */
export function PlaceholderScreen({ title, subtitle }: PlaceholderScreenProps) {
  return (
    <Screen keyboardAvoiding={false} contentStyle={styles.content}>
      <FadeInUp style={styles.block}>
        <View style={styles.rule} />
        <Text variant="display">{title}</Text>
        {subtitle ? (
          <Text variant="body" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  block: { gap: spacing.md },
  rule: { width: 56, height: 2, borderRadius: 2, backgroundColor: colors.accent },
});
