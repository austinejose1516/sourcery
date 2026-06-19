import type { MarkTriedInput, RecipeVideoDTO, RecipeViewDTO, TriedRecipeCardDTO } from '@recipeer/core';
import { apiGet, apiPost } from '@/lib/api-client';

/** Rich payload for the recipe viewer + cook mode. */
export const fetchRecipeView = (recipeId: string) => apiGet<RecipeViewDTO>(`/recipes/${recipeId}/view`);

/** On-demand playback descriptor (fresh signed URL / YouTube id) for the video sheet. */
export const fetchRecipeVideo = (recipeId: string) => apiGet<RecipeVideoDTO>(`/recipes/${recipeId}/video`);

/** Record that the viewer cooked this recipe (drives the Tried tab). */
export const markTried = (recipeId: string, input: MarkTriedInput = {}) =>
  apiPost<TriedRecipeCardDTO>(`/recipes/${recipeId}/tried`, input);

/** The viewer's tried recipes, newest first. */
export const fetchTriedRecipes = () =>
  apiGet<{ tried: TriedRecipeCardDTO[] }>('/recipes/tried').then((r) => r.tried);

// The bookmark toggle reuses the shared /social/save contract.
export { saveRecipe, unsaveRecipe } from '@/features/home/api';
