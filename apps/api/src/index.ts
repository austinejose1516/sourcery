import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { env } from './env';
import { requireAuth } from './lib/auth';
import { explore } from './routes/explore';
import { feed } from './routes/feed';
import { health } from './routes/health';
import { process as processRoute } from './routes/process';
import { recipes } from './routes/recipes';
import { social } from './routes/social';
import { uploads } from './routes/uploads';
import { users } from './routes/users';

const app = new Hono();

// Open CORS for the spike — the mobile client hits this from a tunnel/LAN origin.
app.use('*', cors());

// Public — Railway's health check must not require auth.
app.route('/health', health);

// Everything else requires a verified Supabase JWT. Registered before the route
// handlers so the middleware runs first.
for (const prefix of ['/uploads', '/process', '/users', '/feed', '/explore', '/social', '/recipes']) {
  app.use(`${prefix}/*`, requireAuth);
}

app.route('/uploads', uploads);
app.route('/process', processRoute);
app.route('/users', users);
app.route('/feed', feed);
app.route('/explore', explore);
app.route('/social', social);
app.route('/recipes', recipes);

// Surface the real cause instead of Hono's opaque "Internal Server Error". Logs the
// full stack server-side and returns the message to the client (fine for the spike).
app.onError((err, c) => {
  console.error('[api] unhandled error', err);
  return c.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, 500);
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[api] listening on http://localhost:${info.port}`);
});
