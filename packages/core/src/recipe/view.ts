/**
 * DTOs for the consumer-facing Recipe Viewer + Cook mode — the wire contract
 * between apps/api and apps/mobile. Richer than RecipeDetailDTO (which serves the
 * editor): carries the contributor, region/cuisine/dietary, social counts,
 * viewer-relative flags, and the per-step data cook mode renders.
 *
 * Every cook-extra field is nullable so recipes imported before this feature (or
 * by the AI pipeline, which doesn't yet emit them) degrade gracefully — the UI
 * simply omits the corresponding block.
 */

export type CautionLevelDTO = 'CAUTION' | 'WARN' | 'CRITICAL';
export type DifficultyDTO = 'EASY' | 'MEDIUM' | 'HARD';

/** The cook who shared the recipe, as shown in the overview contributor strip. */
export interface ViewContributorDTO {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  /** Human label like "Kochi, Kerala", or null. */
  region: string | null;
  /** ISO-3166 alpha-2; the client turns this into a flag emoji. */
  country: string | null;
  /** Count of this cook's published recipes. */
  recipeCount: number;
  followerCount: number;
  /** True if the current viewer already follows this cook. */
  isFollowing: boolean;
}

export interface ViewRegionDTO {
  name: string;
  /** ISO-3166 alpha-2 of the region's country. */
  country: string;
}

export interface ViewCuisineDTO {
  name: string;
}

/** A "For this step" chip — a recipe ingredient referenced by one step. */
export interface ViewStepIngredientDTO {
  name: string;
  /** Measured qty ("500 g") or a free note ("from step 1"); may be null. */
  qty: string | null;
}

/** The ingredients-at-a-glance rows on the overview. */
export interface RecipeViewIngredientDTO {
  id: string;
  name: string;
  /** Pre-formatted display quantity, or null for unit-less items. */
  qty: string | null;
  substitutionNote: string | null;
}

export interface RecipeViewStepDTO {
  id: string;
  stepNumber: number;
  /** Short verb-led label ("Poach the fish") for the outline + cook header. */
  summary: string | null;
  instruction: string;
  timerSeconds: number | null;
  timerLabel: string | null;
  caution: { level: CautionLevelDTO; text: string } | null;
  /** The "Look for…" sensory cue. */
  donenessCue: string | null;
  tipText: string | null;
  /** Trimmed clip range within the source video, in milliseconds. */
  clip: { startMs: number; endMs: number } | null;
  /** Signed playback URL for this step's extracted clip, if any. */
  videoUrl: string | null;
  stepIngredients: ViewStepIngredientDTO[];
  /** Seeded hands-free Q&A shown in the voice overlay; null when none. */
  voice: { question: string; answer: string } | null;
}

/** Full recipe payload for the viewer + cook flow. */
export interface RecipeViewDTO {
  id: string;
  title: string;
  titleOriginal: string | null;
  description: string | null;
  region: ViewRegionDTO | null;
  cuisine: ViewCuisineDTO | null;
  difficulty: DifficultyDTO | null;
  dietaryTags: string[];
  totalTimeMinutes: number | null;
  /** Active "hands-on" time (= prepTimeMinutes); null when unknown. */
  handsOnMinutes: number | null;
  baseServings: number;
  endorsementCount: number;
  cookCount: number;
  saveCount: number;
  /** True if the current viewer has saved this recipe. */
  isSaved: boolean;
  /** True if the current viewer has already marked this recipe as tried. */
  triedByMe: boolean;
  contributor: ViewContributorDTO;
  /** Signed cover image URL (uploads) or external URL, or null. */
  coverImageUrl: string | null;
  /** Signed playback URL (uploads) or the external link (imports), or null. */
  videoUrl: string | null;
  /** Full source-video length in ms, for the clip scrubber; may be null. */
  videoDurationMs: number | null;
  ingredients: RecipeViewIngredientDTO[];
  steps: RecipeViewStepDTO[];
}

/** A card in the My Recipes → Tried tab. */
export interface TriedRecipeCardDTO {
  triedId: string;
  /** ISO timestamp. */
  triedAt: string;
  recipe: {
    id: string;
    title: string;
    titleOriginal: string | null;
    coverImageUrl: string | null;
  };
  photoUrl: string | null;
  note: string | null;
}

/** Body for marking a recipe as tried from the cook-mode complete screen. */
export interface MarkTriedInput {
  /** R2 object key of an uploaded photo, or an external URL. */
  photoUrl?: string | null;
  note?: string | null;
}
