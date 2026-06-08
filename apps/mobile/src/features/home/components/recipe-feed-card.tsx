import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import type { RecipeCardDTO } from '@recipeer/core';
import { colors, radius, spacing } from '@recipeer/core';

import { PressableScale, Text } from '@/components/ui';
import { regionLabel } from '../utils';
import { Avatar } from './avatar';
import { EndorsementBadge } from './endorsement-badge';
import { FlagChip } from './flag-chip';
import { SaveButton } from './save-button';

export interface RecipeFeedCardProps {
  recipe: RecipeCardDTO;
  onToggleSave: () => void;
}

/** The primary feed card: cover, region chip, bilingual title, author + endorsement. */
export function RecipeFeedCard({ recipe, onToggleSave }: RecipeFeedCardProps) {
  const region = regionLabel(recipe.region);

  return (
    <PressableScale
      accessibilityRole="button"
      style={styles.card}
      onPress={() => {
        // TODO: navigate to the recipe detail screen (out of scope for this pass).
      }}>
      <View style={styles.cover}>
        {recipe.coverImageUrl ? (
          <Image source={recipe.coverImageUrl} style={styles.image} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.image, styles.imageFallback]} />
        )}
        {recipe.region ? (
          <View style={styles.chipSlot}>
            <FlagChip country={recipe.region.country} label={region ?? recipe.region.name} />
          </View>
        ) : null}
        <View style={styles.saveSlot}>
          <SaveButton saved={recipe.isSaved} onPress={onToggleSave} />
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.titleBlock}>
          <Text variant="heading" numberOfLines={2}>
            {recipe.title}
          </Text>
          {recipe.titleOriginal && recipe.titleOriginal !== recipe.title ? (
            <Text variant="caption" color="textSecondary">
              {recipe.titleOriginal}
            </Text>
          ) : null}
        </View>

        {recipe.description ? (
          <Text variant="body" color="textSecondary" numberOfLines={2}>
            {recipe.description}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.author}>
            <Avatar uri={recipe.author.avatarUrl} name={recipe.author.displayName} size={28} />
            <Text variant="label" numberOfLines={1}>
              {recipe.author.displayName}
            </Text>
          </View>
          <EndorsementBadge count={recipe.endorsementCount} region={recipe.region?.name} />
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cover: { position: 'relative' },
  image: { width: '100%', aspectRatio: 4 / 3 },
  imageFallback: { backgroundColor: colors.surfaceMuted },
  chipSlot: { position: 'absolute', top: spacing.md, left: spacing.md },
  saveSlot: { position: 'absolute', top: spacing.md, right: spacing.md },
  body: { padding: spacing.lg, gap: spacing.sm },
  titleBlock: { gap: spacing.xs },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  author: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
});
