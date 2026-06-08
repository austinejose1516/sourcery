import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@recipeer/core';

import { Icon, Text } from '@/components/ui';

export interface EndorsementBadgeProps {
  count: number;
  /** Region the endorsements are weighted to, e.g. "Kerala". */
  region?: string | null;
}

/**
 * Authenticity badge — "🎖 18 Kerala" — the region-weighted endorsement count that
 * signals a recipe is vouched for by cooks from where the dish comes from.
 */
export function EndorsementBadge({ count, region }: EndorsementBadgeProps) {
  if (count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Icon name="ribbon" size={15} color="herb" />
      <Text variant="label" color="herb">
        {count}
        {region ? ` ${region}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
});
