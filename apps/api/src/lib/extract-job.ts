import type { RecipeStatus, RecipeVisibility } from '@prisma/client';
import { getExtractor } from './extractor';
import { persistExtraction } from './persist-recipe';
import { prisma } from './prisma';
import { mediaStore } from './r2';

export interface ExtractionPayload {
  jobId: string;
  /** Owner of the job — used as the trigger.dev concurrency key. */
  userId?: string;
  /** R2 object key (gallery uploads). */
  key?: string;
  /** External video URL (link imports). */
  url?: string;
  /** ImportedVideo row to fill with the cached extraction (link imports). */
  importedVideoId?: string;
}

/**
 * The actual extraction work, shared by the trigger.dev task and the inline
 * fallback. Drives the IngestionJob through its status stages, runs the AI
 * extraction, persists the recipe, and (for link imports) caches the result.
 *
 * Uploads → a DRAFT recipe (Needs review). Links → a PUBLISHED + PRIVATE recipe
 * (a private document; never publishable publicly).
 */
/**
 * Where a finished extraction lands, by provenance:
 *
 *  - gallery upload      → DRAFT, PUBLIC   — theirs; review, then it's already public
 *  - link they own       → DRAFT, PRIVATE  — theirs; review, then they choose to publish
 *  - link they don't own → PUBLISHED, PRIVATE — a private document, never publishable
 *
 * Ownership of a link is established by a YouTube OAuth grant; see routes/youtube.ts.
 */
function destinationFor(isLink: boolean, sourceOwned: boolean): { status: RecipeStatus; visibility: RecipeVisibility } {
  if (!isLink) return { status: 'DRAFT', visibility: 'PUBLIC' };
  if (sourceOwned) return { status: 'DRAFT', visibility: 'PRIVATE' };
  return { status: 'PUBLISHED', visibility: 'PRIVATE' };
}

export async function runExtraction(payload: ExtractionPayload): Promise<void> {
  const { jobId, key, url, importedVideoId } = payload;
  try {
    const job = await prisma.ingestionJob.findUniqueOrThrow({ where: { id: jobId } });
    await prisma.ingestionJob.update({ where: { id: jobId }, data: { status: 'STRUCTURING' } });

    const videoUri = key ? await mediaStore.getSignedUrl(key) : url;
    if (!videoUri) throw new Error('runExtraction requires a key or url');

    const extraction = await getExtractor().extract({ videoUri });

    await prisma.ingestionJob.update({
      where: { id: jobId },
      data: { status: 'TRANSLATING', structuredData: extraction, sourceLanguage: extraction.source_language },
    });

    const isLink = job.sourceType === 'LINK';
    const recipeId = await persistExtraction({
      authorId: job.userId,
      extraction,
      sourceType: job.sourceType,
      originalVideoUrl: isLink ? url ?? job.sourceUrl : key ?? null,
      ...destinationFor(isLink, job.sourceOwned),
    });

    if (importedVideoId) {
      await prisma.importedVideo.update({
        where: { id: importedVideoId },
        data: { status: 'READY', structuredData: extraction, title: extraction.title.english },
      });
    }

    await prisma.ingestionJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETE', recipeId },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[extract-job] failed:', message);
    await prisma.ingestionJob
      .update({ where: { id: jobId }, data: { status: 'FAILED', errorMessage: message } })
      .catch(() => {});
    if (importedVideoId) {
      await prisma.importedVideo.update({ where: { id: importedVideoId }, data: { status: 'FAILED' } }).catch(() => {});
    }
    throw err;
  }
}
