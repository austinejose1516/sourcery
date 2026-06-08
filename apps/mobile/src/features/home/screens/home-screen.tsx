import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { FeedItem, FeedTab } from '@recipeer/core';
import { colors, sizing, spacing } from '@recipeer/core';

import { Logo } from '@/components/ui';
import {
  ActivityFeed,
  FeedEmpty,
  FeedError,
  FeedSkeleton,
  FeedTabs,
  RecipeFeedCard,
  TriedThisCard,
} from '../components';
import { useFeed, useToggleSave } from '../hooks';

const EMPTY_COPY: Record<FeedTab, string> = {
  tonight: 'Nothing to cook here yet — check back soon.',
  following: '', // Activity: handled by the ColdStart onboarding view
  trending: 'Nothing trending yet.',
};

export function HomeScreen() {
  const [tab, setTab] = useState<FeedTab>('following');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Logo size="lg" />
        <FeedTabs active={tab} onChange={setTab} />
      </View>

      {tab === 'following' ? <ActivityFeed /> : <RecipeFeed tab={tab} />}
    </SafeAreaView>
  );
}

/** Recipe-card timeline for the Trending and Tonight tabs. */
function RecipeFeed({ tab }: { tab: Exclude<FeedTab, 'following'> }) {
  const feed = useFeed(tab);
  const toggleSave = useToggleSave();

  const renderItem = ({ item }: { item: FeedItem }) => {
    if (item.kind === 'recipe') {
      const { kind, ...recipe } = item;
      return (
        <RecipeFeedCard
          recipe={recipe}
          onToggleSave={() => toggleSave.mutate({ recipeId: recipe.id, isSaved: recipe.isSaved })}
        />
      );
    }
    const { kind, ...post } = item;
    return <TriedThisCard post={post} />;
  };

  if (feed.isLoading) return <FeedSkeleton />;
  if (feed.isError) {
    return <FeedError message={(feed.error as Error)?.message} onRetry={() => feed.refetch()} />;
  }

  return (
    <FlatList
      data={feed.data}
      keyExtractor={(item) => `${item.kind}:${item.id}`}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={feed.isRefetching}
          onRefresh={() => feed.refetch()}
          tintColor={colors.textSecondary}
        />
      }
      ListEmptyComponent={<FeedEmpty message={EMPTY_COPY[tab]} />}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    width: '100%',
    maxWidth: sizing.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  list: {
    width: '100%',
    maxWidth: sizing.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
});
