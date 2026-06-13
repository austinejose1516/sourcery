import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import type { RecipeCardDTO } from '@recipeer/core';
import { colors, radius, spacing } from '@recipeer/core';

import { PressableScale, Text } from '@/components/ui';
import { Avatar } from '@/features/home/components/avatar';
import { FlagChip } from '@/features/home/components/flag-chip';
import { SaveButton } from '@/features/home/components/save-button';
import { regionLabel } from '@/features/home/utils';

export interface RecipeGridCardProps {
  recipe: RecipeCardDTO;
  onToggleSave: () => void;
}

/** Compact recipe card for the 2-column Explore grid. */
export function RecipeGridCard({ recipe, onToggleSave }: RecipeGridCardProps) {
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
        <Text variant="bodyStrong" numberOfLines={2}>
          {recipe.title}
        </Text>
        <View style={styles.author}>
          <Avatar uri={recipe.author.avatarUrl} name={recipe.author.displayName} size={20} />
          <Text variant="micro" color="textSecondary" numberOfLines={1} style={styles.authorName}>
            {recipe.author.displayName}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cover: { position: 'relative' },
  image: { width: '100%', aspectRatio: 1 },
  imageFallback: { backgroundColor: colors.surfaceMuted },
  // Stop short of the save button (36px) at the top-right so they don't overlap.
  chipSlot: { position: 'absolute', top: spacing.sm, left: spacing.sm, right: 48 },
  saveSlot: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  body: { padding: spacing.md, gap: spacing.sm },
  author: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  authorName: { flexShrink: 1 },
});
