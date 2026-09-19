import { randomBytes } from 'node:crypto';
import type { RecipeExtraction } from '@recipeer/core';
import type { YouTubeConnection } from '@prisma/client';
import { Hono } from 'hono';
import { z } from 'zod';
import { requireYouTubeEnv } from '../env';
import { enqueueExtraction } from '../lib/jobs';
import { persistExtraction } from '../lib/persist-recipe';
import { prisma } from '../lib/prisma';
import { decryptToken, encryptToken } from '../lib/token-crypto';
import { getViewerId } from '../lib/viewer';
import { getMyChannel, getVideosByIds, listUploads } from '../lib/youtube-api';
import {
  YOUTUBE_SCOPE,
  YouTubeReauthRequiredError,
  buildAuthUrl,
  exchangeCode,
  refreshAccessToken,
  revoke,
} from '../lib/youtube-oauth';

/** How many videos one batch may import. See MAX_BATCH in the mobile picker. */
const MAX_BATCH = 5;

/** The OAuth state is single-use and short-lived; a stale one just means retry. */
const STATE_TTL_MS = 10 * 60 * 1000;

/** Jobs still in flight — used to badge a row as "Importing…" in the picker. */
const IN_FLIGHT_STATUSES = ['UPLOADING', 'TRANSCRIBING', 'STRUCTURING', 'TRANSLATING', 'REVIEW'] as const;

const importBody = z.object({
  videoIds: z.array(z.string().min(1)).min(1).max(MAX_BATCH),
});

function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Exchange the stored refresh token for a usable access token.
 *
 * Errors are returned rather than thrown: Hono ignores a sub-app's `onError`
 * when it's mounted with `app.route()`, so a thrown YouTubeReauthRequiredError
 * would surface to the client as a generic 500 from the root handler.
 */
async function accessTokenFor(
  connection: YouTubeConnection,
): Promise<{ ok: true; token: string } | { ok: false; reauth: true }> {
  try {
    return { ok: true, token: await refreshAccessToken(decryptToken(connection.refreshToken)) };
  } catch (err) {
    if (err instanceof YouTubeReauthRequiredError) return { ok: false, reauth: true };
    throw err;
  }
}

/** 409 tells the app to send the user through the connect screen. */
const NO_CONNECTION = { error: 'No YouTube channel connected', code: 'NO_CONNECTION' } as const;
/** 401 tells the app the stored grant is dead and must be re-granted. */
const REAUTH = { error: 'YouTube access expired. Reconnect your channel.', code: 'REAUTH' } as const;

/**
 * `POST /youtube/oauth/callback` can't exist — Google redirects the browser here
 * with no Authorization header — so the callback is registered separately in
 * index.ts, ahead of requireAuth. Everything in this router is authenticated.
 */
