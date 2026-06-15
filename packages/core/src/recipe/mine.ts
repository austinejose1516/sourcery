/**
 * DTOs for the "My Recipes → Mine" tab and the Review & publish screen — the
 * wire contract between apps/api and apps/mobile. Grouped by the state the UI
 * renders: Processing (active jobs) → Needs review (DRAFT) → Published → Private.
 */

export type IngestionJobStatus =
  | 'UPLOADING'
  | 'TRANSCRIBING'
  | 'STRUCTURING'
  | 'TRANSLATING'
  | 'REVIEW'
  | 'COMPLETE'
  | 'FAILED';

export type IngestionSourceType = 'VIDEO' | 'AUDIO' | 'LINK' | 'HANDWRITTEN' | 'MANUAL';

export type RecipeStatusDTO = 'DRAFT' | 'PROCESSING' | 'PUBLISHED' | 'ARCHIVED';
export type RecipeVisibilityDTO = 'PUBLIC' | 'PRIVATE';

/** A recipe still being processed (no finished recipe yet, or it failed). */
export interface ProcessingJobDTO {
  jobId: string;
  status: IngestionJobStatus;
  sourceType: IngestionSourceType;
  title: string | null;
  recipeId: string | null;
  errorMessage: string | null;
  createdAt: string;
}

/** A compact card for the Needs review / Published / Private sections. */
export interface MyRecipeCardDTO {
  id: string;
  title: string;
  titleOriginal: string | null;
  coverImageUrl: string | null;
  status: RecipeStatusDTO;
  visibility: RecipeVisibilityDTO;
  /** Link imports can never be published publicly. */
  isLinkImport: boolean;
  updatedAt: string;
}

export interface MyRecipesResponse {
  processing: ProcessingJobDTO[];
  needsReview: MyRecipeCardDTO[];
  published: MyRecipeCardDTO[];
  private: MyRecipeCardDTO[];
}

export interface RecipeDetailIngredientDTO {
  id: string;
  name: string;
  nameOriginal: string | null;
  amount: number | null;
  unit: string | null;
  quantityNote: string | null;
  substitutionNote: string | null;
  orderIndex: number;
}

export interface RecipeDetailStepDTO {
  id: string;
  stepNumber: number;
  instruction: string;
  videoStartMs: number | null;
  videoEndMs: number | null;
}

/** Full recipe for the Review & publish screen. */
export interface RecipeDetailDTO {
  id: string;
  title: string;
  titleOriginal: string | null;
  description: string | null;
  status: RecipeStatusDTO;
  visibility: RecipeVisibilityDTO;
  originalLanguage: string | null;
  totalTimeMinutes: number | null;
  baseServings: number;
  isLinkImport: boolean;
  /** Signed playback URL (uploads) or the external link (imports). */
  videoUrl: string | null;
  ingredients: RecipeDetailIngredientDTO[];
  steps: RecipeDetailStepDTO[];
}

/** Body for editing a recipe on the review screen. */
export interface UpdateRecipeInput {
  title?: string;
  description?: string | null;
  baseServings?: number;
  totalTimeMinutes?: number | null;
  ingredients?: Array<{
    name: string;
    nameOriginal?: string | null;
    amount?: number | null;
    unit?: string | null;
    quantityNote?: string | null;
    substitutionNote?: string | null;
  }>;
  steps?: Array<{ instruction: string; videoStartMs?: number | null; videoEndMs?: number | null }>;
}
