import type { RecipeExtraction } from '@recipeer/core';
import type { IngestionSource, RecipeStatus, RecipeVisibility } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Parses a free-text quantity ("500", "1/2", "1 1/2", "a handful") into the
 * structured (amount) / unstructured (quantityNote) split the schema expects.
 */
export function parseQuantity(raw: string | null): { amount: number | null; quantityNote: string | null } {
  if (!raw) return { amount: null, quantityNote: null };
  const q = raw.trim();
  if (/^\d+(\.\d+)?$/.test(q)) return { amount: Number(q), quantityNote: null };
  const frac = q.match(/^(\d+)\/(\d+)$/);
  if (frac) return { amount: Number(frac[1]) / Number(frac[2]), quantityNote: null };
  const mixed = q.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return { amount: Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]), quantityNote: null };
  return { amount: null, quantityNote: q };
}

interface PersistArgs {
  authorId: string;
  extraction: RecipeExtraction;
  sourceType: IngestionSource;
  /** R2 path (uploads) or external URL (link imports). */
  originalVideoUrl?: string | null;
  /** DRAFT for uploads (needs review); PUBLISHED for link imports (private doc). */
  status?: RecipeStatus;
  visibility?: RecipeVisibility;
}

/**
 * Maps a validated `recipeExtractionSchema` result into Recipe + RecipeStep +
 * RecipeIngredient rows in a single nested-create transaction. Shared by the
 * video-upload task and the YouTube link import. Returns the new recipe id.
 */
export async function persistExtraction({
  authorId,
  extraction,
  sourceType,
  originalVideoUrl = null,
  status = 'DRAFT',
  visibility = 'PUBLIC',
}: PersistArgs): Promise<string> {
  // Best-effort link of the free-text cuisine name to a taxonomy row.
  const cuisineId = extraction.cuisine
    ? (
        await prisma.cuisine.findFirst({
          where: { name: { equals: extraction.cuisine, mode: 'insensitive' } },
          select: { id: true },
        })
      )?.id ?? null
    : null;

  const orderedSteps = [...extraction.steps].sort((a, b) => a.index - b.index);

  const recipe = await prisma.recipe.create({
    data: {
      authorId,
      title: extraction.title.english,
      titleOriginal: extraction.title.original || null,
      description: extraction.summary || null,
      originalLanguage: extraction.source_language || null,
      status,
      visibility,
      totalTimeMinutes: extraction.total_time_minutes != null ? Math.round(extraction.total_time_minutes) : null,
      baseServings: extraction.servings ?? 4,
      cuisineId,
      originalVideoUrl,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
      ingredients: {
        create: extraction.ingredients.map((ing, i) => {
          const { amount, quantityNote } = parseQuantity(ing.quantity);
          return {
            name: ing.name_english,
            nameOriginal: ing.name_original,
            amount,
            unit: ing.unit,
            quantityNote,
            substitutionNote: ing.localised_note,
            orderIndex: i,
          };
        }),
      },
      steps: {
        create: orderedSteps.map((step, i) => ({
          stepNumber: i + 1,
          instruction: step.instruction_english,
          videoStartMs: Math.round(step.start_seconds * 1000),
          videoEndMs: Math.round(step.end_seconds * 1000),
        })),
      },
    },
    select: { id: true },
  });

  return recipe.id;
}
