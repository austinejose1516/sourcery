import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CollectionCardDTO } from '@recipeer/core';
import { colors, radius, spacing } from '@recipeer/core';

import { PressableScale, Text } from '@/components/ui';

export interface CollectionCardProps {
  collection: CollectionCardDTO;
}

/** Full-width collection card with the title + meta overlaid on the cover. */
export function CollectionCard({ collection }: CollectionCardProps) {
  const cover = collection.coverImageUrl ?? collection.previewCovers[0] ?? null;
  const curator = collection.curatedBy ?? 'Curated by Sourcery';
  return (
    <PressableScale
      accessibilityRole="button"
      style={styles.card}
      onPress={() => {
        // TODO: navigate to the collection detail screen (out of scope for this pass).
      }}>
      {cover ? (
        <Image source={cover} style={styles.image} contentFit="cover" transition={200} />
      ) : (
        <View style={[styles.image, styles.imageFallback]} />
      )}

      {/* Dark gradient so the cream text stays legible over any cover photo. */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.65)']}
        locations={[0.35, 1]}
        style={styles.scrim}
      />

      <View style={styles.overlay}>
        <Text variant="heading" color="textInverse" numberOfLines={1}>
          {collection.title}
        </Text>
        <Text variant="micro" color="textInverse" numberOfLines={1} style={styles.meta}>
          {curator} · {collection.recipeCount} {collection.recipeCount === 1 ? 'recipe' : 'recipes'}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  image: { width: '100%', aspectRatio: 16 / 9 },
  imageFallback: { backgroundColor: colors.surfaceMuted },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' },
  overlay: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg, gap: 2 },
  meta: { opacity: 0.9 },
});
