import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Hono } from 'hono';
import { createApp } from './app';
import { setEnv } from './env';
import { setPrismaClient } from './lib/prisma';

/**
 * Cloudflare Workers entrypoint — the production host (deployed with
 * `wrangler deploy`; see wrangler.jsonc). The Node entrypoint (src/index.ts)
 * stays the source of truth for local dev and never runs here.
 *
 * Workers has no process-level env and cannot open raw TCP connections, so an
 * init middleware (below) does two things before any route handler runs:
 *   1. setEnv(c.env)         — vars + secrets, in place of dotenv
 *   2. setPrismaClient(...)  — Prisma over the Hyperdrive binding (Postgres)
 *
 * /voice/live returns 501 here: the Node `ws` bridge to Gemini Live needs a
 * Durable Object on Workers (hibernatable WebSockets). Tracked as Phase 4.
 */

/** Minimal shape of the Hyperdrive binding — enough for the adapter. */
interface HyperdriveBinding {
  connectionString: string;
}

type Bindings = { HYPERDRIVE_DB: HyperdriveBinding } & Record<string, string>;

const app = new Hono<{ Bindings: Bindings }>();

let prismaReady = false;
app.use('*', async (c, next) => {
  setEnv(c.env as unknown as Record<string, string | undefined>);
  if (!prismaReady) {
    prismaReady = true;
    setPrismaClient(
      new PrismaClient({
        adapter: new PrismaPg({ connectionString: c.env.HYPERDRIVE_DB.connectionString }),
      }),
    );
  }
  await next();
});

createApp({
  app: app as unknown as Parameters<typeof createApp>[0]['app'],
  voiceLive: async (c) =>
    c.json(
      { error: 'voice/live is not yet available on Cloudflare Workers (Durable Object port pending)' },
      501,
    ),
});

export default app;
