import { Hono } from 'hono';
import { z } from 'zod';
import type { PostCommentDTO, TriedThisCardDTO } from '@recipeer/core';
import { prisma } from '../lib/prisma';
import { getViewerId } from '../lib/viewer';

// All actions are performed AS the current viewer (the demo @you user for now).
// TODO: derive the actor from the authenticated JWT instead of getViewerId().

const followBody = z.object({ followingId: z.string().uuid() });
const saveBody = z.object({ recipeId: z.string().uuid() });
const likeBody = z.object({ postId: z.string().uuid() });
const commentBody = z.object({ postId: z.string().uuid(), body: z.string().trim().min(1).max(2000) });
const postBody = z.object({ recipeId: z.string().uuid(), note: z.string().trim().max(2000).nullish() });

// Author shape shared with the feed DTO mappers.
const authorSelect = { id: true, username: true, displayName: true, avatarUrl: true, country: true } as const;

async function parse<T>(c: { req: { json: () => Promise<unknown> } }, schema: z.ZodSchema<T>) {
  const result = schema.safeParse(await c.req.json().catch(() => ({})));
  return result;
}

export const social = new Hono()
  // Follow a cook (idempotent).
  .post('/follow', async (c) => {
    const parsed = await parse(c, followBody);
    if (!parsed.success) return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);
    const viewerId = await getViewerId(c);
    const { followingId } = parsed.data;
    if (followingId === viewerId) return c.json({ error: 'Cannot follow yourself' }, 400);

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: viewerId, followingId } },
      update: {},
      create: { followerId: viewerId, followingId },
    });
    return c.json({ following: true });
  })

  // Unfollow a cook (idempotent).
  .delete('/follow', async (c) => {
    const parsed = await parse(c, followBody);
    if (!parsed.success) return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);
    const viewerId = await getViewerId(c);
    const { followingId } = parsed.data;

    await prisma.follow.deleteMany({ where: { followerId: viewerId, followingId } });
    return c.json({ following: false });
  })

  // Save a recipe — creates the save and keeps the denormalized counter in step.
  .post('/save', async (c) => {
    const parsed = await parse(c, saveBody);
    if (!parsed.success) return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);
    const viewerId = await getViewerId(c);
    const { recipeId } = parsed.data;

    const existing = await prisma.recipeSave.findUnique({
      where: { userId_recipeId: { userId: viewerId, recipeId } },
    });
    let saveCount: number;
    if (existing) {
      const recipe = await prisma.recipe.findUnique({ where: { id: recipeId }, select: { saveCount: true } });
      saveCount = recipe?.saveCount ?? 0;
    } else {
      const [, recipe] = await prisma.$transaction([
        prisma.recipeSave.create({ data: { userId: viewerId, recipeId } }),
        prisma.recipe.update({ where: { id: recipeId }, data: { saveCount: { increment: 1 } }, select: { saveCount: true } }),
      ]);
      saveCount = recipe.saveCount;
    }
    return c.json({ saved: true, saveCount });
  })

  // Unsave a recipe.
  .delete('/save', async (c) => {
    const parsed = await parse(c, saveBody);
    if (!parsed.success) return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);
    const viewerId = await getViewerId(c);
    const { recipeId } = parsed.data;

    const existing = await prisma.recipeSave.findUnique({
      where: { userId_recipeId: { userId: viewerId, recipeId } },
    });
    let saveCount: number;
    if (existing) {
      const [, recipe] = await prisma.$transaction([
        prisma.recipeSave.delete({ where: { userId_recipeId: { userId: viewerId, recipeId } } }),
        prisma.recipe.update({ where: { id: recipeId }, data: { saveCount: { decrement: 1 } }, select: { saveCount: true } }),
      ]);
      saveCount = recipe.saveCount;
    } else {
      const recipe = await prisma.recipe.findUnique({ where: { id: recipeId }, select: { saveCount: true } });
      saveCount = recipe?.saveCount ?? 0;
    }
    return c.json({ saved: false, saveCount });
  })

  // Like a "tried this" post — creates the like and keeps likeCount in step.
  .post('/like', async (c) => {
    const parsed = await parse(c, likeBody);
    if (!parsed.success) return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);
    const viewerId = await getViewerId(c);
    const { postId } = parsed.data;

    const existing = await prisma.postLike.findUnique({
      where: { userId_postId: { userId: viewerId, postId } },
    });
    let likeCount: number;
    if (existing) {
      const post = await prisma.triedThis.findUnique({ where: { id: postId }, select: { likeCount: true } });
      likeCount = post?.likeCount ?? 0;
    } else {
      const [, post] = await prisma.$transaction([
        prisma.postLike.create({ data: { userId: viewerId, postId } }),
        prisma.triedThis.update({ where: { id: postId }, data: { likeCount: { increment: 1 } }, select: { likeCount: true } }),
      ]);
      likeCount = post.likeCount;
    }
    return c.json({ liked: true, likeCount });
  })

  // Unlike a "tried this" post.
  .delete('/like', async (c) => {
    const parsed = await parse(c, likeBody);
    if (!parsed.success) return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);
    const viewerId = await getViewerId(c);
    const { postId } = parsed.data;

    const existing = await prisma.postLike.findUnique({
      where: { userId_postId: { userId: viewerId, postId } },
    });
    let likeCount: number;
    if (existing) {
      const [, post] = await prisma.$transaction([
        prisma.postLike.delete({ where: { userId_postId: { userId: viewerId, postId } } }),
        prisma.triedThis.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } }, select: { likeCount: true } }),
      ]);
      likeCount = post.likeCount;
    } else {
      const post = await prisma.triedThis.findUnique({ where: { id: postId }, select: { likeCount: true } });
      likeCount = post?.likeCount ?? 0;
    }
    return c.json({ liked: false, likeCount });
  })

  // List the comments on a post, oldest-first.
  .get('/comments', async (c) => {
    const postId = c.req.query('postId');
    if (!postId) return c.json({ error: 'Missing postId' }, 400);

    const rows = await prisma.postComment.findMany({
      where: { postId },
      include: { user: { select: authorSelect } },
      orderBy: { createdAt: 'asc' },
    });
    const comments: PostCommentDTO[] = rows.map((r) => ({
      id: r.id,
      user: r.user,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
    }));
    return c.json({ comments });
  })

  // Add a comment to a post — keeps commentCount in step.
  .post('/comments', async (c) => {
    const parsed = await parse(c, commentBody);
    if (!parsed.success) return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);
    const viewerId = await getViewerId(c);
    const { postId, body } = parsed.data;

    const [comment, post] = await prisma.$transaction([
      prisma.postComment.create({
        data: { userId: viewerId, postId, body },
        include: { user: { select: authorSelect } },
      }),
      prisma.triedThis.update({ where: { id: postId }, data: { commentCount: { increment: 1 } }, select: { commentCount: true } }),
    ]);

    const commentOut: PostCommentDTO = {
      id: comment.id,
      user: comment.user,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
    };
    return c.json({ comment: commentOut, commentCount: post.commentCount });
  })

  // Compose a new "tried this" post against a recipe.
  .post('/posts', async (c) => {
    const parsed = await parse(c, postBody);
    if (!parsed.success) return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);
    const viewerId = await getViewerId(c);
    const { recipeId, note } = parsed.data;

    const created = await prisma.triedThis.create({
      data: { userId: viewerId, recipeId, note: note ?? null },
      include: {
        user: { select: authorSelect },
        recipe: { select: { id: true, title: true, author: { select: { displayName: true } } } },
      },
    });

    const post: TriedThisCardDTO = {
      id: created.id,
      user: created.user,
      note: created.note,
      photoUrl: created.photoUrl,
      createdAt: created.createdAt.toISOString(),
      recipe: created.recipe,
      likeCount: created.likeCount,
      commentCount: created.commentCount,
      isLiked: false,
    };
    return c.json({ post });
  });
