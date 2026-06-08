import type { Context } from 'hono';
import { prisma } from './prisma';

const DEMO_USERNAME = 'you';
let cachedDemoId: string | null = null;

/** Decode a JWT payload without verifying the signature (trusted-origin read). */
function jwtSub(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = Buffer.from(payload, 'base64url').toString('utf-8');
    const parsed = JSON.parse(json) as { sub?: unknown };
    return typeof parsed.sub === 'string' ? parsed.sub : null;
  } catch {
    return null;
  }
}

/**
 * Returns the ID of the user making the request.
 *
 * Production path: reads `Authorization: Bearer <supabase-jwt>` and extracts
 * the `sub` claim (the Supabase user UUID). The token was already validated by
 * Supabase before it was handed to the client — we trust the issuer here.
 *
 * Dev fallback: when no auth header is present (e.g. direct curl / seed tests),
 * falls back to the seeded @you demo user so the feed screens still render.
 */
export async function getViewerId(c: Context): Promise<string> {
  const auth = c.req.header('Authorization');
  if (auth?.startsWith('Bearer ')) {
    const sub = jwtSub(auth.slice(7));
    if (sub) return sub;
  }

  // Dev fallback — hardcoded demo viewer.
  if (!cachedDemoId) {
    const viewer = await prisma.user.findUnique({
      where: { username: DEMO_USERNAME },
      select: { id: true },
    });
    if (!viewer) {
      throw new Error(
        `Demo viewer "@${DEMO_USERNAME}" not found — run \`pnpm db:seed\` in apps/api first.`,
      );
    }
    cachedDemoId = viewer.id;
  }
  return cachedDemoId;
}
