import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ExploreCookDTO,
  ExploreRecipeQuery,
  ExploreSearchResults,
  RecipeCardDTO,
} from '@recipeer/core';
import {
  fetchExploreCollections,
  fetchExploreCooks,
  fetchExploreFilters,
  fetchExploreRecipes,
  fetchExploreSearch,
  followCook,
  saveRecipe,
  unfollowCook,
  unsaveRecipe,
} from './api';

// Query keys — grouped so optimistic mutations can patch every matching cache.
export const exploreKeys = {
  all: ['explore'] as const,
  recipes: (query: ExploreRecipeQuery) => ['explore', 'recipes', query] as const,
  cooks: (q?: string) => ['explore', 'cooks', q ?? ''] as const,
  collections: ['explore', 'collections'] as const,
  filters: ['explore', 'filters'] as const,
  search: (q: string) => ['explore', 'search', q] as const,
};

export const useExploreRecipes = (query: ExploreRecipeQuery) =>
  useQuery({ queryKey: exploreKeys.recipes(query), queryFn: () => fetchExploreRecipes(query) });

export const useExploreCooks = (q?: string) =>
  useQuery({ queryKey: exploreKeys.cooks(q), queryFn: () => fetchExploreCooks(q) });

export const useExploreCollections = () =>
  useQuery({ queryKey: exploreKeys.collections, queryFn: fetchExploreCollections });

export const useExploreFilters = () =>
  useQuery({ queryKey: exploreKeys.filters, queryFn: fetchExploreFilters });

/** Holistic search — only runs once the query is at least 2 chars. */
export const useExploreSearch = (q: string) =>
  useQuery({
    queryKey: exploreKeys.search(q),
    queryFn: () => fetchExploreSearch(q),
    enabled: q.trim().length >= 2,
    placeholderData: keepPreviousData,
  });

/**
 * Save / unsave a recipe with an optimistic flip of `isSaved` + `saveCount`
 * across every cached Explore recipe list and the search results.
 */
export const useExploreToggleSave = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ recipeId, isSaved }: { recipeId: string; isSaved: boolean }) =>
      isSaved ? unsaveRecipe(recipeId) : saveRecipe(recipeId),

    onMutate: async ({ recipeId, isSaved }) => {
      await qc.cancelQueries({ queryKey: ['explore', 'recipes'] });
      await qc.cancelQueries({ queryKey: ['explore', 'search'] });
      const delta = isSaved ? -1 : 1;

      const patch = (r: RecipeCardDTO): RecipeCardDTO =>
        r.id === recipeId
          ? { ...r, isSaved: !isSaved, saveCount: Math.max(0, r.saveCount + delta) }
          : r;

      const prevRecipes = qc.getQueriesData<RecipeCardDTO[]>({ queryKey: ['explore', 'recipes'] });
      qc.setQueriesData<RecipeCardDTO[]>({ queryKey: ['explore', 'recipes'] }, (rs) => rs?.map(patch));

      const prevSearch = qc.getQueriesData<ExploreSearchResults>({ queryKey: ['explore', 'search'] });
      qc.setQueriesData<ExploreSearchResults>({ queryKey: ['explore', 'search'] }, (s) =>
        s ? { ...s, recipes: s.recipes.map(patch) } : s,
      );

      return { prevRecipes, prevSearch };
    },

    onError: (_err, _vars, ctx) => {
      ctx?.prevRecipes?.forEach(([key, data]) => qc.setQueryData(key, data));
      ctx?.prevSearch?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
  });
};

/**
 * Follow / unfollow a cook with an optimistic flip of `isFollowing` +
 * `followerCount` across the Explore cooks list and the search results.
 */
export const useExploreToggleFollow = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ cookId, isFollowing }: { cookId: string; isFollowing: boolean }) =>
      isFollowing ? unfollowCook(cookId) : followCook(cookId),

    onMutate: async ({ cookId, isFollowing }) => {
      await qc.cancelQueries({ queryKey: ['explore', 'cooks'] });
      await qc.cancelQueries({ queryKey: ['explore', 'search'] });
      const delta = isFollowing ? -1 : 1;

      const patch = (cook: ExploreCookDTO): ExploreCookDTO =>
        cook.id === cookId
          ? { ...cook, isFollowing: !isFollowing, followerCount: Math.max(0, cook.followerCount + delta) }
          : cook;

      const prevCooks = qc.getQueriesData<ExploreCookDTO[]>({ queryKey: ['explore', 'cooks'] });
      qc.setQueriesData<ExploreCookDTO[]>({ queryKey: ['explore', 'cooks'] }, (cs) => cs?.map(patch));

      const prevSearch = qc.getQueriesData<ExploreSearchResults>({ queryKey: ['explore', 'search'] });
      qc.setQueriesData<ExploreSearchResults>({ queryKey: ['explore', 'search'] }, (s) =>
        s ? { ...s, cooks: s.cooks.map(patch) } : s,
      );

      return { prevCooks, prevSearch };
    },

    onError: (_err, _vars, ctx) => {
      ctx?.prevCooks?.forEach(([key, data]) => qc.setQueryData(key, data));
      ctx?.prevSearch?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
  });
};
