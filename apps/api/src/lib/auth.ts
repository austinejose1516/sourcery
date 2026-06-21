import type { MiddlewareHandler } from 'hono';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../env';

/**
 * Supabase signs auth tokens with an asymmetric key (ECC P-256) and publishes
 * the public half at the JWKS endpoint below. `createRemoteJWKSet` fetches it
 * once and caches it in memory, refetching only when a token references a `kid`
 * it hasn't seen — so verification is local and adds no per-request network hop.
 */
// env.SUPABASE_URL is optional at the schema level (so the trigger.dev task
// indexer can import env without it); the API server genuinely needs it, so
// assert its presence here, at the one place it's used.
if (!env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is required to verify auth tokens (set it in the API environment).');
}
const SUPABASE_URL = env.SUPABASE_URL;

const JWKS = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

const ISSUER = `${SUPABASE_URL}/auth/v1`;

/** Hono context variables set by `requireAuth`. */
export type AuthVariables = { viewerId: string };

/**
 * Verifies a raw Supabase JWT (no "Bearer " prefix) and returns the user id
 * (`sub` claim), or null if the token is missing/invalid. Shared by the HTTP
 * middleware and the WebSocket upgrade handler (routes/voice-live.ts), which
 * can't use Hono middleware because the upgrade carries the token in a header
 * or query param rather than going through the normal request pipeline.
 */
export async function verifySupabaseJwt(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: 'authenticated',
    });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Verifies the `Authorization: Bearer <supabase-jwt>` header. On success the
 * verified user id (the token's `sub` claim) is stored on the context as
 * `viewerId` for route handlers to read via `getViewerId`. Missing or invalid
 * tokens are rejected with 401 — the body is never trusted for identity.
 */
export const requireAuth: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or malformed Authorization header' }, 401);
  }

  const viewerId = await verifySupabaseJwt(header.slice(7));
  if (!viewerId) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
  c.set('viewerId', viewerId);

  await next();
};
