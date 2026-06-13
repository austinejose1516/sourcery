import type { RecipeCardDTO } from '@recipeer/core';
import { prisma } from './prisma';

// ---------------------------------------------------------------------------
// Shared recipe/author Prisma shapes + DTO mapper. Kept here so every list
// endpoint (feed, explore, search) returns identical recipe-card shapes.
// ---------------------------------------------------------------------------
export const authorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  country: true,
} as const;

export const recipeInclude = {
  author: { select: authorSelect },
  cuisine: { select: { name: true, slug: true } },
  region: { select: { name: true, country: true } },
} as const;

export type RecipeRow = {
  id: string;
  title: string;
  titleOriginal: string | null;
  description: string | null;
  coverImageUrl: string | null;
  endorsementCount: number;
  saveCount: number;
  publishedAt: Date | null;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null; country: string | null };
  cuisine: { name: string; slug: string } | null;
  region: { name: string; country: string } | null;
};

export function toRecipeCard(r: RecipeRow, savedIds: Set<string>): RecipeCardDTO {
  return {
    id: r.id,
    title: r.title,
    titleOriginal: r.titleOriginal,
    description: r.description,
    cuisine: r.cuisine,
    region: r.region,
    author: r.author,
    coverImageUrl: r.coverImageUrl,
    endorsementCount: r.endorsementCount,
    saveCount: r.saveCount,
    isSaved: savedIds.has(r.id),
  };
}

/** Recipe ids the viewer has saved, as a fast membership set. */
export async function viewerSavedIds(viewerId: string): Promise<Set<string>> {
  const rows = await prisma.recipeSave.findMany({
    where: { userId: viewerId },
    select: { recipeId: true },
  });
  return new Set(rows.map((s) => s.recipeId));
}

/** Post ids the viewer has liked, as a fast membership set. */
export async function viewerLikedPostIds(viewerId: string): Promise<Set<string>> {
  const rows = await prisma.postLike.findMany({
    where: { userId: viewerId },
    select: { postId: true },
  });
  return new Set(rows.map((l) => l.postId));
}

/** User ids the viewer follows, as a fast membership set. */
export async function viewerFollowingIds(viewerId: string): Promise<Set<string>> {
  const rows = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });
  return new Set(rows.map((f) => f.followingId));
}

/** Cuisine ids the viewer has marked as interests. */
export async function viewerCuisineIds(viewerId: string): Promise<string[]> {
  const rows = await prisma.userCuisineInterest.findMany({
    where: { userId: viewerId },
    select: { cuisineId: true },
  });
  return rows.map((i) => i.cuisineId);
}
