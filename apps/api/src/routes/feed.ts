import { Hono } from 'hono';
import type { FeedItem, RecipeCardDTO, SuggestedCookDTO } from '@recipeer/core';
import { prisma } from '../lib/prisma';
import {
  authorSelect,
  publishedPublic,
  recipeInclude,
  toRecipeCard,
  viewerLikedPostIds,
  viewerSavedIds,
} from '../lib/recipe-card';
import { getViewerId } from '../lib/viewer';

export const feed = new Hono()
  // Tonight — newest published recipes across everyone.
  .get('/tonight', async (c) => {
    const viewerId = await getViewerId(c);
    const [recipes, savedIds] = await Promise.all([
      prisma.recipe.findMany({
        where: publishedPublic,
        include: recipeInclude,
        orderBy: { publishedAt: 'desc' },
        take: 30,
      }),
      viewerSavedIds(viewerId),
    ]);
    const items: FeedItem[] = recipes.map((r) => ({ kind: 'recipe', ...toRecipeCard(r, savedIds) }));
    return c.json({ items });
  })

  // Activity — the social timeline: "tried this" posts from cooks the viewer
  // follows plus the viewer's own posts, newest-first. Recipe cards live on
  // Trending/Tonight, not here.
  .get('/following', async (c) => {
    const viewerId = await getViewerId(c);
    const followsWhere = { followers: { some: { followerId: viewerId } } };

    const [tried, likedIds] = await Promise.all([
      prisma.triedThis.findMany({
        where: { OR: [{ user: followsWhere }, { userId: viewerId }] },
        include: {
          user: { select: authorSelect },
          recipe: { select: { id: true, title: true, author: { select: { displayName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      viewerLikedPostIds(viewerId),
    ]);

    const items: FeedItem[] = tried.map((t) => ({
      kind: 'tried' as const,
      id: t.id,
      user: t.user,
      note: t.note,
      photoUrl: t.photoUrl,
      createdAt: t.createdAt.toISOString(),
      recipe: t.recipe,
      likeCount: t.likeCount,
      commentCount: t.commentCount,
      isLiked: likedIds.has(t.id),
    }));

    return c.json({ items });
  })

  // Trending — published recipes ordered by endorsements then saves.
  .get('/trending', async (c) => {
    const viewerId = await getViewerId(c);
    const [recipes, savedIds] = await Promise.all([
      prisma.recipe.findMany({
        where: publishedPublic,
        include: recipeInclude,
        orderBy: [{ endorsementCount: 'desc' }, { saveCount: 'desc' }],
        take: 10,
      }),
      viewerSavedIds(viewerId),
    ]);
    const items: FeedItem[] = recipes.map((r) => ({ kind: 'recipe', ...toRecipeCard(r, savedIds) }));
    return c.json({ items });
  })

  // Suggestions (Cold-start) — cooks the viewer doesn't follow yet who cook in a
  // cuisine the viewer is interested in.
  .get('/suggestions', async (c) => {
    const viewerId = await getViewerId(c);
    const interests = await prisma.userCuisineInterest.findMany({
      where: { userId: viewerId },
      select: { cuisineId: true },
    });
    const cuisineIds = interests.map((i) => i.cuisineId);

    const cooks = await prisma.user.findMany({
      where: {
        id: { not: viewerId },
        followers: { none: { followerId: viewerId } },
        recipes: { some: { ...publishedPublic, ...(cuisineIds.length ? { cuisineId: { in: cuisineIds } } : {}) } },
      },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        region: { select: { name: true, country: true } },
        _count: { select: { recipes: { where: publishedPublic } } },
      },
      orderBy: { displayName: 'asc' },
      take: 20,
    });

    const cooksOut: SuggestedCookDTO[] = cooks.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      region: u.region,
      recipeCount: u._count.recipes,
      isFollowing: false,
    }));
    return c.json({ cooks: cooksOut });
  })

  // Most-loved (Cold-start) — top recipes by endorsements/saves.
  .get('/most-loved', async (c) => {
    const viewerId = await getViewerId(c);
    const [recipes, savedIds] = await Promise.all([
      prisma.recipe.findMany({
        where: publishedPublic,
        include: recipeInclude,
        orderBy: [{ endorsementCount: 'desc' }, { saveCount: 'desc' }],
        take: 8,
      }),
      viewerSavedIds(viewerId),
    ]);
    const recipesOut: RecipeCardDTO[] = recipes.map((r) => toRecipeCard(r, savedIds));
    return c.json({ recipes: recipesOut });
  });
