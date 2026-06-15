import { StyleSheet, View } from 'react-native';
import { spacing } from '@recipeer/core';

import { BackButton, Text } from '@/components/ui';

/** Shared header for the create-recipe flow screens: back button + optional title. */
export function FlowHeader({ title }: { title?: string }) {
  return (
    <View style={styles.header}>
      <BackButton />
      {title ? (
        <Text variant="heading" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.lg },
  title: { flex: 1 },
});
