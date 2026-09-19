import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { z } from 'zod';

/**
 * Server-side env. On Node it is loaded from the repo-root .env (where the
 * Cloudflare / OpenRouter creds already live), with an optional apps/api/.env
 * override. On Cloudflare Workers there is no filesystem — the entrypoint
 * (src/worker.ts) injects the per-request bindings via setEnv().
 * These secrets are NEVER bundled into the mobile app (only EXPO_PUBLIC_* is).
 */
const isWorkers =
  typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';

if (!isWorkers) {
  const here = dirname(fileURLToPath(import.meta.url));
  config({ path: resolve(here, '../../../.env') }); // <repo>/.env
  config({ path: resolve(here, '../.env'), override: true }); // apps/api/.env (optional)
}

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
  // Streaming voice (the Gemini Live WebSocket proxied by GET /voice/live). Must
  // be a model that supports `bidiGenerateContent` for the current key — verify
  // with ListModels. As of 2026-06 the options are native-audio variants and
  // gemini-3.1-flash-live-preview (newest; chosen for function-calling quality).
  GEMINI_LIVE_MODEL: z.string().default('gemini-3.1-flash-live-preview'),

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

  // YouTube channel import (POST /youtube/*). The OAuth client is a Google Cloud
  // "Web application" client — the code exchange happens here, server-side, so the
  // secret never reaches the device. Optional so the trigger.dev task indexer and
  // the extraction worker (neither of which talks to YouTube) can boot without it;
  // requireYouTubeEnv() asserts them where the routes actually use them.
  WEB_CLIENT_ID: z.string().optional(),
  WEB_CLIENT_SECRET: z.string().optional(),
  // 32 bytes, base64 — the AES-256-GCM key for refresh tokens at rest. Rotating
  // this makes every stored token undecryptable and forces users to reconnect.
  YOUTUBE_TOKEN_ENC_KEY: z.string().optional(),
  // Must match an Authorized redirect URI on the OAuth client, character for
  // character, or Google fails the flow with redirect_uri_mismatch.
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url().default('http://localhost:8787/youtube/oauth/callback'),
  // Where the OAuth callback sends the user back into the app.
  YOUTUBE_OAUTH_APP_RETURN_URL: z.string().default('recipeer://youtube-connected'),

  // trigger.dev — background processing. When TRIGGER_SECRET_KEY is absent the
  // API runs extraction inline (fire-and-forget) so dev works with no setup.
  TRIGGER_SECRET_KEY: z.string().optional(),
  TRIGGER_PROJECT_REF: z.string().optional(),

  PORT: z.coerce.number().default(8787),
  R2_PRESIGN_EXPIRES: z.coerce.number().default(600),
});

function loadEnv(source: Record<string, string | undefined> = process.env) {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  • ${i.message}`).join('\n');
    throw new Error(`Invalid API environment configuration:\n${issues}`);
  }
  return {
    ...parsed.data,
    GEMINI_API_KEY: parsed.data.GEMINI_API_KEY ?? parsed.data.GOOGLE_AI_STUDIO_API_KEY,
  };
}

// `let` (not `const`): the Workers entrypoint swaps this per-request via
// setEnv(). ESM live bindings mean every importer sees the replacement.
export let env = loadEnv();
export type Env = typeof env;

/**
 * Cloudflare Workers: replaces the module-level env with the Worker's bindings
 * (vars + secrets + non-string bindings, which zod strips). Called by the init
 * middleware in src/worker.ts before any route handler runs.
 */
export function setEnv(raw: Record<string, string | undefined>) {
  env = loadEnv(raw);
}

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

/**
 * Asserts the YouTube OAuth credentials are present and the encryption key is a
 * usable AES-256 key. Called from the /youtube routes so the rest of the API (and
 * the trigger.dev worker) runs fine without them.
 */
export function requireYouTubeEnv() {
  const missing: string[] = [];
  if (!env.WEB_CLIENT_ID) missing.push('WEB_CLIENT_ID (Google OAuth "Web application" client id)');
  if (!env.WEB_CLIENT_SECRET) missing.push('WEB_CLIENT_SECRET (same OAuth client)');
  if (!env.YOUTUBE_TOKEN_ENC_KEY) missing.push('YOUTUBE_TOKEN_ENC_KEY (openssl rand -base64 32)');
  if (missing.length > 0) {
    throw new Error(`Missing YouTube configuration in .env:\n${missing.map((m) => `  • ${m}`).join('\n')}`);
  }

  const encKey = Buffer.from(env.YOUTUBE_TOKEN_ENC_KEY as string, 'base64');
  if (encKey.length !== 32) {
    throw new Error(
      `YOUTUBE_TOKEN_ENC_KEY must decode to 32 bytes for AES-256 (got ${encKey.length}). Regenerate with: openssl rand -base64 32`,
    );
  }

  return {
    clientId: env.WEB_CLIENT_ID as string,
    clientSecret: env.WEB_CLIENT_SECRET as string,
    redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI,
    appReturnUrl: env.YOUTUBE_OAUTH_APP_RETURN_URL,
    encKey,
  };
}
