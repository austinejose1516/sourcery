import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import type { RecipeCardDTO } from '@recipeer/core';
import { colors, radius, spacing } from '@recipeer/core';

import { PressableScale, Text } from '@/components/ui';
import { countryToFlag } from '../utils';

export interface MostLovedCardProps {
  recipe: RecipeCardDTO;
}

const CARD_WIDTH = 200;

/** Compact recipe card for the horizontal "most-loved" rail on Cold-start. */
export function MostLovedCard({ recipe }: MostLovedCardProps) {
  const flag = countryToFlag(recipe.region?.country);
  return (
    <PressableScale
      accessibilityRole="button"
      style={styles.card}
      onPress={() => {
        // TODO: navigate to the recipe detail screen (out of scope for this pass).
      }}>
      {recipe.coverImageUrl ? (
        <Image source={recipe.coverImageUrl} style={styles.image} contentFit="cover" transition={200} />
      ) : (
        <View style={[styles.image, styles.imageFallback]} />
      )}
      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {recipe.title}
        </Text>
        {recipe.region ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {flag ? `${flag} ` : ''}
            {recipe.region.name}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  image: { width: '100%', aspectRatio: 3 / 2 },
  imageFallback: { backgroundColor: colors.surfaceMuted },
  body: { padding: spacing.md, gap: 2 },
});
