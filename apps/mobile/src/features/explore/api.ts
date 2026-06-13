import type {
  CollectionCardDTO,
  ExploreCookDTO,
  ExploreFiltersDTO,
  ExploreRecipeQuery,
  ExploreSearchResults,
  RecipeCardDTO,
} from '@recipeer/core';
import { apiGet } from '@/lib/api-client';

/** Serialises the recipe filter state into a querystring (skips empty values). */
function recipeQueryString(query: ExploreRecipeQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.cuisine) params.set('cuisine', query.cuisine);
  if (query.region) params.set('region', query.region);
  if (query.difficulty) params.set('difficulty', query.difficulty);
  if (query.maxMinutes != null) params.set('maxMinutes', String(query.maxMinutes));
  if (query.diet) params.set('diet', query.diet);
  const s = params.toString();
  return s ? `?${s}` : '';
}

export const fetchExploreRecipes = (query: ExploreRecipeQuery) =>
  apiGet<{ recipes: RecipeCardDTO[] }>(`/explore/recipes${recipeQueryString(query)}`).then((r) => r.recipes);

export const fetchExploreCooks = (q?: string) =>
  apiGet<{ cooks: ExploreCookDTO[] }>(`/explore/cooks${q ? `?q=${encodeURIComponent(q)}` : ''}`).then(
    (r) => r.cooks,
  );

export const fetchExploreCollections = () =>
  apiGet<{ collections: CollectionCardDTO[] }>('/explore/collections').then((r) => r.collections);

export const fetchExploreFilters = () => apiGet<ExploreFiltersDTO>('/explore/filters');

export const fetchExploreSearch = (q: string) =>
  apiGet<ExploreSearchResults>(`/explore/search?q=${encodeURIComponent(q)}`);

// Social mutations reuse the existing /social/* contract from the home feature
// so the wire shapes stay identical.
export { saveRecipe, unsaveRecipe, followCook, unfollowCook } from '@/features/home/api';
