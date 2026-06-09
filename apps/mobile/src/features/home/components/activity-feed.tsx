import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TriedThisCardDTO } from '@recipeer/core';
import { colors, radius, sizing, spacing } from '@recipeer/core';

import { Icon, PressableScale, Text } from '@/components/ui';
import { useFeed } from '../hooks';
import { FeedError, FeedSkeleton } from './feed-states';
import { FollowChefsSection } from './follow-chefs-section';
import { NewPostModal } from './new-post-modal';
import { TriedThisCard } from './tried-this-card';

/**
 * The Activity tab: a "Follow chefs" header, the viewer's social timeline of
 * "tried this" posts, and a floating button to compose a new post.
 */
export function ActivityFeed() {
  const feed = useFeed('following');
  const insets = useSafeAreaInsets();
  const [composing, setComposing] = useState(false);

  // The Following feed is tried-only server-side; filter defensively anyway.
  const posts = (feed.data ?? []).filter(
    (item): item is { kind: 'tried' } & TriedThisCardDTO => item.kind === 'tried',
  );

  // The FAB sits just above the floating tab bar; the list clears both it and the FAB.
  const bottomClearance = insets.bottom;

  return (
    <View style={styles.flex}>
      {feed.isLoading ? (
        <FeedSkeleton />
      ) : feed.isError ? (
        <FeedError message={(feed.error as Error)?.message} onRetry={() => feed.refetch()} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const { kind, ...post } = item;
            return <TriedThisCard post={post} />;
          }}
          // Feeds first, then the "Follow chefs" rail at the bottom.
          ListFooterComponent={<FollowChefsSection />}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomClearance },
          ]}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={feed.isRefetching}
              onRefresh={() => feed.refetch()}
              tintColor={colors.textSecondary}
            />
          }
          ListEmptyComponent={
            <Text variant="body" color="textSecondary" style={styles.empty}>
              No activity yet — follow some chefs and check back.
            </Text>
          }
        />
      )}

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="New post"
        onPress={() => setComposing(true)}
        style={[styles.fab, { bottom: bottomClearance + spacing.md }]}>
        <Icon name="add" size={26} color="textInverse" />
        <Text variant="button" color="textInverse">
          New Post
        </Text>
      </PressableScale>

      <NewPostModal visible={composing} onClose={() => setComposing(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    width: '100%',
    maxWidth: sizing.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  empty: { paddingTop: spacing.xxl, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryPressed,
    // Stronger lift so the FAB clearly floats above the feed beneath it.
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.5,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
