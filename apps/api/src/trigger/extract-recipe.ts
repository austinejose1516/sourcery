import { task } from '@trigger.dev/sdk';
import { type ExtractionPayload, runExtraction } from '../lib/extract-job';

/**
 * Background recipe extraction. Triggered from POST /recipes/ingest and
 * /recipes/import-link. Runs on trigger.dev infra and writes directly to
 * Postgres, so the dashboard env must carry the DB + R2 + Gemini secrets.
 */
export const extractRecipe = task({
  id: 'extract-recipe',
  maxDuration: 600,
  run: async (payload: ExtractionPayload) => {
    await runExtraction(payload);
  },
});
