/**
 * Thin fetch wrappers over the YouTube Data API v3, matching how the repo already
 * hand-rolls its HTTP clients (cf. extractors/google.ts) rather than pulling in
 * the googleapis SDK.
 *
 * Quota: channels.list, playlistItems.list and videos.list cost 1 unit each
 * against a 10,000/day budget, so paging the picker is effectively free. Avoid
 * search.list (100 units) and captions.* (50–200 units).
 */

const BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeChannel {
  channelId: string;
  title: string;
  handle: string | null;
  thumbnailUrl: string | null;
  uploadsPlaylistId: string;
  videoCount: number;
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  durationSec: number;
  viewCount: number;
  publishedAt: string;
  privacyStatus: string; // 'public' | 'unlisted' | 'private'
  channelId: string;
}

async function ytGet<T>(path: string, accessToken: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`${BASE}/${path}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`YouTube ${path} ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  return (await res.json()) as T;
}

/** `mine=true` resolves to whichever channel the user picked at consent time. */
export async function getMyChannel(accessToken: string): Promise<YouTubeChannel> {
  const data = await ytGet<{
    items?: {
      id: string;
      snippet: { title: string; customUrl?: string; thumbnails?: Record<string, { url: string }> };
      contentDetails: { relatedPlaylists: { uploads: string } };
      statistics?: { videoCount?: string };
    }[];
  }>('channels', accessToken, { part: 'snippet,contentDetails,statistics', mine: 'true' });

  const channel = data.items?.[0];
  if (!channel) {
    throw new Error('This Google account has no YouTube channel. Create one, then reconnect.');
  }
  return {
    channelId: channel.id,
    title: channel.snippet.title,
    handle: channel.snippet.customUrl ?? null,
    thumbnailUrl: pickThumbnail(channel.snippet.thumbnails),
    uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads,
    videoCount: Number(channel.statistics?.videoCount ?? 0),
  };
}

/**
 * One page of the channel's uploads. playlistItems gives ids + titles; a single
 * videos.list then fills in duration, privacy and view count for the whole page.
 */
export async function listUploads(
  accessToken: string,
  uploadsPlaylistId: string,
  pageToken?: string,
): Promise<{ videos: YouTubeVideo[]; nextPageToken: string | null }> {
  const data = await ytGet<{
    items?: { contentDetails: { videoId: string } }[];
    nextPageToken?: string;
  }>('playlistItems', accessToken, {
    part: 'contentDetails',
    playlistId: uploadsPlaylistId,
    maxResults: '25',
    ...(pageToken ? { pageToken } : {}),
  });

  const ids = data.items?.map((i) => i.contentDetails.videoId) ?? [];
  return {
    videos: ids.length > 0 ? await getVideosByIds(accessToken, ids) : [],
    nextPageToken: data.nextPageToken ?? null,
  };
}

/**
 * Hydrate videos by id. Also the ownership check: callers compare each result's
 * `channelId` against the connected channel before importing anything.
 */
export async function getVideosByIds(accessToken: string, ids: string[]): Promise<YouTubeVideo[]> {
  if (ids.length === 0) return [];
  const data = await ytGet<{
    items?: {
      id: string;
      snippet: {
        title: string;
        channelId: string;
        publishedAt: string;
        thumbnails?: Record<string, { url: string }>;
      };
      contentDetails: { duration: string };
      status: { privacyStatus: string };
      statistics?: { viewCount?: string };
    }[];
  }>('videos', accessToken, {
    part: 'snippet,contentDetails,status,statistics',
    id: ids.join(','),
    maxResults: '50',
  });

  const byId = new Map(
    (data.items ?? []).map((v) => [
      v.id,
      {
        videoId: v.id,
        title: v.snippet.title,
        thumbnailUrl: pickThumbnail(v.snippet.thumbnails),
        durationSec: parseIsoDuration(v.contentDetails.duration),
        viewCount: Number(v.statistics?.viewCount ?? 0),
        publishedAt: v.snippet.publishedAt,
        privacyStatus: v.status.privacyStatus,
        channelId: v.snippet.channelId,
      } satisfies YouTubeVideo,
    ]),
  );

  // Preserve the caller's order (playlistItems returns newest-first).
  return ids.map((id) => byId.get(id)).filter((v): v is YouTubeVideo => v !== undefined);
}

function pickThumbnail(thumbnails?: Record<string, { url: string }>): string | null {
  if (!thumbnails) return null;
  for (const size of ['medium', 'high', 'standard', 'default']) {
    if (thumbnails[size]) return thumbnails[size].url;
  }
  return null;
}

/** ISO-8601 durations as YouTube returns them: `PT14M2S`, `PT1H3M`, `P1DT2H`. */
export function parseIsoDuration(iso: string): number {
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0);
}
