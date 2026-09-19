import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import { requireAuth } from './lib/auth';
import { explore } from './routes/explore';
import { feed } from './routes/feed';
import { health } from './routes/health';
import { process as processRoute } from './routes/process';
import { recipes } from './routes/recipes';
import { social } from './routes/social';
import { uploads } from './routes/uploads';
import { users } from './routes/users';
import { voice } from './routes/voice';
import { youtube, youtubeOAuthCallback } from './routes/youtube';

/**
 * Shared Hono app used by both entrypoints: the Node server (src/index.ts —
 * local dev) and the Cloudflare Worker (src/worker.ts — production). All
 * routing, CORS, auth gating, and error handling lives here so the two
 * entrypoints can never drift apart.
 *
 * The one entrypoint-specific route is the /voice/live WebSocket upgrade:
 * Node wires it through @hono/node-ws; Workers returns 501 until the
 * Durable Object port lands. It is injected via `voiceLive`.
 */
export function createApp(opts: { app?: Hono; voiceLive: MiddlewareHandler }): Hono {
  const app = opts.app ?? new Hono();

  // Open CORS for the spike — the mobile client hits this from a tunnel/LAN origin.
  app.use('*', cors());

  // Public — platform health checks must not require auth.
  app.route('/health', health);

  // Streaming voice (Gemini Live) WebSocket. Registered BEFORE the requireAuth
  // middleware below so the upgrade short-circuits it — the handler verifies the
  // JWT itself (header or ?token=) since middleware can't gate a WS upgrade.
  app.get('/voice/live', opts.voiceLive);

  // Google's OAuth callback. Public for the same reason: it arrives as a browser
  // redirect carrying only ?code&state, with no Authorization header. The signed
  // single-use `state` row is what binds it back to a user.
  app.route('/youtube/oauth/callback', youtubeOAuthCallback);

  // Everything else requires a verified Supabase JWT. Registered before the route
  // handlers so the middleware runs first.
  for (const prefix of [
    '/uploads',
    '/process',
    '/users',
    '/feed',
    '/explore',
    '/social',
    '/recipes',
    '/voice',
    '/youtube',
  ]) {
    app.use(`${prefix}/*`, requireAuth);
  }

  app.route('/uploads', uploads);
  app.route('/process', processRoute);
  app.route('/users', users);
  app.route('/feed', feed);
  app.route('/explore', explore);
  app.route('/social', social);
  app.route('/recipes', recipes);
  app.route('/voice', voice);
  app.route('/youtube', youtube);

  // Surface the real cause instead of Hono's opaque "Internal Server Error". Logs the
  // full stack server-side and returns the message to the client (fine for the spike).
  app.onError((err, c) => {
    console.error('[api] unhandled error', err);
    return c.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, 500);
  });

  return app;
}
