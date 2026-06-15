import { Hono } from 'hono';
import type {
  CollectionCardDTO,
  ExploreCookDTO,
  ExploreSearchResults,
  RecipeCardDTO,
} from '@recipeer/core';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  publishedPublic,
  recipeInclude,
  toRecipeCard,
  viewerCuisineIds,
  viewerFollowingIds,
  viewerSavedIds,
} from '../lib/recipe-card';
import { getViewerId } from '../lib/viewer';

const DIFFICULTIES = new Set(['EASY', 'MEDIUM', 'HARD']);

/** Parsed, validated Explore recipe filters from the querystring. */
interface RecipeFilters {
  q?: string;
  cuisine?: string;
  region?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  maxMinutes?: number;
  diet?: string;
}

function parseRecipeFilters(c: { req: { query: (k: string) => string | undefined } }): RecipeFilters {
  const q = c.req.query('q')?.trim();
  const difficultyRaw = c.req.query('difficulty')?.toUpperCase();
  const maxRaw = c.req.query('maxMinutes');
  const maxMinutes = maxRaw ? Number.parseInt(maxRaw, 10) : undefined;
  return {
    q: q || undefined,
    cuisine: c.req.query('cuisine')?.trim() || undefined,
    region: c.req.query('region')?.trim() || undefined,
    difficulty: difficultyRaw && DIFFICULTIES.has(difficultyRaw) ? (difficultyRaw as 'EASY' | 'MEDIUM' | 'HARD') : undefined,
    maxMinutes: Number.isFinite(maxMinutes) ? maxMinutes : undefined,
    diet: c.req.query('diet')?.trim() || undefined,
  };
}

/** Builds the Prisma `where` for a recipe search from validated filters. */
function recipeWhere(f: RecipeFilters): Prisma.RecipeWhereInput {
  const where: Prisma.RecipeWhereInput = { ...publishedPublic };
  if (f.cuisine) where.cuisine = { slug: f.cuisine };
  if (f.region) where.region = { name: f.region };
  if (f.difficulty) where.difficulty = f.difficulty;
  if (f.maxMinutes != null) where.totalTimeMinutes = { lte: f.maxMinutes };
  if (f.diet) where.dietaryTags = { some: { dietaryTag: { slug: f.diet } } };
  if (f.q) {
    const contains = { contains: f.q, mode: 'insensitive' as const };
    where.OR = [{ title: contains }, { titleOriginal: contains }, { description: contains }];
  }
  return where;
}

/**
 * Fetches recipe cards for the given filters, personalising the default order so
 * recipes in cuisines the viewer is interested in float to the top (stable).
 */
async function fetchRecipeCards(
  viewerId: string,
  filters: RecipeFilters,
  take: number,
): Promise<RecipeCardDTO[]> {
  const [rows, savedIds, interestIds] = await Promise.all([
    prisma.recipe.findMany({
      where: recipeWhere(filters),
      include: recipeInclude,
      orderBy: [{ endorsementCount: 'desc' }, { saveCount: 'desc' }],
      take,
    }),
    viewerSavedIds(viewerId),
    viewerCuisineIds(viewerId),
  ]);

  const interest = new Set(interestIds);
  const ranked = [...rows].sort((a, b) => {
    const am = a.cuisineId && interest.has(a.cuisineId) ? 1 : 0;
    const bm = b.cuisineId && interest.has(b.cuisineId) ? 1 : 0;
    return bm - am; // interest-matches first; Array.sort is stable for the rest
  });
  return ranked.map((r) => toRecipeCard(r, savedIds));
}

/** Shapes a cook row (user + recipe cuisines + counts) into an ExploreCookDTO. */
type CookRow = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  region: { name: string; country: string } | null;
  recipes: { cuisineId: string | null; cuisine: { name: string } | null }[];
  _count: { followers: number; recipes: number };
};

function toExploreCook(u: CookRow, followingIds: Set<string>): ExploreCookDTO {
  const specialties: string[] = [];
  for (const r of u.recipes) {
    const name = r.cuisine?.name;
    if (name && !specialties.includes(name)) specialties.push(name);
  }
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    region: u.region,
    specialties: specialties.slice(0, 3),
    recipeCount: u._count.recipes,
    followerCount: u._count.followers,
    isFollowing: followingIds.has(u.id),
  };
}

const cookSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  region: { select: { name: true, country: true } },
  recipes: {
    where: publishedPublic,
    select: { cuisineId: true, cuisine: { select: { name: true } } },
  },
  _count: { select: { followers: true, recipes: { where: publishedPublic } } },
} as const;

