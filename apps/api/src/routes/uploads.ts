import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { z } from 'zod';
import { mediaStore } from '../lib/r2';

const presignBody = z.object({
  ext: z.string().default('mp4'),
});

/**
 * POST /uploads/presign — create an object key and return a presigned PUT URL.
 * The client uploads the video bytes directly to R2 with this URL; the API
 * never proxies the file.
 */
export const uploads = new Hono().post('/presign', async (c) => {
  const parsed = presignBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);
  }
  const { ext } = parsed.data;
  const key = `uploads/${randomUUID()}.${ext}`;
  try {
    const { url } = await mediaStore.presignUpload(key);
    return c.json({ key, url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[uploads] presign failed:', message);
    return c.json({ error: 'Could not create upload URL', detail: message }, 500);
  }
});
