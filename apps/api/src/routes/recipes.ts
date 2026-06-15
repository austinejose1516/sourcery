import { Hono } from 'hono';
import { z } from 'zod';
import type {
  MyRecipeCardDTO,
  MyRecipesResponse,
  ProcessingJobDTO,
  RecipeDetailDTO,
  RecipeExtraction,
} from '@recipeer/core';
import { enqueueExtraction } from '../lib/jobs';
import { persistExtraction } from '../lib/persist-recipe';
import { prisma } from '../lib/prisma';
import { mediaStore } from '../lib/r2';
import { getViewerId } from '../lib/viewer';
import { parseYouTubeId } from '../lib/youtube';

// Statuses still considered "in progress" for the Processing section.
const ACTIVE_JOB_STATUSES = ['UPLOADING', 'TRANSCRIBING', 'STRUCTURING', 'TRANSLATING', 'REVIEW', 'FAILED'] as const;

const ingestBody = z.object({ key: z.string().min(1) });
const importLinkBody = z.object({ url: z.string().min(1) });
const publishBody = z.object({ visibility: z.enum(['PUBLIC', 'PRIVATE']) });
const updateBody = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  baseServings: z.number().int().positive().optional(),
  totalTimeMinutes: z.number().int().nullable().optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1),
        nameOriginal: z.string().nullable().optional(),
        amount: z.number().nullable().optional(),
        unit: z.string().nullable().optional(),
        quantityNote: z.string().nullable().optional(),
        substitutionNote: z.string().nullable().optional(),
      }),
    )
    .optional(),
  steps: z
    .array(
      z.object({
        instruction: z.string().min(1),
        videoStartMs: z.number().int().nullable().optional(),
        videoEndMs: z.number().int().nullable().optional(),
      }),
    )
    .optional(),
});

const cardSelect = {
  id: true,
  title: true,
  titleOriginal: true,
  coverImageUrl: true,
  status: true,
  visibility: true,
  updatedAt: true,
  ingestionJob: { select: { sourceType: true } },
} as const;

type CardRow = {
  id: string;
  title: string;
  titleOriginal: string | null;
  coverImageUrl: string | null;
  status: string;
  visibility: string;
  updatedAt: Date;
  ingestionJob: { sourceType: string } | null;
};

function toCard(r: CardRow): MyRecipeCardDTO {
  return {
    id: r.id,
    title: r.title,
    titleOriginal: r.titleOriginal,
    coverImageUrl: r.coverImageUrl,
    status: r.status as MyRecipeCardDTO['status'],
    visibility: r.visibility as MyRecipeCardDTO['visibility'],
    isLinkImport: r.ingestionJob?.sourceType === 'LINK',
    updatedAt: r.updatedAt.toISOString(),
  };
}

