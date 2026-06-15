import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProcessingJobDTO, RecipeVisibilityDTO, UpdateRecipeInput } from '@recipeer/core';
import {
  deleteRecipe,
  fetchJob,
  fetchMyRecipes,
  fetchRecipeDetail,
  publishRecipe,
  updateRecipe,
} from './api';

export const recipeKeys = {
  mine: ['my-recipes'] as const,
  job: (id: string) => ['recipe-job', id] as const,
  detail: (id: string) => ['recipe-detail', id] as const,
};

// Job statuses that still need polling.
const ACTIVE = new Set(['UPLOADING', 'TRANSCRIBING', 'STRUCTURING', 'TRANSLATING', 'REVIEW']);

/** The Mine tab. Auto-polls while any job is still processing. */
export const useMyRecipes = () =>
  useQuery({
    queryKey: recipeKeys.mine,
    queryFn: fetchMyRecipes,
    refetchInterval: (query) => {
      const data = query.state.data;
      const stillWorking = data?.processing.some((j) => ACTIVE.has(j.status));
      return stillWorking ? 4000 : false;
    },
  });

/** Polls a single job (drives the Processing screen). Stops once terminal. */
export const useJob = (jobId: string) =>
  useQuery({
    queryKey: recipeKeys.job(jobId),
    queryFn: () => fetchJob(jobId),
    refetchInterval: (query) => {
      const data = query.state.data as ProcessingJobDTO | undefined;
      return data && ACTIVE.has(data.status) ? 3000 : false;
    },
  });

export const useRecipeDetail = (recipeId: string) =>
  useQuery({ queryKey: recipeKeys.detail(recipeId), queryFn: () => fetchRecipeDetail(recipeId) });

export const useUpdateRecipe = (recipeId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRecipeInput) => updateRecipe(recipeId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recipeKeys.detail(recipeId) });
      qc.invalidateQueries({ queryKey: recipeKeys.mine });
    },
  });
};

export const usePublishRecipe = (recipeId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (visibility: RecipeVisibilityDTO) => publishRecipe(recipeId, visibility),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recipeKeys.detail(recipeId) });
      qc.invalidateQueries({ queryKey: recipeKeys.mine });
    },
  });
};

export const useDeleteRecipe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recipeId: string) => deleteRecipe(recipeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: recipeKeys.mine }),
  });
};
