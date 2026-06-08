import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '@recipeer/core';

import { Text } from './text';

/** Plain hairline rule. */
export function Hairline() {
  return <View style={styles.hairline} />;
}

/** Labelled "OR" separator used between primary and social actions. */
export function OrDivider({ label = 'OR' }: { label?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text variant="micro" color="textSecondary">
        {label}
      </Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
});