export const youtube = new Hono()
  /**
   * Start the consent flow. We hand back a URL instead of redirecting so this
   * route can stay behind requireAuth: a browser redirect can't carry the
   * Supabase bearer token, but the app can fetch a URL and then open it.
   */
  .post('/oauth/start', async (c) => {
    const viewerId = getViewerId(c);
    requireYouTubeEnv();

    // An abandoned flow (user backs out, Google rejects the request) leaves its
    // state row behind, since only the callback consumes them. Sweep as we go so
    // the table can't grow without bound.
    await prisma.youTubeOAuthState.deleteMany({ where: { expiresAt: { lt: new Date() } } });

    const state = randomBytes(32).toString('base64url');
    await prisma.youTubeOAuthState.create({
      data: { state, userId: viewerId, expiresAt: new Date(Date.now() + STATE_TTL_MS) },
    });

    return c.json({ authUrl: buildAuthUrl(state) });
  })

  .get('/connection', async (c) => {
    const viewerId = getViewerId(c);
    const connection = await prisma.youTubeConnection.findUnique({ where: { userId: viewerId } });
    if (!connection) return c.json({ connected: false as const });

    return c.json({
      connected: true as const,
      channelTitle: connection.channelTitle,
      channelHandle: connection.channelHandle,
      channelThumbUrl: connection.channelThumbUrl,
      videoCount: connection.videoCount,
    });
  })

  .delete('/connection', async (c) => {
    const viewerId = getViewerId(c);
    const connection = await prisma.youTubeConnection.findUnique({ where: { userId: viewerId } });
    if (!connection) return c.json({ ok: true });

    // Revoke at Google first; if that fails we keep the row so the user can retry
    // rather than silently leaving us with access they think they removed.
    await revoke(decryptToken(connection.refreshToken));
    await prisma.youTubeConnection.delete({ where: { id: connection.id } });
    return c.json({ ok: true });
  })

  /** One page of the viewer's own uploads, newest first. */
  .get('/videos', async (c) => {
    const viewerId = getViewerId(c);
    const connection = await prisma.youTubeConnection.findUnique({ where: { userId: viewerId } });
    if (!connection) return c.json(NO_CONNECTION, 409);

    const auth = await accessTokenFor(connection);
    if (!auth.ok) return c.json(REAUTH, 401);

    const pageToken = c.req.query('pageToken') || undefined;
    const { videos, nextPageToken } = await listUploads(auth.token, connection.uploadsPlaylistId, pageToken);
    const importState = await importStatesFor(viewerId, videos.map((v) => v.videoId));

    return c.json({
      videos: videos.map((v) => ({ ...v, importState: importState.get(v.videoId) ?? 'NONE' })),
      nextPageToken,
    });
  })

  /**
   * Import up to MAX_BATCH of the viewer's own uploads as reviewable drafts.
   *
   * The ownership gate lives here: we re-fetch every requested video from YouTube
   * and require its channelId to match the connected channel. A client that posts
   * someone else's video id gets a 403 and no job is created.
   */
  .post('/import', async (c) => {
    const viewerId = getViewerId(c);
    const parsed = importBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);

    const connection = await prisma.youTubeConnection.findUnique({ where: { userId: viewerId } });
    if (!connection) return c.json(NO_CONNECTION, 409);

    const auth = await accessTokenFor(connection);
    if (!auth.ok) return c.json(REAUTH, 401);

    const requested = [...new Set(parsed.data.videoIds)];
    const videos = await getVideosByIds(auth.token, requested);

    const missing = requested.filter((id) => !videos.some((v) => v.videoId === id));
    if (missing.length > 0) return c.json({ error: `Unknown video: ${missing.join(', ')}` }, 404);

    const foreign = videos.filter((v) => v.channelId !== connection.channelId);
    if (foreign.length > 0) {
      return c.json({ error: 'You can only import videos from your own channel' }, 403);
    }

    // Gemini reads YouTube URLs natively, but only public ones — reject here with
    // a clear reason instead of letting extraction fail minutes later.
    const notPublic = videos.filter((v) => v.privacyStatus !== 'public');
    if (notPublic.length > 0) {
      return c.json(
        { error: `Private and unlisted videos can't be imported: ${notPublic.map((v) => v.title).join(', ')}` },
        400,
      );
    }

    const results = [];
    for (const video of videos) {
      const url = watchUrl(video.videoId);
      const cached = await prisma.importedVideo.findUnique({
        where: { provider_videoId: { provider: 'youtube', videoId: video.videoId } },
      });

      // Someone may already have pasted this creator's video as a link. Reuse the
      // cached extraction to build their draft — same result, no AI call.
      if (cached?.status === 'READY' && cached.structuredData) {
        const recipeId = await persistExtraction({
          authorId: viewerId,
          extraction: cached.structuredData as unknown as RecipeExtraction,
          sourceType: 'LINK',
          originalVideoUrl: url,
          status: 'DRAFT',
          visibility: 'PRIVATE',
        });
        await prisma.ingestionJob.create({
          data: {
            userId: viewerId,
            sourceType: 'LINK',
            sourceUrl: url,
            sourceOwned: true,
            status: 'COMPLETE',
            recipeId,
          },
        });
        results.push({ videoId: video.videoId, recipeId, deduped: true });
        continue;
      }

      const imported = await prisma.importedVideo.upsert({
        where: { provider_videoId: { provider: 'youtube', videoId: video.videoId } },
        create: {
          provider: 'youtube',
          videoId: video.videoId,
          sourceUrl: url,
          status: 'PENDING',
          title: video.title,
          channel: connection.channelTitle,
          channelId: connection.channelId,
        },
        update: { status: 'PENDING', sourceUrl: url, channelId: connection.channelId },
        select: { id: true },
      });
      const job = await prisma.ingestionJob.create({
        data: { userId: viewerId, sourceType: 'LINK', sourceUrl: url, sourceOwned: true, status: 'UPLOADING' },
        select: { id: true },
      });
      await enqueueExtraction({ jobId: job.id, userId: viewerId, url, importedVideoId: imported.id });
      results.push({ videoId: video.videoId, jobId: job.id, deduped: false });
    }

    return c.json({ imported: results });
  });

