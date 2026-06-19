import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MarkTriedInput, RecipeViewDTO } from '@recipeer/core';

import { recipeKeys } from '@/features/recipes/hooks';
import { fetchRecipeVideo, fetchRecipeView, fetchTriedRecipes, markTried, saveRecipe, unsaveRecipe } from './api';

export const recipeViewKeys = {
  view: (id: string) => ['recipe-view', id] as const,
  video: (id: string) => ['recipe-video', id] as const,
  tried: ['tried-recipes'] as const,
};

export const useRecipeView = (recipeId: string) =>
  useQuery({ queryKey: recipeViewKeys.view(recipeId), queryFn: () => fetchRecipeView(recipeId) });

/**
 * Playback descriptor for the video sheet — fetched lazily (only when the sheet
 * opens, via `enabled`) so the R2 presigned URL is fresh. Not retried/cached long
 * because the signed URL expires; refetch on each open.
 */
export const useRecipeVideo = (recipeId: string, enabled: boolean) =>
  useQuery({
    queryKey: recipeViewKeys.video(recipeId),
    queryFn: () => fetchRecipeVideo(recipeId),
    enabled,
    gcTime: 0,
    staleTime: 0,
  });

export const useTriedRecipes = () =>
  useQuery({ queryKey: recipeViewKeys.tried, queryFn: fetchTriedRecipes });

/** Mark the recipe as tried, then refresh the Tried tab + this recipe + My Recipes. */
export const useMarkTried = (recipeId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MarkTriedInput = {}) => markTried(recipeId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recipeViewKeys.tried });
      qc.invalidateQueries({ queryKey: recipeViewKeys.view(recipeId) });
      qc.invalidateQueries({ queryKey: recipeKeys.mine });
    },
  });
};

/** Optimistic bookmark toggle for the viewer's own `isSaved` / `saveCount`. */
export const useToggleSaveView = (recipeId: string) => {
  const qc = useQueryClient();
  const key = recipeViewKeys.view(recipeId);
  return useMutation({
    mutationFn: (isSaved: boolean) => (isSaved ? unsaveRecipe(recipeId) : saveRecipe(recipeId)),
    onMutate: async (isSaved) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<RecipeViewDTO>(key);
      qc.setQueryData<RecipeViewDTO>(key, (r) =>
        r ? { ...r, isSaved: !isSaved, saveCount: Math.max(0, r.saveCount + (isSaved ? -1 : 1)) } : r,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
  });
};
