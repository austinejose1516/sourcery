import { Hono } from 'hono';
import { z } from 'zod';
import { ageFromDob, computeProfileMetrics } from '@recipeer/core';
import type { UserProfileDTO } from '@recipeer/core';
import { prisma } from '../lib/prisma';
import { getViewerId } from '../lib/viewer';

export const users = new Hono();

// The health/body-model fields collected in onboarding. Every field is optional
// so the step stays skippable and users can fill it in piecemeal later.
const healthProfileBody = z.object({
  sex: z.enum(['MALE', 'FEMALE']).nullish(),
  dateOfBirth: z.string().date().nullish(), // "YYYY-MM-DD"
  heightCm: z.number().positive().max(300).nullish(),
  weightKg: z.number().positive().max(650).nullish(),
  activityLevel: z.enum(['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE']).nullish(),
  dietGoal: z.enum(['LOSE', 'MAINTAIN', 'GAIN']).nullish(),
  allergens: z
    .array(z.enum(['PEANUTS', 'TREE_NUTS', 'MILK', 'EGG', 'WHEAT_GLUTEN', 'SOY', 'FISH', 'SHELLFISH', 'SESAME']))
    .optional(),
  dietaryPrefs: z.array(z.string()).optional(), // DietaryTag slugs
});

// A user row joined with its dietary-preference slugs — the shape both endpoints return.
type UserWithPrefs = Awaited<ReturnType<typeof findUserWithPrefs>>;

function findUserWithPrefs(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { dietaryPrefs: { include: { dietaryTag: { select: { slug: true } } } } },
  });
}

// Assemble the wire DTO, computing BMI + calorie/macro targets server-side so the
// client can render the callout immediately (it can also recompute from the raw fields).
function toProfileDto(u: NonNullable<UserWithPrefs>): UserProfileDTO {
  const dob = u.dateOfBirth ? u.dateOfBirth.toISOString().slice(0, 10) : null;
  const metrics = computeProfileMetrics({
    sex: u.sex,
    heightCm: u.heightCm,
    weightKg: u.weightKg,
    ageYears: u.dateOfBirth ? ageFromDob(u.dateOfBirth) : null,
    activityLevel: u.activityLevel,
    dietGoal: u.dietGoal,
  });
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    sex: u.sex,
    dateOfBirth: dob,
    heightCm: u.heightCm,
    weightKg: u.weightKg,
    activityLevel: u.activityLevel,
    dietGoal: u.dietGoal,
    allergens: u.allergens,
    dietaryPrefs: u.dietaryPrefs.map((p) => p.dietaryTag.slug),
    metrics,
  };
}

// The current viewer's full profile, including computed BMI + daily calorie/macro
// targets. Body-model fields are null until the user completes the health step.
users.get('/me', async (c) => {
  const userId = getViewerId(c);
  const user = await findUserWithPrefs(userId);
  if (!user) return c.json({ error: 'Profile not found' }, 404);
  return c.json(toProfileDto(user));
});

// Save the onboarding health answers (and later profile edits). Partial: only the
// provided fields change. dietaryPrefs (slugs) replace the join rows wholesale.
users.patch('/me', async (c) => {
  const userId = getViewerId(c);
  const parsed = healthProfileBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);
  const b = parsed.data;

  // Resolve dietary-preference slugs to tag ids up front (ignore unknown slugs).
  let prefTagIds: string[] | undefined;
  if (b.dietaryPrefs !== undefined) {
    const tags = await prisma.dietaryTag.findMany({
      where: { slug: { in: b.dietaryPrefs } },
      select: { id: true },
    });
    prefTagIds = tags.map((t) => t.id);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        ...(b.sex !== undefined ? { sex: b.sex } : {}),
        ...(b.dateOfBirth !== undefined ? { dateOfBirth: b.dateOfBirth ? new Date(b.dateOfBirth) : null } : {}),
        ...(b.heightCm !== undefined ? { heightCm: b.heightCm } : {}),
        ...(b.weightKg !== undefined ? { weightKg: b.weightKg } : {}),
        ...(b.activityLevel !== undefined ? { activityLevel: b.activityLevel } : {}),
        ...(b.dietGoal !== undefined ? { dietGoal: b.dietGoal } : {}),
        ...(b.allergens !== undefined ? { allergens: b.allergens } : {}),
      },
    });
    if (prefTagIds !== undefined) {
      await tx.userDietaryTag.deleteMany({ where: { userId } });
      if (prefTagIds.length > 0) {
        await tx.userDietaryTag.createMany({
          data: prefTagIds.map((dietaryTagId) => ({ userId, dietaryTagId })),
        });
      }
    }
  });

  const updated = await findUserWithPrefs(userId);
  return c.json(toProfileDto(updated!));
});

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
