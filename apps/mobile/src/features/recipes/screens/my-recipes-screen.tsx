import { useEffect, useRef } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { MyRecipeCardDTO, ProcessingJobDTO } from '@recipeer/core';
import { colors, sizing, spacing } from '@recipeer/core';

import { Icon, PressableScale, Text } from '@/components/ui';
import { ProcessingRow, RecipeRow, SectionHeading } from '../components';
import { useMyRecipes } from '../hooks';
import { notifyRecipeReady } from '../notifications';

type Item = { kind: 'job'; job: ProcessingJobDTO } | { kind: 'recipe'; recipe: MyRecipeCardDTO };
type Section = { title: string; data: Item[] };

const ACTIVE = new Set(['UPLOADING', 'TRANSCRIBING', 'STRUCTURING', 'TRANSLATING', 'REVIEW']);

export function MyRecipesScreen() {
  const router = useRouter();
  const query = useMyRecipes();
  const data = query.data;

  // Fire a local notification the moment an active job leaves the processing set.
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
    if (data.processing.length) {
      sections.push({ title: 'Processing', data: data.processing.map((job) => ({ kind: 'job', job })) });
    }
    if (data.needsReview.length) {
      sections.push({ title: 'Needs your review', data: data.needsReview.map((recipe) => ({ kind: 'recipe', recipe })) });
    }
    if (data.published.length) {
      sections.push({ title: 'Published', data: data.published.map((recipe) => ({ kind: 'recipe', recipe })) });
    }
    if (data.private.length) {
      sections.push({ title: 'Private', data: data.private.map((recipe) => ({ kind: 'recipe', recipe })) });
    }
  }

  const isEmpty = data && sections.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text variant="display">My Recipes</Text>
        <PressableScale style={styles.newButton} onPress={() => router.push('/new-recipe')}>
          <Icon name="add" size={20} color="onPrimary" />
          <Text variant="button" color="onPrimary">
            New
          </Text>
        </PressableScale>
      </View>

      {query.isLoading ? (
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
          <Text variant="heading" align="center">
            Nothing here yet
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            Tap “New” to turn a video into a recipe.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => (item.kind === 'job' ? `job:${item.job.jobId}` : `rec:${item.recipe.id}`)}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => <SectionHeading title={section.title} count={section.data.length} />}
          renderItem={({ item }) =>
            item.kind === 'job' ? (
              <ProcessingRow
                job={item.job}
                onPress={() =>
                  item.job.recipeId
                    ? router.push({ pathname: '/review/[recipeId]', params: { recipeId: item.job.recipeId } })
                    : router.push({ pathname: '/processing/[jobId]', params: { jobId: item.job.jobId } })
                }
              />
            ) : (
              <RecipeRow
                recipe={item.recipe}
                onPress={() =>
                  router.push({ pathname: '/review/[recipeId]', params: { recipeId: item.recipe.id } })
                }
              />
            )
          }
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    width: '100%',
    maxWidth: sizing.maxContentWidth,
    alignSelf: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
});
