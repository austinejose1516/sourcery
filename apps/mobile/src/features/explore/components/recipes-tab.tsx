import { FlatList, StyleSheet, View } from 'react-native';
import type { ExploreRecipeQuery, RecipeCardDTO } from '@recipeer/core';
import { sizing, spacing } from '@recipeer/core';

import { FeedEmpty, FeedError, FeedSkeleton } from '@/features/home/components';
import { useExploreRecipes, useExploreToggleSave } from '../hooks';
import { FilterChips } from './filter-chips';
import { RecipeGridCard } from './recipe-grid-card';

// Sentinel id used to pad an odd-length grid so the last card stays half-width
// instead of stretching across the row.
const SPACER_ID = '__spacer__';
const padGrid = (items: RecipeCardDTO[]): RecipeCardDTO[] =>
  items.length % 2 === 1 ? [...items, { id: SPACER_ID } as RecipeCardDTO] : items;

export interface RecipesTabProps {
  filters: ExploreRecipeQuery;
  onFiltersChange: (next: ExploreRecipeQuery) => void;
}

/** Recipes sub-tab: filter chips above a personalised 2-column grid. */
export function RecipesTab({ filters, onFiltersChange }: RecipesTabProps) {
  const recipes = useExploreRecipes(filters);
  const toggleSave = useExploreToggleSave();

  return (
    <View style={styles.container}>
      <FilterChips filters={filters} onChange={onFiltersChange} />

      {recipes.isLoading ? (
        <FeedSkeleton />
      ) : recipes.isError ? (
        <FeedError message={(recipes.error as Error)?.message} onRetry={() => recipes.refetch()} />
      ) : (
        <FlatList
          data={padGrid(recipes.data ?? [])}
          keyExtractor={(item) => item.id}
          numColumns={2}
          style={styles.grid}
          columnWrapperStyle={styles.column}
          renderItem={({ item }) =>
            item.id === SPACER_ID ? (
              <View style={styles.spacer} />
            ) : (
              <RecipeGridCard
                recipe={item}
                onToggleSave={() => toggleSave.mutate({ recipeId: item.id, isSaved: item.isSaved })}
              />
            )
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<FeedEmpty message="No recipes match these filters yet." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.sm },
  grid: { flex: 1 },
  list: {
    width: '100%',
    maxWidth: sizing.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  column: { gap: spacing.lg },
  spacer: { flex: 1, minWidth: 0 },
});
