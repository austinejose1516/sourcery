/** Helpers shared by the recipe-extractor adapters. */

export interface FetchedVideo {
  bytes: Buffer;
  mime: string;
}

/** Video MIME by file extension — Gemini rejects generic application/octet-stream. */
const VIDEO_MIME_BY_EXT: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  avi: 'video/x-msvideo',
  flv: 'video/x-flv',
  wmv: 'video/x-ms-wmv',
  '3gp': 'video/3gpp',
};

/**
 * Resolve a real video MIME type. R2 often stores gallery uploads as
 * `application/octet-stream` (the client PUT didn't set a content type), which
 * Gemini rejects — so when the response header isn't a `video/*` type, fall
 * back to the file extension in the URL path, then to video/mp4.
 */
export function resolveVideoMime(uri: string, headerContentType: string | null): string {
  const headerMime = headerContentType?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (headerMime.startsWith('video/')) return headerMime;
  let pathname = uri;
  try {
    pathname = new URL(uri).pathname;
  } catch {
    // not a URL — use the raw string
  }
  const ext = pathname.split('.').pop()?.toLowerCase() ?? '';
  return VIDEO_MIME_BY_EXT[ext] ?? 'video/mp4';
}

/** Download the video bytes from a (signed) URL, server-side. */
export async function fetchVideoBytes(uri: string): Promise<FetchedVideo> {
  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error(`Failed to fetch video (${res.status}) from ${uri.slice(0, 120)}`);
  }
  const mime = resolveVideoMime(uri, res.headers.get('content-type'));
  const bytes = Buffer.from(await res.arrayBuffer());
  return { bytes, mime };
}

/** Models sometimes wrap JSON in ```json fences despite instructions. */
export function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fence ? fence[1] : trimmed;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Gemini ingests YouTube URLs natively, so we skip download/upload for them. */
export function isYouTubeUrl(uri: string): boolean {
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(uri);
}
