import { env } from '../env';
import { type ExtractionPayload, runExtraction } from './extract-job';

/**
 * Dispatches a recipe-extraction job. With TRIGGER_SECRET_KEY set, it hands the
 * work to trigger.dev (durable queue, retries, "leave the app" UX). Without it,
 * the work runs inline (fire-and-forget) so local dev needs no trigger.dev setup
 * — the route still returns immediately and the client polls job status.
 */
export async function enqueueExtraction(payload: ExtractionPayload): Promise<void> {
  if (env.TRIGGER_SECRET_KEY) {
    const { extractRecipe } = await import('../trigger/extract-recipe');
    await extractRecipe.trigger(payload);
    return;
  }
  console.warn('[jobs] TRIGGER_SECRET_KEY not set — running extraction inline.');
  void runExtraction(payload).catch((err) => {
    console.error('[jobs] inline extraction error:', err);
  });
}
