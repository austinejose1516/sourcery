import { StyleSheet, View } from 'react-native';
import type { SuggestedCookDTO } from '@recipeer/core';
import { colors, radius, spacing } from '@recipeer/core';

import { Icon, PressableScale, Text } from '@/components/ui';
import { countryToFlag, regionLabel } from '../utils';
import { Avatar } from './avatar';

export interface SuggestedCookRowProps {
  cook: SuggestedCookDTO;
  pending: boolean;
  onToggleFollow: () => void;
}

/** A cook on the Cold-start screen with an inline Follow toggle. */
export function SuggestedCookRow({ cook, pending, onToggleFollow }: SuggestedCookRowProps) {
  const flag = countryToFlag(cook.region?.country);
  const place = regionLabel(cook.region);
  return (
    <View style={styles.row}>
      <Avatar uri={cook.avatarUrl} name={cook.displayName} size={48} />
      <View style={styles.meta}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {cook.displayName}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {flag ? `${flag} ` : ''}
          {place ?? '—'} · {cook.recipeCount} {cook.recipeCount === 1 ? 'recipe' : 'recipes'}
        </Text>
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ selected: cook.isFollowing, busy: pending }}
        onPress={onToggleFollow}
        style={[styles.follow, cook.isFollowing ? styles.following : styles.notFollowing]}>
        {cook.isFollowing ? <Icon name="checkmark" size={15} color="textPrimary" /> : null}
        <Text variant="label" color={cook.isFollowing ? 'textPrimary' : 'onPrimary'}>
          {cook.isFollowing ? 'Following' : 'Follow'}
        </Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  meta: { flex: 1, gap: 2 },
  follow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  notFollowing: { backgroundColor: colors.primary },
  following: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
