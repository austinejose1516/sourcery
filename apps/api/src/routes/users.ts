import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { getViewerId } from '../lib/viewer';

export const users = new Hono();

// Called by the mobile app after every successful sign-in.
// Creates the profile if it doesn't exist yet (upsert); returns the current profile.
// The trigger handles sign-up, but this covers returning users and edge cases.
users.post('/sync', async (c) => {
  // Identity comes from the verified JWT, never the request body.
  const userId = getViewerId(c);
  const body = await c.req
    .json<{ displayName: string | null; email: string | null }>()
    .catch(() => ({ displayName: null, email: null }));
  const { displayName, email } = body;

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return c.json(existing);

  // Profile missing (shouldn't happen after trigger is applied, but safe fallback).
  const baseDisplay = displayName ?? (email ? email.split('@')[0] : 'cook');
  let baseUsername = baseDisplay.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 20) || 'cook';

  // Resolve username collision
  let finalUsername = baseUsername;
  let attempt = 0;
  while (await prisma.user.findUnique({ where: { username: finalUsername } })) {
    const suffix = Math.floor(Math.random() * 9000 + 1000);
    finalUsername = `${baseUsername.slice(0, 16)}${suffix}`;
    if (++attempt > 10) break;
  }

  const user = await prisma.user.create({
    data: {
      id: userId,
      username: finalUsername,
      displayName: baseDisplay,
      languages: ['en'],
    },
  });

  return c.json(user, 201);
});
