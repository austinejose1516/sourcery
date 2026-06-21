import { apiPost, BASE_URL } from '@/lib/api-client';
import type { VoiceAction } from './types';

/** WebSocket origin for the streaming voice proxy (GET /voice/live). */
export const WS_BASE = BASE_URL.replace(/^http/, 'ws');

/** Gemini function declaration sent to /voice/turn (handlers stay on-device). */
export interface VoiceToolDeclaration {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

export interface VoiceTurnRequest {
  transcript: string;
  tools: VoiceToolDeclaration[];
  context: string;
  history?: { role: 'user' | 'model'; text: string }[];
  /** Ask the server to also synthesize the spoken answer. Default true. */
  speak?: boolean;
}

export interface VoiceTurnResponse {
  toolCalls: { name: string; args: Record<string, unknown> }[];
  say: string | null;
  /** Base64 WAV of `say`, present when the server synthesized it. */
  audioBase64?: string;
  audioMime?: string;
}

export interface SpeakResponse {
  audioBase64: string;
  audioMime: string;
}

/** Strip handlers — only the declaration travels to the server. */
export function toToolDeclarations(actions: VoiceAction[]): VoiceToolDeclaration[] {
  return actions.map(({ name, description, parameters }) => ({ name, description, parameters }));
}

export const postVoiceTurn = (body: VoiceTurnRequest) =>
  apiPost<VoiceTurnResponse>('/voice/turn', body);

export const postVoiceSpeak = (text: string) =>
  apiPost<SpeakResponse>('/voice/speak', { text });
