/**
 * Explore DTOs — the wire contract for the Explore tab (Recipes / Cooks /
 * Collections + holistic search) between the API (apps/api) and the mobile app
 * (apps/mobile). Reuses the feed DTOs so recipe/author/region shapes never drift.
 */

import type { FeedRegionDTO, RecipeCardDTO } from '../feed/types';

/** A cook as shown on the Explore › Cooks tab — richer than `SuggestedCookDTO`. */
export interface ExploreCookDTO {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  region: FeedRegionDTO | null;
  /** Cuisine names the cook publishes in, e.g. ["Vietnamese", "Korean"]. */
  specialties: string[];
  recipeCount: number;
  followerCount: number;
  /** True if the current viewer already follows this cook. */
  isFollowing: boolean;
}

/** A curated/editorial collection card on the Explore › Collections tab. */
export interface CollectionCardDTO {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  /** Display name of the curator; null → render as "Curated by Sourcery". */
  curatedBy: string | null;
  recipeCount: number;
  /** Up to three member-recipe covers, for a collage when there's no cover. */
  previewCovers: string[];
}

/** The filter chips available on the Recipes tab. */
export interface ExploreFiltersDTO {
  /** Dietary tags from the taxonomy table. */
  dietary: { slug: string; name: string }[];
}

/** Holistic search payload — every entity type the search box spans. */
export interface ExploreSearchResults {
  recipes: RecipeCardDTO[];
  cooks: ExploreCookDTO[];
  collections: CollectionCardDTO[];
}

/** Recipe difficulty as accepted by the Explore recipes querystring. */
export type ExploreDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

/**
 * Querystring contract for `GET /explore/recipes` — all optional. Empty means
 * "personalised default feed". `diet` is a DietaryTag slug.
 */
export interface ExploreRecipeQuery {
  q?: string;
  cuisine?: string;
  region?: string;
  difficulty?: ExploreDifficulty;
  maxMinutes?: number;
  diet?: string;
}
