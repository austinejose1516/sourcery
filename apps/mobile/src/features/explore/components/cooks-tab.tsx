import { FlatList, StyleSheet } from 'react-native';
import { sizing, spacing } from '@recipeer/core';

import { Text } from '@/components/ui';
import { FeedEmpty, FeedError, FeedSkeleton } from '@/features/home/components';
import { useExploreCooks, useExploreToggleFollow } from '../hooks';
import { ExploreCookCard } from './explore-cook-card';

/** Cooks sub-tab: a list of rich cook cards, personalised to the viewer. */
export function CooksTab() {
  const cooks = useExploreCooks();
  const toggleFollow = useExploreToggleFollow();

  if (cooks.isLoading) return <FeedSkeleton />;
  if (cooks.isError) {
    return <FeedError message={(cooks.error as Error)?.message} onRetry={() => cooks.refetch()} />;
  }

  return (
    <FlatList
      data={cooks.data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ExploreCookCard
          cook={item}
          pending={toggleFollow.isPending}
          onToggleFollow={() => toggleFollow.mutate({ cookId: item.id, isFollowing: item.isFollowing })}
        />
      )}
      ListHeaderComponent={
        <Text variant="caption" color="textSecondary" style={styles.intro}>
          Cooks who specialise in the food you love.
        </Text>
      }
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={<FeedEmpty message="No cooks to show yet." />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
    maxWidth: sizing.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  intro: { paddingBottom: spacing.xs },
});
