import type { MiddlewareHandler } from 'hono';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../env';

/**
 * Supabase signs auth tokens with an asymmetric key (ECC P-256) and publishes
 * the public half at the JWKS endpoint below. `createRemoteJWKSet` fetches it
 * once and caches it in memory, refetching only when a token references a `kid`
 * it hasn't seen — so verification is local and adds no per-request network hop.
 */
const JWKS = createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

const ISSUER = `${env.SUPABASE_URL}/auth/v1`;

/** Hono context variables set by `requireAuth`. */
export type AuthVariables = { viewerId: string };

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

  try {
    const { payload } = await jwtVerify(header.slice(7), JWKS, {
      issuer: ISSUER,
      audience: 'authenticated',
    });
    if (typeof payload.sub !== 'string') {
      return c.json({ error: 'Token is missing a subject claim' }, 401);
    }
    c.set('viewerId', payload.sub);
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  await next();
};
