import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
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
import { voice } from './routes/voice';
import { createVoiceLiveEvents } from './routes/voice-live';

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// Open CORS for the spike — the mobile client hits this from a tunnel/LAN origin.
app.use('*', cors());

// Public — Railway's health check must not require auth.
app.route('/health', health);

// Streaming voice (Gemini Live) WebSocket. Registered BEFORE the requireAuth
// middleware below so the upgrade short-circuits it — the handler verifies the
// JWT itself (header or ?token=) since middleware can't gate a WS upgrade.
app.get('/voice/live', upgradeWebSocket(createVoiceLiveEvents));

// Everything else requires a verified Supabase JWT. Registered before the route
// handlers so the middleware runs first.
for (const prefix of ['/uploads', '/process', '/users', '/feed', '/explore', '/social', '/recipes', '/voice']) {
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

// Surface the real cause instead of Hono's opaque "Internal Server Error". Logs the
// full stack server-side and returns the message to the client (fine for the spike).
app.onError((err, c) => {
  console.error('[api] unhandled error', err);
  return c.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, 500);
});

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[api] listening on http://localhost:${info.port}`);
});
injectWebSocket(server);
