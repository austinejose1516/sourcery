import type { Context } from 'hono';

/**
 * Returns the id of the authenticated user making the request.
 *
 * The value is set by the `requireAuth` middleware (lib/auth.ts) from the
 * verified Supabase JWT `sub` claim. Every route except `/health` is mounted
 * behind that middleware, so `viewerId` is always present here — a miss means a
 * route was wired up without `requireAuth`, which is a programming error.
 */
export function getViewerId(c: Context): string {
  const viewerId = c.get('viewerId') as string | undefined;
  if (!viewerId) {
    throw new Error('getViewerId called on a route not protected by requireAuth');
  }
  return viewerId;
}