/**
 * Which of these videos has the viewer already imported, or is importing now?
 * Matched on the video id appearing in the stored source URL, so a video first
 * pasted as a youtu.be link still counts as imported.
 */
async function importStatesFor(viewerId: string, videoIds: string[]): Promise<Map<string, 'IMPORTED' | 'IMPORTING'>> {
  const states = new Map<string, 'IMPORTED' | 'IMPORTING'>();
  if (videoIds.length === 0) return states;

  const [recipes, jobs] = await Promise.all([
    prisma.recipe.findMany({
      where: { authorId: viewerId, OR: videoIds.map((id) => ({ originalVideoUrl: { contains: id } })) },
      select: { originalVideoUrl: true },
    }),
    prisma.ingestionJob.findMany({
      where: {
        userId: viewerId,
        status: { in: [...IN_FLIGHT_STATUSES] },
        OR: videoIds.map((id) => ({ sourceUrl: { contains: id } })),
      },
      select: { sourceUrl: true },
    }),
  ]);

  for (const id of videoIds) {
    if (recipes.some((r) => r.originalVideoUrl?.includes(id))) states.set(id, 'IMPORTED');
    else if (jobs.some((j) => j.sourceUrl?.includes(id))) states.set(id, 'IMPORTING');
  }
  return states;
}

/**
 * `GET /youtube/oauth/callback` — public, because Google redirects the user's
 * browser here with only `code` and `state`. Registered ahead of requireAuth in
 * index.ts. The `state` row is what binds this callback to a Sourcery user.
 */
export const youtubeOAuthCallback = new Hono().get('/', async (c) => {
  const { appReturnUrl } = requireYouTubeEnv();
  const fail = (reason: string) => c.redirect(`${appReturnUrl}?status=error&reason=${encodeURIComponent(reason)}`);

  if (c.req.query('error')) return fail(c.req.query('error') as string);

  const code = c.req.query('code');
  const state = c.req.query('state');
  if (!code || !state) return fail('missing_code_or_state');

  // Single-use: deleting here means a replayed callback can't mint a second grant.
  const stateRow = await prisma.youTubeOAuthState.delete({ where: { state } }).catch(() => null);
  if (!stateRow) return fail('invalid_state');
  if (stateRow.expiresAt < new Date()) return fail('expired_state');

  try {
    const tokens = await exchangeCode(code);
    const channel = await getMyChannel(tokens.access_token);

    // One channel, one owner. Otherwise two accounts could both claim authorship
    // of the same uploads.
    const claimed = await prisma.youTubeConnection.findUnique({ where: { channelId: channel.channelId } });
    if (claimed && claimed.userId !== stateRow.userId) return fail('channel_already_connected');

    await prisma.youTubeConnection.upsert({
      where: { userId: stateRow.userId },
      create: {
        userId: stateRow.userId,
        channelId: channel.channelId,
        channelTitle: channel.title,
        channelHandle: channel.handle,
        channelThumbUrl: channel.thumbnailUrl,
        uploadsPlaylistId: channel.uploadsPlaylistId,
        videoCount: channel.videoCount,
        refreshToken: encryptToken(tokens.refresh_token as string),
        scope: tokens.scope ?? YOUTUBE_SCOPE,
      },
      update: {
        channelId: channel.channelId,
        channelTitle: channel.title,
        channelHandle: channel.handle,
        channelThumbUrl: channel.thumbnailUrl,
        uploadsPlaylistId: channel.uploadsPlaylistId,
        videoCount: channel.videoCount,
        refreshToken: encryptToken(tokens.refresh_token as string),
        scope: tokens.scope ?? YOUTUBE_SCOPE,
      },
    });

    return c.redirect(`${appReturnUrl}?status=ok`);
  } catch (err) {
    console.error('[youtube] oauth callback failed:', err);
    return fail(err instanceof Error ? err.message : 'unknown_error');
  }
});
