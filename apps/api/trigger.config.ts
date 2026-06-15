import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { syncEnvVars } from '@trigger.dev/build/extensions/core';
import { prismaExtension } from '@trigger.dev/build/extensions/prisma';
import { defineConfig } from '@trigger.dev/sdk';

/**
 * Env vars the deployed extract-recipe task needs at runtime. Mirrors the
 * runtime requirements in src/env.ts: DB (Supabase), R2 (Cloudflare), Gemini.
 * GEMINI_MODEL is optional (env.ts has a default).
 */
const WORKER_KEYS = [
  'SUPABASE_DIRECT_URL',
  'BUCKET_NAME',
  'CLOUDFLARE_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'GOOGLE_AI_STUDIO_API_KEY',
  'GEMINI_MODEL',
] as const;

/** Tiny .env parser: KEY=VALUE, skips comments/blanks, strips surrounding quotes. */
function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

/**
 * trigger.dev project config. On deploy, syncEnvVars uploads the worker secrets
 * to the target environment so the task can reach Postgres + R2 + Gemini. It
 * reads them the same way src/env.ts does: repo-root .env first, then
 * apps/api/.env (override). R2_* live only in the repo-root .env.
 */
export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? 'proj_endqgjrlzyzthhiisepz',
  dirs: ['./src/trigger'],
  maxDuration: 600, // a long video extraction can take a few minutes
  build: {
    extensions: [
      // Regenerate the Prisma client for the Linux deploy target during build —
      // otherwise the bundled macOS engine can't run on trigger.dev's workers.
      prismaExtension({ mode: 'legacy', schema: 'prisma/schema.prisma', version: '6.19.3' }),
      syncEnvVars(() => {
        const cwd = process.cwd();
        // Candidate locations for repo-root .env and apps/api/.env across the
        // cwd the deploy might run from (apps/api or repo root).
        const rootEnv = {
          ...parseEnvFile(resolve(cwd, '../../.env')), // cwd = apps/api
          ...parseEnvFile(resolve(cwd, '.env')), // cwd = repo root
        };
        const apiEnv = {
          ...parseEnvFile(resolve(cwd, '.env')), // cwd = apps/api
          ...parseEnvFile(resolve(cwd, 'apps/api/.env')), // cwd = repo root
        };
        const merged = { ...rootEnv, ...apiEnv };
        const result: Record<string, string> = {};
        for (const key of WORKER_KEYS) {
          if (merged[key]) result[key] = merged[key];
        }
        const found = Object.keys(result);
        console.log(`[syncEnvVars] uploading ${found.length} vars: ${found.join(', ') || '(none found!)'}`);
        return result;
      }),
    ],
  },
});
