import { defineConfig } from '@trigger.dev/sdk/v3';

/**
 * trigger.dev project config. Set TRIGGER_PROJECT_REF (from the trigger.dev
 * dashboard) before deploying tasks. The deployed task environment also needs:
 * SUPABASE_DIRECT_URL, BUCKET_NAME, CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY, GEMINI_API_KEY, GEMINI_MODEL.
 */
export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? 'proj_set_me_in_env',
  dirs: ['./src/trigger'],
  maxDuration: 600, // a long video extraction can take a few minutes
});
