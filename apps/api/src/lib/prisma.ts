import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// `let` (not `const`): the Cloudflare Worker entrypoint (src/worker.ts) swaps
// this for a driver-adapter client (PrismaPg + Hyperdrive) on the first
// request. ESM live bindings mean every importer sees the replacement.
export let prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Cloudflare Workers: replaces the default engine-backed client with one that
 * routes Postgres through the Hyperdrive binding (Workers cannot open raw TCP
 * connections). No-op on Node, which keeps the engine-backed client above.
 */
export function setPrismaClient(client: PrismaClient) {
  prisma = client;
  globalForPrisma.prisma = client;
}
