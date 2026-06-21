import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { z } from 'zod';

/**
 * Server-side env. Loaded from the repo-root .env (where the Cloudflare /
 * OpenRouter creds already live), with an optional apps/api/.env override.
 * These secrets are NEVER bundled into the mobile app (only EXPO_PUBLIC_* is).
 */
const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '../../../.env') }); // <repo>/.env
config({ path: resolve(here, '../.env'), override: true }); // apps/api/.env (optional)

const schema = z.object({
  // R2 / Cloudflare (names mirror what's already in root .env). Optional here so
  // the OpenRouter-only gate (scripts/try-extract) can run without them; r2.ts
  // asserts their presence when the store is actually constructed.
  BUCKET_NAME: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),

  // Recipe extraction — set ONE of these. Google AI Studio takes priority.
  // Accept either GOOGLE_AI_STUDIO_API_KEY or GEMINI_API_KEY (coalesced below).
  GOOGLE_AI_STUDIO_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-flash-lite-latest'),
  GEMINI_BASE_URL: z.string().default('https://generativelanguage.googleapis.com'),
  // Hands-free voice assistant (POST /voice/*). The "turn" model decides between
  // calling an app action (function call) and answering in words; the TTS model
  // speaks replies in Gemini's own voice.
  GEMINI_VOICE_MODEL: z.string().default('gemini-flash-lite-latest'),
  GEMINI_TTS_MODEL: z.string().default('gemini-2.5-flash-preview-tts'),
  GEMINI_TTS_VOICE: z.string().default('Kore'),
  // Streaming voice (the Gemini Live WebSocket proxied by GET /voice/live). The
  // half-cascade "...-live-2.5-flash" model is the reliable default for our
  // tool-driven assistant; the native-audio models (e.g.
  // gemini-3.1-flash-live-preview) sound better but historically fumble function
  // calling — swap via env once that's solid.
  GEMINI_LIVE_MODEL: z.string().default('gemini-live-2.5-flash'),

  // OpenRouter (fallback extractor).
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('google/gemini-3.5-flash'),
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),

  // Supabase project URL (e.g. https://xxx.supabase.co). Used to fetch the
  // JWKS and validate the issuer when verifying Supabase auth tokens. Optional
  // here so importing env (e.g. the trigger.dev task indexer, which only needs
  // DB/R2/Gemini) doesn't fail; auth.ts asserts it where the API actually uses it.
  SUPABASE_URL: z
    .string()
    .url('SUPABASE_URL must be the Supabase project URL, e.g. https://xxx.supabase.co')
    .optional(),

  // trigger.dev — background processing. When TRIGGER_SECRET_KEY is absent the
  // API runs extraction inline (fire-and-forget) so dev works with no setup.
  TRIGGER_SECRET_KEY: z.string().optional(),
  TRIGGER_PROJECT_REF: z.string().optional(),

  PORT: z.coerce.number().default(8787),
  R2_PRESIGN_EXPIRES: z.coerce.number().default(600),
});

function loadEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  • ${i.message}`).join('\n');
    throw new Error(`Invalid API environment configuration:\n${issues}`);
  }
  return {
    ...parsed.data,
    GEMINI_API_KEY: parsed.data.GEMINI_API_KEY ?? parsed.data.GOOGLE_AI_STUDIO_API_KEY,
  };
}

export const env = loadEnv();
export type Env = typeof env;

/**
 * Asserts the R2 credentials are present and returns them non-optional, with a
 * helpful message naming exactly what to add. Called from r2.ts so the gate
 * (OpenRouter only) isn't blocked by missing storage creds.
 */
export function requireR2Env() {
  const missing: string[] = [];
  if (!env.BUCKET_NAME) missing.push('BUCKET_NAME (R2 bucket)');
  if (!env.CLOUDFLARE_ACCOUNT_ID) missing.push('CLOUDFLARE_ACCOUNT_ID');
  if (!env.R2_ACCESS_KEY_ID)
    missing.push('R2_ACCESS_KEY_ID (Access Key ID from an R2 API token — not the Cloudflare API key)');
  if (!env.R2_SECRET_ACCESS_KEY)
    missing.push('R2_SECRET_ACCESS_KEY (Secret Access Key from an R2 API token)');
  if (missing.length > 0) {
    throw new Error(`Missing R2 configuration in .env:\n${missing.map((m) => `  • ${m}`).join('\n')}`);
  }
  return {
    bucket: env.BUCKET_NAME as string,
    accessKeyId: env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY as string,
    // Endpoint derived from the account id so a bucket-suffixed "S3 API" value
    // pasted from the dashboard can't double up the bucket.
    endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  };
}
