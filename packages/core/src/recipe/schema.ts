import { z } from 'zod';

/**
 * The load-bearing contract (Technical Spec §7): the single JSON shape Gemini
 * must return. It drives the per-step video splitting and everything the app
 * renders. Timestamps are decimal seconds so they feed ffmpeg directly later.
 *
 * Fields that real home-cooking videos routinely omit (servings, exact
 * quantities/units, original-language names) are nullable so a faithful
 * extraction never fails validation just for leaving them out.
 */
export const recipeIngredientSchema = z.object({
  name_english: z.string(),
  name_original: z.string().nullable(),
  quantity: z.string().nullable(),
  unit: z.string().nullable(),
  localised_note: z.string().nullable(),
});

export const recipeStepSchema = z.object({
  index: z.number().int(),
  instruction_english: z.string(),
  start_seconds: z.number(),
  end_seconds: z.number(),
  technique_tags: z.array(z.string()),
  ingredient_indices: z.array(z.number().int()),
});

export const recipeConfidenceSchema = z.object({
  transcription: z.enum(['high', 'medium', 'low']),
  notes: z.string(),
});

export const recipeExtractionSchema = z.object({
  title: z.object({
    original: z.string(),
    english: z.string(),
  }),
  source_language: z.string(),
  cuisine: z.string().nullable(),
  servings: z.number().int().nullable(),
  total_time_minutes: z.number().nullable(),
  summary: z.string(),
  cultural_notes: z.string(),
  ingredients: z.array(recipeIngredientSchema),
  steps: z.array(recipeStepSchema),
  confidence: recipeConfidenceSchema,
});

export type RecipeExtraction = z.infer<typeof recipeExtractionSchema>;
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;
export type RecipeStep = z.infer<typeof recipeStepSchema>;
