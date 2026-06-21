import { env } from '../../env';
import { systemInstructionText } from './prompt';

/**
 * Gemini wiring for the hands-free voice assistant (POST /voice/*).
 *
 * Two capabilities, both on the same `generativelanguage` endpoint the recipe
 * extractor uses (see lib/extractors/google.ts):
 *  - `runVoiceTurn` — given the user's transcript, the on-screen context and the
 *    actions available right now (as function declarations), let Gemini decide:
 *    call an action (→ the app runs it) or answer in words.
 *  - `synthesizeSpeech` — speak a reply in Gemini's own voice. Gemini TTS returns
 *    raw 16-bit PCM; we wrap it in a WAV container so the client can play it
 *    straight away with expo-audio (no native PCM decoder needed).
 */

const BASE = env.GEMINI_BASE_URL.replace(/\/$/, '');

/** OpenAPI-subset function declaration, passed straight through to Gemini. */
export interface VoiceToolDeclaration {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

export interface VoiceTurnInput {
  transcript: string;
  /** Actions registered by the current screen, as Gemini function declarations. */
  tools: VoiceToolDeclaration[];
  /** Free-text description of what's on screen (recipe, current step, …). */
  context: string;
  /** Prior turns for short-term memory, oldest first. */
  history?: { role: 'user' | 'model'; text: string }[];
}

export interface VoiceToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface VoiceTurnResult {
  /** Actions Gemini wants the app to run. Empty when it chose to answer. */
  toolCalls: VoiceToolCall[];
  /** Spoken answer when no action matched; null when it called actions instead. */
  say: string | null;
}

function geminiRequest(model: string, body: unknown) {
  const key = env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  return fetch(`${BASE}/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

type GeminiPart = {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  inlineData?: { mimeType?: string; data?: string };
};
type GeminiResponse = { candidates?: { content?: { parts?: GeminiPart[] } }[] };

export async function runVoiceTurn(input: VoiceTurnInput): Promise<VoiceTurnResult> {
  const contents = [
    ...(input.history ?? []).map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    { role: 'user' as const, parts: [{ text: input.transcript }] },
  ];

  const body: Record<string, unknown> = {
    systemInstruction: {
      parts: [{ text: systemInstructionText(input.context) }],
    },
    contents,
    generationConfig: { temperature: 0.5 },
  };
  if (input.tools.length > 0) {
    body.tools = [{ functionDeclarations: input.tools }];
  }

  const res = await geminiRequest(env.GEMINI_VOICE_MODEL, body);
  if (!res.ok) {
    throw new Error(`Gemini voice turn ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  const payload = (await res.json()) as GeminiResponse;
  const parts = payload.candidates?.[0]?.content?.parts ?? [];

  const toolCalls: VoiceToolCall[] = parts
    .filter((p): p is GeminiPart & { functionCall: NonNullable<GeminiPart['functionCall']> } =>
      Boolean(p.functionCall),
    )
    .map((p) => ({ name: p.functionCall.name, args: p.functionCall.args ?? {} }));

  if (toolCalls.length > 0) return { toolCalls, say: null };

  const say = parts
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  return { toolCalls: [], say: say || null };
}

export interface SpeechAudio {
  /** Base64-encoded WAV (PCM 16-bit), ready for expo-audio. */
  audioBase64: string;
  audioMime: 'audio/wav';
}

export async function synthesizeSpeech(text: string): Promise<SpeechAudio> {
  const res = await geminiRequest(env.GEMINI_TTS_MODEL, {
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: env.GEMINI_TTS_VOICE } },
      },
    },
  });
  if (!res.ok) {
    throw new Error(`Gemini TTS ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  const payload = (await res.json()) as GeminiResponse;
  const audio = payload.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
  if (!audio?.data) {
    throw new Error('Gemini TTS returned no audio');
  }
  const pcm = Buffer.from(audio.data, 'base64');
  const wav = pcmToWav(pcm, sampleRateFromMime(audio.mimeType));
  return { audioBase64: wav.toString('base64'), audioMime: 'audio/wav' };
}

/** Gemini TTS reports e.g. "audio/L16;codec=pcm;rate=24000"; default 24kHz. */
function sampleRateFromMime(mime: string | undefined): number {
  const match = mime?.match(/rate=(\d+)/);
  return match ? Number(match[1]) : 24000;
}

/** Wrap mono 16-bit PCM in a minimal WAV (RIFF) container. */
function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM fmt chunk size
  header.writeUInt16LE(1, 20); // audio format = PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
