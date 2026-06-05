import { Hono } from 'hono';
import { z } from 'zod';
import { getExtractor } from '../lib/extractor';
import { mediaStore } from '../lib/r2';

const processBody = z.object({ key: z.string().min(1) });
const processUrlBody = z.object({
  url: z.string().refine((v) => /^https?:\/\//.test(v), 'url must be a full http(s):// URL'),
});

async function extract(videoUri: string) {
  return getExtractor().extract({ videoUri });
}

function handleError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[process] extraction failed:', message);
  return { error: 'Extraction failed', detail: message };
}

/**
 * Synchronous extraction (V1 spike: no queue).
 * - POST /process     — { key }: resolve an uploaded R2 object to a signed URL.
 * - POST /process/url — { url }: a video/YouTube URL (Gemini ingests YouTube
 *   natively; other URLs are downloaded server-side). No R2 needed.
 */
export const process = new Hono()
  .post('/', async (c) => {
    const parsed = processBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);
    }
    try {
      const videoUri = await mediaStore.getSignedUrl(parsed.data.key);
      return c.json({ recipe: await extract(videoUri) });
    } catch (err) {
      return c.json(handleError(err), 502);
    }
  })
  .post('/url', async (c) => {
    const parsed = processUrlBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);
    }
    try {
      return c.json({ recipe: await extract(parsed.data.url) });
    } catch (err) {
      return c.json(handleError(err), 502);
    }
  });