export const recipes = new Hono()
  // Kick off processing for an uploaded gallery video (already in R2 at `key`).
  .post('/ingest', async (c) => {
    const viewerId = getViewerId(c);
    const parsed = ingestBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);

    const job = await prisma.ingestionJob.create({
      data: { userId: viewerId, sourceType: 'VIDEO', sourceUrl: parsed.data.key, status: 'UPLOADING' },
      select: { id: true },
    });
    await enqueueExtraction({ jobId: job.id, key: parsed.data.key });
    return c.json({ jobId: job.id });
  })

  // Import a YouTube link as a PRIVATE document. Deduped globally by video id so
  // the same video is only ever extracted once.
  .post('/import-link', async (c) => {
    const viewerId = getViewerId(c);
    const parsed = importLinkBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);

    const videoId = parseYouTubeId(parsed.data.url);
    if (!videoId) return c.json({ error: 'Not a recognised YouTube URL' }, 400);

    const cached = await prisma.importedVideo.findUnique({
      where: { provider_videoId: { provider: 'youtube', videoId } },
    });

    // Already extracted once → build this user's private copy instantly, no AI.
    if (cached?.status === 'READY' && cached.structuredData) {
      const recipeId = await persistExtraction({
        authorId: viewerId,
        extraction: cached.structuredData as unknown as RecipeExtraction,
        sourceType: 'LINK',
        originalVideoUrl: cached.sourceUrl,
        status: 'PUBLISHED',
        visibility: 'PRIVATE',
      });
      await prisma.ingestionJob.create({
        data: { userId: viewerId, sourceType: 'LINK', sourceUrl: cached.sourceUrl, status: 'COMPLETE', recipeId },
      });
      return c.json({ recipeId, deduped: true });
    }

    // First time (or a previous failure): (re)create the cache row and process.
    const imported = await prisma.importedVideo.upsert({
      where: { provider_videoId: { provider: 'youtube', videoId } },
      create: { provider: 'youtube', videoId, sourceUrl: parsed.data.url, status: 'PENDING' },
      update: { status: 'PENDING', sourceUrl: parsed.data.url },
      select: { id: true },
    });
    const job = await prisma.ingestionJob.create({
      data: { userId: viewerId, sourceType: 'LINK', sourceUrl: parsed.data.url, status: 'UPLOADING' },
      select: { id: true },
    });
    await enqueueExtraction({ jobId: job.id, url: parsed.data.url, importedVideoId: imported.id });
    return c.json({ jobId: job.id, deduped: false });
  })

  // The Mine tab — everything the viewer created, grouped by state.
  .get('/mine', async (c) => {
    const viewerId = getViewerId(c);
    const [jobs, needsReview, published, privateRecipes] = await Promise.all([
      prisma.ingestionJob.findMany({
        where: { userId: viewerId, status: { in: [...ACTIVE_JOB_STATUSES] }, recipeId: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, sourceType: true, errorMessage: true, recipeId: true, createdAt: true },
      }),
      prisma.recipe.findMany({
        where: { authorId: viewerId, status: 'DRAFT' },
        orderBy: { updatedAt: 'desc' },
        select: cardSelect,
      }),
      prisma.recipe.findMany({
        where: { authorId: viewerId, status: 'PUBLISHED', visibility: 'PUBLIC' },
        orderBy: { updatedAt: 'desc' },
        select: cardSelect,
      }),
      prisma.recipe.findMany({
        where: { authorId: viewerId, status: 'PUBLISHED', visibility: 'PRIVATE' },
        orderBy: { updatedAt: 'desc' },
        select: cardSelect,
      }),
    ]);

    const processing: ProcessingJobDTO[] = jobs.map((j) => ({
      jobId: j.id,
      status: j.status as ProcessingJobDTO['status'],
      sourceType: j.sourceType as ProcessingJobDTO['sourceType'],
      title: null,
      recipeId: j.recipeId,
      errorMessage: j.errorMessage,
      createdAt: j.createdAt.toISOString(),
    }));

    const body: MyRecipesResponse = {
      processing,
      needsReview: needsReview.map(toCard),
      published: published.map(toCard),
      private: privateRecipes.map(toCard),
    };
    return c.json(body);
  })

  // Poll a single processing job (drives the Processing screen).
  .get('/jobs/:id', async (c) => {
    const viewerId = getViewerId(c);
    const job = await prisma.ingestionJob.findFirst({
      where: { id: c.req.param('id'), userId: viewerId },
      select: { id: true, status: true, sourceType: true, recipeId: true, errorMessage: true, createdAt: true },
    });
    if (!job) return c.json({ error: 'Job not found' }, 404);
    const dto: ProcessingJobDTO = {
      jobId: job.id,
      status: job.status as ProcessingJobDTO['status'],
      sourceType: job.sourceType as ProcessingJobDTO['sourceType'],
      title: null,
      recipeId: job.recipeId,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt.toISOString(),
    };
    return c.json(dto);
  })

  // Full recipe for the Review & publish screen.
  .get('/:id', async (c) => {
    const viewerId = getViewerId(c);
    const r = await prisma.recipe.findUnique({
      where: { id: c.req.param('id') },
      include: {
        ingredients: { orderBy: { orderIndex: 'asc' } },
        steps: { orderBy: { stepNumber: 'asc' } },
        ingestionJob: { select: { sourceType: true } },
      },
    });
    if (!r) return c.json({ error: 'Recipe not found' }, 404);
    const isOwner = r.authorId === viewerId;
    const isPublic = r.status === 'PUBLISHED' && r.visibility === 'PUBLIC';
    if (!isOwner && !isPublic) return c.json({ error: 'Not found' }, 404);

    let videoUrl: string | null = null;
    if (r.originalVideoUrl) {
      videoUrl = r.originalVideoUrl.startsWith('uploads/')
        ? await mediaStore.getSignedUrl(r.originalVideoUrl).catch(() => null)
        : r.originalVideoUrl;
    }

    const dto: RecipeDetailDTO = {
      id: r.id,
      title: r.title,
      titleOriginal: r.titleOriginal,
      description: r.description,
      status: r.status as RecipeDetailDTO['status'],
      visibility: r.visibility as RecipeDetailDTO['visibility'],
      originalLanguage: r.originalLanguage,
      totalTimeMinutes: r.totalTimeMinutes,
      baseServings: r.baseServings,
      isLinkImport: r.ingestionJob?.sourceType === 'LINK',
      videoUrl,
      ingredients: r.ingredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        nameOriginal: ing.nameOriginal,
        amount: ing.amount,
        unit: ing.unit,
        quantityNote: ing.quantityNote,
        substitutionNote: ing.substitutionNote,
        orderIndex: ing.orderIndex,
      })),
      steps: r.steps.map((s) => ({
        id: s.id,
        stepNumber: s.stepNumber,
        instruction: s.instruction,
        videoStartMs: s.videoStartMs,
        videoEndMs: s.videoEndMs,
      })),
    };
    return c.json(dto);
  })

  // Edit a recipe (review screen). Author-only. Ingredient/step arrays replace.
  .patch('/:id', async (c) => {
    const viewerId = getViewerId(c);
    const id = c.req.param('id');
    const parsed = updateBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);

    const existing = await prisma.recipe.findUnique({ where: { id }, select: { authorId: true } });
    if (!existing) return c.json({ error: 'Recipe not found' }, 404);
    if (existing.authorId !== viewerId) return c.json({ error: 'Not your recipe' }, 403);

    const { title, description, baseServings, totalTimeMinutes, ingredients, steps } = parsed.data;
    await prisma.$transaction(async (tx) => {
      await tx.recipe.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(baseServings !== undefined ? { baseServings } : {}),
          ...(totalTimeMinutes !== undefined ? { totalTimeMinutes } : {}),
        },
      });
      if (ingredients) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
        await tx.recipeIngredient.createMany({
          data: ingredients.map((ing, i) => ({
            recipeId: id,
            name: ing.name,
            nameOriginal: ing.nameOriginal ?? null,
            amount: ing.amount ?? null,
            unit: ing.unit ?? null,
            quantityNote: ing.quantityNote ?? null,
            substitutionNote: ing.substitutionNote ?? null,
            orderIndex: i,
          })),
        });
      }
      if (steps) {
        await tx.recipeStep.deleteMany({ where: { recipeId: id } });
        await tx.recipeStep.createMany({
          data: steps.map((s, i) => ({
            recipeId: id,
            stepNumber: i + 1,
            instruction: s.instruction,
            videoStartMs: s.videoStartMs ?? null,
            videoEndMs: s.videoEndMs ?? null,
          })),
        });
      }
    });
    return c.json({ ok: true });
  })

  // Publish (public) or save private. Link imports may never go public.
  .post('/:id/publish', async (c) => {
    const viewerId = getViewerId(c);
    const id = c.req.param('id');
    const parsed = publishBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);

    const r = await prisma.recipe.findUnique({
      where: { id },
      select: { authorId: true, publishedAt: true, ingestionJob: { select: { sourceType: true } } },
    });
    if (!r) return c.json({ error: 'Recipe not found' }, 404);
    if (r.authorId !== viewerId) return c.json({ error: 'Not your recipe' }, 403);
    if (parsed.data.visibility === 'PUBLIC' && r.ingestionJob?.sourceType === 'LINK') {
      return c.json({ error: 'Imported videos can only be saved privately.' }, 400);
    }

    await prisma.recipe.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        visibility: parsed.data.visibility,
        publishedAt: r.publishedAt ?? new Date(),
      },
    });
    return c.json({ ok: true });
  })

  // Delete a recipe (author-only). Cascades to steps/ingredients.
  .delete('/:id', async (c) => {
    const viewerId = getViewerId(c);
    const id = c.req.param('id');
    const r = await prisma.recipe.findUnique({ where: { id }, select: { authorId: true } });
    if (!r) return c.json({ error: 'Recipe not found' }, 404);
    if (r.authorId !== viewerId) return c.json({ error: 'Not your recipe' }, 403);
    await prisma.recipe.delete({ where: { id } });
    return c.json({ ok: true });
  });