/**
 * Fetches cook cards, personalising the default order so cooks who publish in
 * the viewer's interest cuisines come first, then by follower count.
 */
async function fetchCookCards(viewerId: string, q: string | undefined, take: number): Promise<ExploreCookDTO[]> {
  const where: Prisma.UserWhereInput = {
    id: { not: viewerId },
    recipes: { some: publishedPublic },
  };
  if (q) {
    const contains = { contains: q, mode: 'insensitive' as const };
    where.OR = [{ displayName: contains }, { username: contains }];
  }

  const [rows, followingIds, interestIds] = await Promise.all([
    prisma.user.findMany({ where, select: cookSelect, take }),
    viewerFollowingIds(viewerId),
    viewerCuisineIds(viewerId),
  ]);

  const interest = new Set(interestIds);
  // Re-rank: interest-cuisine cooks first, then by follower count.
  const matchById = new Map(
    rows.map((u) => [u.id, u.recipes.some((r) => r.cuisineId && interest.has(r.cuisineId))]),
  );
  return rows
    .map((u) => toExploreCook(u, followingIds))
    .sort((a, b) => {
      const am = matchById.get(a.id) ? 1 : 0;
      const bm = matchById.get(b.id) ? 1 : 0;
      if (am !== bm) return bm - am;
      return b.followerCount - a.followerCount;
    });
}

function toCollectionCard(c: {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  owner: { displayName: string } | null;
  recipes: { recipe: { coverImageUrl: string | null } }[];
  _count: { recipes: number };
}): CollectionCardDTO {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    coverImageUrl: c.coverImageUrl,
    curatedBy: c.owner?.displayName ?? null,
    recipeCount: c._count.recipes,
    previewCovers: c.recipes.map((r) => r.recipe.coverImageUrl).filter((u): u is string => !!u),
  };
}

const collectionSelect = {
  id: true,
  title: true,
  description: true,
  coverImageUrl: true,
  owner: { select: { displayName: true } },
  recipes: {
    orderBy: { orderIndex: 'asc' as const },
    take: 3,
    select: { recipe: { select: { coverImageUrl: true } } },
  },
  _count: { select: { recipes: true } },
} as const;

async function fetchCollectionCards(q: string | undefined, take: number): Promise<CollectionCardDTO[]> {
  const where: Prisma.CollectionWhereInput = { isCurated: true };
  if (q) {
    const contains = { contains: q, mode: 'insensitive' as const };
    where.OR = [{ title: contains }, { description: contains }];
  }
  const rows = await prisma.collection.findMany({
    where,
    select: collectionSelect,
    orderBy: { createdAt: 'asc' },
    take,
  });
  return rows.map(toCollectionCard);
}

export const explore = new Hono()
  // Recipes tab — filterable, personalised 2-column grid.
  .get('/recipes', async (c) => {
    const viewerId = await getViewerId(c);
    const recipes = await fetchRecipeCards(viewerId, parseRecipeFilters(c), 40);
    return c.json({ recipes });
  })

  // Cooks tab — cooks with published recipes, personalised + viewer-relative follow.
  .get('/cooks', async (c) => {
    const viewerId = await getViewerId(c);
    const cooks = await fetchCookCards(viewerId, c.req.query('q')?.trim() || undefined, 30);
    return c.json({ cooks });
  })

  // Collections tab — curated ("by Sourcery") lists.
  .get('/collections', async (c) => {
    const collections = await fetchCollectionCards(undefined, 30);
    return c.json({ collections });
  })

  // Filter chips — dietary tags from the taxonomy table.
  .get('/filters', async (c) => {
    const dietary = await prisma.dietaryTag.findMany({
      select: { slug: true, name: true },
      orderBy: { name: 'asc' },
    });
    return c.json({ dietary });
  })

  // Holistic search — spans recipes, cooks and collections. Text-only for now
  // (Postgres ILIKE); this is the single seam where NL/Gemini can slot in later.
  .get('/search', async (c) => {
    const viewerId = await getViewerId(c);
    const q = c.req.query('q')?.trim();
    const empty: ExploreSearchResults = { recipes: [], cooks: [], collections: [] };
    if (!q || q.length < 2) return c.json(empty);

    const [recipes, cooks, collections] = await Promise.all([
      fetchRecipeCards(viewerId, { q }, 8),
      fetchCookCards(viewerId, q, 8),
      fetchCollectionCards(q, 8),
    ]);
    const results: ExploreSearchResults = { recipes, cooks, collections };
    return c.json(results);
  });
