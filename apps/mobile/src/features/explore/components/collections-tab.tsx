import { FlatList, StyleSheet } from 'react-native';
import { sizing, spacing } from '@recipeer/core';

import { Text } from '@/components/ui';
import { FeedEmpty, FeedError, FeedSkeleton } from '@/features/home/components';
import { useExploreCollections } from '../hooks';
import { CollectionCard } from './collection-card';

/** Collections sub-tab: a 2-column grid of curated ("by Sourcery") collections. */
export function CollectionsTab() {
  const collections = useExploreCollections();

  if (collections.isLoading) return <FeedSkeleton />;
  if (collections.isError) {
    return (
      <FeedError message={(collections.error as Error)?.message} onRetry={() => collections.refetch()} />
    );
  }

  return (
    <FlatList
      data={collections.data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <CollectionCard collection={item} />}
      ListHeaderComponent={
        <Text variant="caption" color="textSecondary" style={styles.intro}>
          Curated by Sourcery
        </Text>
      }
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={<FeedEmpty message="No collections yet." />}
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
    gap: spacing.lg,
  },
  intro: { paddingBottom: spacing.xs },
});
