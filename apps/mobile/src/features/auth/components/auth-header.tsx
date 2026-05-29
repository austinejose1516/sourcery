import { StyleSheet, View } from 'react-native';
import { spacing } from '@sourcery/core';

import { Text } from '@/components/ui';

export interface AuthHeaderProps {
  title: string;
  subtitle?: string;
}

/** Shared title + subtitle block so every auth screen reads with one voice. */
export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <View style={styles.container}>
      <Text variant="title">{title}</Text>
      {subtitle ? (
        <Text variant="body" color="textSecondary" style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  subtitle: { maxWidth: 340 },
});
