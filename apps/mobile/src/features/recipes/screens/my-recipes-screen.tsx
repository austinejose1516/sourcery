import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { MyRecipeCardDTO, ProcessingJobDTO } from '@recipeer/core';
import { colors, radius, sizing, spacing } from '@recipeer/core';

import { Icon, PressableScale, Text } from '@/components/ui';
import {
  FailedCard,
  NeedsReviewCard,
  PrivateDraftCard,
  ProcessingCard,
  PublishedCard,
  SectionHeading,
} from '../components';
import { useDismissJob, useMyRecipes } from '../hooks';
import { notifyRecipeReady } from '../notifications';

type LibraryTab = 'saved' | 'tried' | 'mine';

type ProcessingItem = { kind: 'processing'; job: ProcessingJobDTO };
type FailedItem = { kind: 'failed'; job: ProcessingJobDTO };
type ReviewItem = { kind: 'review'; recipe: MyRecipeCardDTO };
type PublishedItem = { kind: 'published'; recipe: MyRecipeCardDTO };
type PrivateItem = { kind: 'private'; recipe: MyRecipeCardDTO };
type Item = ProcessingItem | FailedItem | ReviewItem | PublishedItem | PrivateItem;

type Section = { title: string; data: Item[] };

const ACTIVE = new Set(['UPLOADING', 'TRANSCRIBING', 'STRUCTURING', 'TRANSLATING', 'REVIEW']);

