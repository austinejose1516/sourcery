import { Hono } from 'hono';
import { z } from 'zod';
import type {
  MyRecipeCardDTO,
  MyRecipesResponse,
  ProcessingJobDTO,
  RecipeDetailDTO,
  RecipeExtraction,
  RecipeVideoDTO,
  RecipeViewDTO,
  TriedRecipeCardDTO,
  VideoKindDTO,
} from '@recipeer/core';
import { formatQuantity } from '@recipeer/core';
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
const triedBody = z.object({
  photoUrl: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

/** Compose a human region label like "Kochi, Kerala" from a region + its parent. */
function regionLabel(region: { name: string; parentRegion?: { name: string } | null } | null): string | null {
  if (!region) return null;
  return region.parentRegion ? `${region.name}, ${region.parentRegion.name}` : region.name;
}
const updateBody = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  baseServings: z.number().int().positive().optional(),
  totalTimeMinutes: z.number().int().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
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

/** Sign a stored R2 key for viewing; passes through full external URLs and nulls. */
async function signMedia(value: string | null): Promise<string | null> {
  if (!value) return null;
  return value.startsWith('uploads/') ? await mediaStore.getSignedUrl(value).catch(() => null) : value;
}

/** Which player a recipe's video needs: an R2 upload, a YouTube link, or none. */
function videoKindOf(originalVideoUrl: string | null): VideoKindDTO | null {
  if (!originalVideoUrl) return null;
  if (originalVideoUrl.startsWith('uploads/')) return 'UPLOAD';
  return parseYouTubeId(originalVideoUrl) ? 'YOUTUBE' : null;
}

async function toCard(r: CardRow): Promise<MyRecipeCardDTO> {
  return {
    id: r.id,
    title: r.title,
    titleOriginal: r.titleOriginal,
    coverImageUrl: await signMedia(r.coverImageUrl),
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
      needsReview: await Promise.all(needsReview.map(toCard)),
      published: await Promise.all(published.map(toCard)),
      private: await Promise.all(privateRecipes.map(toCard)),
    };
    return c.json(body);
  })

  // The Tried tab — recipes the viewer has marked as cooked (deduped per recipe).
  .get('/tried', async (c) => {
    const viewerId = getViewerId(c);
    const rows = await prisma.triedThis.findMany({
      where: { userId: viewerId },
      orderBy: { createdAt: 'desc' },
      distinct: ['recipeId'],
      include: { recipe: { select: { id: true, title: true, titleOriginal: true, coverImageUrl: true } } },
    });
    const tried: TriedRecipeCardDTO[] = await Promise.all(
      rows.map(async (t) => ({
        triedId: t.id,
        triedAt: t.createdAt.toISOString(),
        recipe: {
          id: t.recipe.id,
          title: t.recipe.title,
          titleOriginal: t.recipe.titleOriginal,
          coverImageUrl: await signMedia(t.recipe.coverImageUrl),
        },
        photoUrl: await signMedia(t.photoUrl),
        note: t.note,
      })),
    );
    return c.json({ tried });
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

    const videoUrl = await signMedia(r.originalVideoUrl);
    const coverImageUrl = await signMedia(r.coverImageUrl);

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
      coverImageUrl,
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

  // Rich payload for the consumer Recipe Viewer + Cook mode. Same owner-or-public
  // gate as GET /:id, but joins contributor, taxonomy, social counts, and the
  // per-step cook data, with viewer-relative flags resolved server-side.
  .get('/:id/view', async (c) => {
    const viewerId = getViewerId(c);
    const r = await prisma.recipe.findUnique({
      where: { id: c.req.param('id') },
      include: {
        region: { include: { parentRegion: { select: { name: true } } } },
        cuisine: { select: { name: true } },
        dietaryTags: { include: { dietaryTag: { select: { name: true } } } },
        author: { include: { region: { include: { parentRegion: { select: { name: true } } } } } },
        ingredients: { orderBy: { orderIndex: 'asc' } },
        steps: {
          orderBy: { stepNumber: 'asc' },
          include: { stepIngredients: { orderBy: { orderIndex: 'asc' }, include: { ingredient: true } } },
        },
      },
    });
    if (!r) return c.json({ error: 'Recipe not found' }, 404);
    const isOwner = r.authorId === viewerId;
    const isPublic = r.status === 'PUBLISHED' && r.visibility === 'PUBLIC';
    if (!isOwner && !isPublic) return c.json({ error: 'Not found' }, 404);

    const [isSaved, triedByMe, isFollowing, contribRecipeCount, contribFollowerCount] = await Promise.all([
      prisma.recipeSave
        .findFirst({ where: { userId: viewerId, recipeId: r.id }, select: { recipeId: true } })
        .then(Boolean),
      prisma.triedThis
        .findFirst({ where: { userId: viewerId, recipeId: r.id }, select: { id: true } })
        .then(Boolean),
      prisma.follow
        .findFirst({ where: { followerId: viewerId, followingId: r.authorId }, select: { followerId: true } })
        .then(Boolean),
      prisma.recipe.count({ where: { authorId: r.authorId, status: 'PUBLISHED' } }),
      prisma.follow.count({ where: { followingId: r.authorId } }),
    ]);

    const dto: RecipeViewDTO = {
      id: r.id,
      title: r.title,
      titleOriginal: r.titleOriginal,
      description: r.description,
      region: r.region ? { name: r.region.name, country: r.region.country } : null,
      cuisine: r.cuisine ? { name: r.cuisine.name } : null,
      difficulty: r.difficulty as RecipeViewDTO['difficulty'],
      dietaryTags: r.dietaryTags.map((t) => t.dietaryTag.name),
      totalTimeMinutes: r.totalTimeMinutes,
      handsOnMinutes: r.prepTimeMinutes,
      baseServings: r.baseServings,
      endorsementCount: r.endorsementCount,
      cookCount: r.cookCount,
      saveCount: r.saveCount,
      isSaved,
      triedByMe,
      contributor: {
        id: r.author.id,
        displayName: r.author.displayName,
        username: r.author.username,
        avatarUrl: await signMedia(r.author.avatarUrl),
        region: regionLabel(r.author.region),
        country: r.author.country,
        recipeCount: contribRecipeCount,
        followerCount: contribFollowerCount,
        isFollowing,
      },
      coverImageUrl: await signMedia(r.coverImageUrl),
      videoKind: videoKindOf(r.originalVideoUrl),
      videoDurationMs: r.videoDurationMs,
      ingredients: r.ingredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        qty: formatQuantity(ing),
        substitutionNote: ing.substitutionNote,
      })),
      steps: r.steps.map((s) => ({
        id: s.id,
        stepNumber: s.stepNumber,
        summary: s.summary,
        instruction: s.instruction,
        timerSeconds: s.timerSeconds,
        timerLabel: s.timerLabel,
        caution:
          s.cautionLevel && s.cautionText
            ? { level: s.cautionLevel as NonNullable<RecipeViewDTO['steps'][number]['caution']>['level'], text: s.cautionText }
            : null,
        donenessCue: s.donenessCue,
        tipText: s.tipText,
        clip: s.videoStartMs != null && s.videoEndMs != null ? { startMs: s.videoStartMs, endMs: s.videoEndMs } : null,
        stepIngredients: s.stepIngredients.map((si) => ({
          name: si.ingredient.name,
          qty: si.noteOverride ?? formatQuantity(si.ingredient),
        })),
        voice: s.voiceQuestion && s.voiceAnswer ? { question: s.voiceQuestion, answer: s.voiceAnswer } : null,
      })),
    };
    return c.json(dto);
  })

  // On-demand playback descriptor for cook mode's video sheet. Fetched when the
  // sheet opens so the R2 presigned URL is always fresh (the /view payload only
  // carries `videoKind` for gating). 404 when the recipe has no playable video.
  .get('/:id/video', async (c) => {
    const viewerId = getViewerId(c);
    const r = await prisma.recipe.findUnique({
      where: { id: c.req.param('id') },
      select: { authorId: true, status: true, visibility: true, originalVideoUrl: true, videoDurationMs: true },
    });
    if (!r) return c.json({ error: 'Recipe not found' }, 404);
    const isOwner = r.authorId === viewerId;
    const isPublic = r.status === 'PUBLISHED' && r.visibility === 'PUBLIC';
    if (!isOwner && !isPublic) return c.json({ error: 'Not found' }, 404);

    const kind = videoKindOf(r.originalVideoUrl);
    if (!kind || !r.originalVideoUrl) return c.json({ error: 'No video' }, 404);

    const url = kind === 'UPLOAD' ? await signMedia(r.originalVideoUrl) : r.originalVideoUrl;
    if (!url) return c.json({ error: 'No video' }, 404);

    const dto: RecipeVideoDTO = {
      kind,
      url,
      youtubeId: kind === 'YOUTUBE' ? parseYouTubeId(r.originalVideoUrl) : null,
      durationMs: r.videoDurationMs,
    };
    return c.json(dto);
  })

  // Mark a recipe as tried (cook-mode complete screen). Idempotent per viewer:
  // reuses an existing tried post rather than stacking duplicates, and only bumps
  // cookCount the first time. Optional photo/note attach to the post.
  .post('/:id/tried', async (c) => {
    const viewerId = getViewerId(c);
    const id = c.req.param('id');
    const parsed = triedBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      select: { id: true, authorId: true, status: true, visibility: true, title: true, titleOriginal: true, coverImageUrl: true },
    });
    if (!recipe) return c.json({ error: 'Recipe not found' }, 404);
    const isOwner = recipe.authorId === viewerId;
    const isPublic = recipe.status === 'PUBLISHED' && recipe.visibility === 'PUBLIC';
    if (!isOwner && !isPublic) return c.json({ error: 'Not found' }, 404);

    const existing = await prisma.triedThis.findFirst({
      where: { userId: viewerId, recipeId: id },
      orderBy: { createdAt: 'desc' },
    });
    const tried = existing
      ? await prisma.triedThis.update({
          where: { id: existing.id },
          data: {
            ...(parsed.data.photoUrl !== undefined ? { photoUrl: parsed.data.photoUrl } : {}),
            ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
          },
        })
      : await prisma.$transaction(async (tx) => {
          const created = await tx.triedThis.create({
            data: { userId: viewerId, recipeId: id, photoUrl: parsed.data.photoUrl ?? null, note: parsed.data.note ?? null },
          });
          await tx.recipe.update({ where: { id }, data: { cookCount: { increment: 1 } } });
          return created;
        });

    const dto: TriedRecipeCardDTO = {
      triedId: tried.id,
      triedAt: tried.createdAt.toISOString(),
      recipe: {
        id: recipe.id,
        title: recipe.title,
        titleOriginal: recipe.titleOriginal,
        coverImageUrl: await signMedia(recipe.coverImageUrl),
      },
      photoUrl: await signMedia(tried.photoUrl),
      note: tried.note,
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

    const { title, description, baseServings, totalTimeMinutes, coverImageUrl, ingredients, steps } =
      parsed.data;
    await prisma.$transaction(async (tx) => {
      await tx.recipe.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(baseServings !== undefined ? { baseServings } : {}),
          ...(totalTimeMinutes !== undefined ? { totalTimeMinutes } : {}),
          ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
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

  // Dismiss a failed ingestion job (removes it from the Processing list).
  .delete('/jobs/:id', async (c) => {
    const viewerId = getViewerId(c);
    const id = c.req.param('id');
    const job = await prisma.ingestionJob.findFirst({ where: { id, userId: viewerId }, select: { status: true } });
    if (!job) return c.json({ error: 'Job not found' }, 404);
    if (job.status !== 'FAILED') return c.json({ error: 'Only failed jobs can be dismissed' }, 400);
    await prisma.ingestionJob.delete({ where: { id } });
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
