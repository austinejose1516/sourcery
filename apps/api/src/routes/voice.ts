import { Hono } from 'hono';
import { z } from 'zod';
import { runVoiceTurn, synthesizeSpeech } from '../lib/voice/gemini-voice';

/**
 * Hands-free voice assistant. The mobile app does speech-to-text on-device, then:
 *  - POST /voice/turn  — sends the transcript + on-screen context + the actions
 *    available right now; Gemini replies with either function calls (the app runs
 *    them) or a spoken answer (returned as text + Gemini-voice audio).
 *  - POST /voice/speak — synthesize arbitrary text (e.g. an action handler's
 *    confirmation) in Gemini's voice.
 *
 * GEMINI_API_KEY stays server-side; the client never sees it.
 */

const toolSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  parameters: z.record(z.string(), z.unknown()).optional(),
});

const turnBody = z.object({
  transcript: z.string().min(1),
  tools: z.array(toolSchema).default([]),
  context: z.string().default(''),
  history: z
    .array(z.object({ role: z.enum(['user', 'model']), text: z.string() }))
    .max(20)
    .optional(),
  /** When false, skip TTS and return text only (client speaks it itself). */
  speak: z.boolean().default(true),
});

const speakBody = z.object({ text: z.string().min(1).max(1000) });

export const voice = new Hono()
  .post('/turn', async (c) => {
    const parsed = turnBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);
    }
    const { transcript, tools, context, history, speak } = parsed.data;

    const result = await runVoiceTurn({ transcript, tools, context, history });

    if (result.say && speak) {
      const audio = await synthesizeSpeech(result.say);
      return c.json({ ...result, ...audio });
    }
    return c.json(result);
  })
  .post('/speak', async (c) => {
    const parsed = speakBody.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
      return c.json({ error: 'Invalid body', issues: parsed.error.issues }, 400);
    }
    const audio = await synthesizeSpeech(parsed.data.text);
    return c.json(audio);
  });
