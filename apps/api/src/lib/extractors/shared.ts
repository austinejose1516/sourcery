/** Helpers shared by the recipe-extractor adapters. */

export interface FetchedVideo {
  bytes: Buffer;
  mime: string;
}

/** Download the video bytes from a (signed) URL, server-side. */
export async function fetchVideoBytes(uri: string): Promise<FetchedVideo> {
  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error(`Failed to fetch video (${res.status}) from ${uri.slice(0, 120)}`);
  }
  const mime = res.headers.get('content-type')?.split(';')[0] || 'video/mp4';
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