function LibraryTabs({
  active,
  onChange,
  mineCount,
}: {
  active: LibraryTab;
  onChange: (tab: LibraryTab) => void;
  mineCount: number;
}) {
  const tabs: { key: LibraryTab; label: string }[] = [
    { key: 'saved', label: 'Saved' },
    { key: 'tried', label: 'Tried' },
    { key: 'mine', label: 'Mine' },
  ];
  return (
    <View style={tabStyles.row}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <PressableScale key={tab.key} onPress={() => onChange(tab.key)} style={tabStyles.tab}>
            <View style={tabStyles.labelRow}>
              <Text variant="bodyStrong" color={isActive ? 'textPrimary' : 'textSecondary'}>
                {tab.label}
              </Text>
              {tab.key === 'mine' && mineCount > 0 ? (
                <View style={tabStyles.badge}>
                  <Text variant="micro" color="textSecondary">
                    {mineCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={[tabStyles.underline, isActive && tabStyles.underlineActive]} />
          </PressableScale>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  badge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    minWidth: 18,
    alignItems: 'center',
  },
  underline: { height: 2, width: 20, borderRadius: 2, backgroundColor: 'transparent' },
  underlineActive: { backgroundColor: colors.accent },
});

export function MyRecipesScreen() {
  const router = useRouter();
  const query = useMyRecipes();
  const dismissJob = useDismissJob();
  const [activeTab, setActiveTab] = useState<LibraryTab>('mine');
  const data = query.data;

  const prevActive = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!data) return;
    const nowActive = new Set(data.processing.filter((j) => ACTIVE.has(j.status)).map((j) => j.jobId));
    let completed = false;
    for (const id of prevActive.current) {
      if (!nowActive.has(id)) completed = true;
    }
    if (completed) void notifyRecipeReady();
    prevActive.current = nowActive;
  }, [data]);

  const sections: Section[] = [];
  if (data) {
    const activeJobs = data.processing.filter((j) => j.status !== 'FAILED');
    const failedJobs = data.processing.filter((j) => j.status === 'FAILED');

    if (activeJobs.length) {
      sections.push({
        title: 'Processing',
        data: activeJobs.map((job) => ({ kind: 'processing', job }) satisfies ProcessingItem),
      });
    }
    if (data.needsReview.length) {
      sections.push({
        title: 'Needs your review',
        data: data.needsReview.map((recipe) => ({ kind: 'review', recipe }) satisfies ReviewItem),
      });
    }
    if (data.published.length) {
      sections.push({
        title: 'Published',
        data: data.published.map((recipe) => ({ kind: 'published', recipe }) satisfies PublishedItem),
      });
    }
    if (data.private.length) {
      sections.push({
        title: 'Private drafts',
        data: data.private.map((recipe) => ({ kind: 'private', recipe }) satisfies PrivateItem),
      });
    }
    if (failedJobs.length) {
      sections.push({
        title: 'Needs attention',
        data: failedJobs.map((job) => ({ kind: 'failed', job }) satisfies FailedItem),
      });
    }
  }

  const mineCount = data
    ? data.processing.length + data.needsReview.length + data.published.length + data.private.length
    : 0;

  const isEmpty = data && sections.length === 0;

  function navigateToRecipe(recipeId: string) {
    router.push({ pathname: '/review/[recipeId]', params: { recipeId } });
  }

  function navigateToJob(job: ProcessingJobDTO) {
    if (job.recipeId) {
      router.push({ pathname: '/review/[recipeId]', params: { recipeId: job.recipeId } });
    } else {
      router.push({ pathname: '/processing/[jobId]', params: { jobId: job.jobId } });
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text variant="display">My Recipes</Text>
      </View>

      <LibraryTabs active={activeTab} onChange={setActiveTab} mineCount={mineCount} />

      <View style={styles.content}>
        {activeTab === 'saved' ? (
          <View style={styles.center}>
            <Icon name="bookmark-outline" size={36} color="textSecondary" />
            <Text variant="heading" align="center">
              Nothing saved yet
            </Text>
            <Text variant="body" color="textSecondary" align="center">
              Bookmark recipes from Explore to find them here.
            </Text>
          </View>
        ) : activeTab === 'tried' ? (
          <View style={styles.center}>
            <Icon name="checkmark-circle-outline" size={36} color="textSecondary" />
            <Text variant="heading" align="center">
              No tries yet
            </Text>
            <Text variant="body" color="textSecondary" align="center">
              Mark recipes as tried to build your cooking history.
            </Text>
          </View>
        ) : query.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : query.isError ? (
          <View style={styles.center}>
            <Text variant="body" color="textSecondary" align="center">
              {(query.error as Error)?.message ?? 'Could not load your recipes.'}
            </Text>
          </View>
        ) : isEmpty ? (
          <View style={styles.center}>
            <Icon name="book-outline" size={36} color="textSecondary" />
            <Text variant="heading" align="center">
              Nothing here yet
            </Text>
            <Text variant="body" color="textSecondary" align="center">
              Tap "New recipe" to turn a video into a recipe.
            </Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => {
              if (item.kind === 'processing' || item.kind === 'failed') return `job:${item.job.jobId}`;
              return `rec:${item.recipe.id}`;
            }}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <SectionHeading title={section.title} count={section.data.length} />
            )}
            renderItem={({ item }) => {
              switch (item.kind) {
                case 'processing':
                  return <ProcessingCard job={item.job} onPress={() => navigateToJob(item.job)} />;
                case 'failed':
                  return (
                    <FailedCard
                      job={item.job}
                      onDismiss={() => dismissJob.mutate(item.job.jobId)}
                    />
                  );
                case 'review':
                  return (
                    <NeedsReviewCard
                      recipe={item.recipe}
                      onPress={() => navigateToRecipe(item.recipe.id)}
                    />
                  );
                case 'published':
                  return (
                    <PublishedCard
                      recipe={item.recipe}
                      onPress={() => navigateToRecipe(item.recipe.id)}
                    />
                  );
                case 'private':
                  return (
                    <PrivateDraftCard
                      recipe={item.recipe}
                      onPress={() => navigateToRecipe(item.recipe.id)}
                    />
                  );
              }
            }}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
            }
          />
        )}

        <View style={styles.fabContainer} pointerEvents="box-none">
          <PressableScale style={styles.fab} onPress={() => router.push('/new-recipe')}>
            <Icon name="add" size={20} color="onPrimary" />
            <Text variant="button" color="onPrimary">
              New recipe
            </Text>
          </PressableScale>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  content: { flex: 1 },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl + spacing.xxl + spacing.xl,
    width: '100%',
    maxWidth: sizing.maxContentWidth,
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  fabContainer: {
    position: 'absolute',
    bottom: spacing.xxxl * 2.25,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
});
