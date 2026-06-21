import { env } from '../../env';
import { systemInstructionText } from './prompt';
import type { VoiceToolDeclaration } from './gemini-voice';

/**
 * Wiring for the Gemini Live (BidiGenerateContent) WebSocket, proxied by
 * GET /voice/live (routes/voice-live.ts). The mobile client never talks to
 * Google directly — GEMINI_API_KEY stays server-side — so the proxy translates
 * between a small app-facing protocol and Gemini's wire format.
 *
 * App → proxy (JSON text frames):
 *   { type: 'start', tools, context }   open the upstream session
 *   { type: 'audio', data }             base64 int16 LE mono 16kHz PCM chunk
 *   { type: 'tool_response', responses } results of client-run actions
 *   { type: 'end' }                     close the session
 *
 * proxy → app (JSON text frames):
 *   { type: 'ready' }                          setup acknowledged; start the mic
 *   { type: 'audio', data, mimeType }          base64 PCM from Gemini (24kHz)
 *   { type: 'tool_call', calls }               actions Gemini wants the app to run
 *   { type: 'turn_complete' }                  model finished speaking
 *   { type: 'interrupted' }                    model output was interrupted
 *   { type: 'error', message }                 upstream/proxy failure
 */

const WS_BASE = env.GEMINI_BASE_URL.replace(/^http/, 'ws').replace(/\/$/, '');

export function liveUpstreamUrl(): string {
  const key = env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  return `${WS_BASE}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${key}`;
}

/** Build the first upstream message: BidiGenerateContentSetup. */
export function buildSetup(tools: VoiceToolDeclaration[], context: string) {
  const setup: Record<string, unknown> = {
    // Gemini wants the model id prefixed with "models/".
    model: `models/${env.GEMINI_LIVE_MODEL}`,
    generationConfig: { responseModalities: ['AUDIO'], temperature: 0.5 },
    systemInstruction: { parts: [{ text: systemInstructionText(context) }] },
    // Let Gemini detect end-of-turn from the audio stream (server-side VAD), so
    // the client only has to gate sessions with the wake word.
    realtimeInputConfig: { automaticActivityDetection: {} },
    // Ask for text transcripts of both sides so the overlay can show the cook's
    // words and the assistant's reply.
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  };
  if (tools.length > 0) {
    setup.tools = [{ functionDeclarations: tools }];
  }
  return { setup };
}

// ---- App-facing protocol ----------------------------------------------------

export interface ClientStart {
  type: 'start';
  tools: VoiceToolDeclaration[];
  context: string;
}
export interface ClientAudio {
  type: 'audio';
  data: string;
}
export interface ClientToolResponse {
  type: 'tool_response';
  responses: { id?: string; name: string; result: string }[];
}
export interface ClientEnd {
  type: 'end';
}
export type ClientMessage = ClientStart | ClientAudio | ClientToolResponse | ClientEnd;

/** Wrap a mic chunk as a Gemini realtimeInput message. */
export function realtimeAudio(dataBase64: string) {
  return { realtimeInput: { audio: { data: dataBase64, mimeType: 'audio/pcm;rate=16000' } } };
}

/** Wrap client action results as a Gemini toolResponse message. */
export function toolResponse(responses: ClientToolResponse['responses']) {
  return {
    toolResponse: {
      functionResponses: responses.map((r) => ({
        id: r.id,
        name: r.name,
        response: { result: r.result },
      })),
    },
  };
}

// ---- Gemini server message shape (partial) ----------------------------------

export interface GeminiServerMessage {
  setupComplete?: unknown;
  serverContent?: {
    modelTurn?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] };
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    turnComplete?: boolean;
    interrupted?: boolean;
  };
  toolCall?: { functionCalls?: { id?: string; name: string; args?: Record<string, unknown> }[] };
  toolCallCancellation?: { ids?: string[] };
}
