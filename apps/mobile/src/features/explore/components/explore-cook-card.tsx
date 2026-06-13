import { Image } from 'expo-image';
import { Share, StyleSheet, View } from 'react-native';
import type { ExploreCookDTO } from '@recipeer/core';
import { colors, radius, spacing } from '@recipeer/core';

import { Hairline, Icon, type IconName, PressableScale, Text } from '@/components/ui';
import { countryToFlag, regionLabel } from '@/features/home/utils';

export interface ExploreCookCardProps {
  cook: ExploreCookDTO;
  pending: boolean;
  onToggleFollow: () => void;
}

/** Compact follower count, e.g. 5400 → "5.4k". */
function compact(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}k`;
}

/** A secondary icon action (Share / Comment) in the card's action row. */
function ActionButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.action}>
      <Icon name={icon} size={18} color="textSecondary" />
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * A cook card for the Explore › Cooks tab: a rounded cover photo + content on
 * top, with a Follow / Share / Comment action row beneath.
 */
export function ExploreCookCard({ cook, pending, onToggleFollow }: ExploreCookCardProps) {
  const flag = countryToFlag(cook.region?.country);
  const place = regionLabel(cook.region);

  const onShare = () => {
    Share.share({ message: `Check out ${cook.displayName} on Sourcery` }).catch(() => {
      // User dismissed the share sheet — nothing to do.
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        {cook.avatarUrl ? (
          <Image source={cook.avatarUrl} style={styles.image} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Text variant="title" color="textSecondary">
              {cook.displayName.trim().charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}

        <View style={styles.content}>
          <Text variant="heading" numberOfLines={1}>
            {cook.displayName}
          </Text>
          {place ? (
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {flag ? `${flag} ` : ''}
              {place}
            </Text>
          ) : null}
          <Text variant="caption" color="textSecondary">
            {cook.recipeCount} {cook.recipeCount === 1 ? 'recipe' : 'recipes'} ·{' '}
            {compact(cook.followerCount)} followers
          </Text>
        </View>
      </View>

      <Hairline />

      <View style={styles.actions}>
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

        <ActionButton icon="share-outline" label="Share" onPress={onShare} />
        <ActionButton
          icon="chatbubble-outline"
          label="Comment"
          onPress={() => {
            // TODO: open the cook's profile / comment thread (out of scope for this pass).
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  // Top: rounded photo (stretched to the content's height) beside the text.
  top: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.md },
  image: { width: 88, alignSelf: 'stretch', minHeight: 88, borderRadius: radius.md },
  imageFallback: { backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: spacing.xs, justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  follow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  notFollowing: { backgroundColor: colors.primary },
  following: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
