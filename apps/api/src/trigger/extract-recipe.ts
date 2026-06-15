import { task } from '@trigger.dev/sdk';
import { type ExtractionPayload, runExtraction } from '../lib/extract-job';

/**
 * Background recipe extraction. Triggered from POST /recipes/ingest and
 * /recipes/import-link. Runs on trigger.dev infra and writes directly to
 * Postgres, so the dashboard env must carry the DB + R2 + Gemini secrets.
 */
export const extractRecipe = task({
  id: 'extract-recipe',
  // The extractor buffers the whole video into memory (fetchVideoBytes →
  // Buffer) before handing it to Gemini's Files API, so the default 0.5GB
  // machine OOMs on real clips. large-1x = 8GB headroom. (Longer-term: stream
  // the R2 download straight into the resumable upload to bound memory.)
  machine: 'large-1x',
  maxDuration: 600,
  run: async (payload: ExtractionPayload) => {
    await runExtraction(payload);
  },
});
