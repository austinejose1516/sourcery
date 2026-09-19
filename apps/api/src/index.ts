import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
import { createApp } from './app';
import { env } from './env';
import { createVoiceLiveEvents } from './routes/voice-live';

/**
 * Node entrypoint — local dev (`pnpm dev`) and the machine the phone hits over
 * the LAN. Production runs on Cloudflare Workers (src/worker.ts) instead.
 *
 * createNodeWebSocket must wrap the SAME Hono instance the routes are
 * registered on, so the app is created here and passed INTO createApp.
 */
const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

createApp({ app, voiceLive: upgradeWebSocket(createVoiceLiveEvents) });

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[api] listening on http://localhost:${info.port}`);
});
injectWebSocket(server);
