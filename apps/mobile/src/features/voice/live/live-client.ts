import { authToken } from '@/lib/api-client';
import { WS_BASE } from '../api';
import type { VoiceToolDeclaration } from '../api';

/**
 * Client for the Gemini Live proxy (GET /voice/live on the Hono API). Speaks the
 * small JSON protocol defined in apps/api/src/lib/voice/live.ts. The proxy holds
 * GEMINI_API_KEY, so the client only ever talks to our own server.
 *
 * Auth rides as a `?token=` query param: React Native's WebSocket header support
 * is unreliable on Hermes, and Supabase access tokens are short-lived. The proxy
 * also accepts an Authorization header if we switch later.
 */

export type LiveEvent =
  | { type: 'ready' }
  | { type: 'audio'; data: string; mimeType: string }
  | { type: 'input_transcript'; text: string }
  | { type: 'output_transcript'; text: string }
  | { type: 'tool_call'; calls: { id?: string; name: string; args: Record<string, unknown> }[] }
  | { type: 'turn_complete' }
  | { type: 'interrupted' }
  | { type: 'error'; message: string };

export interface ToolResult {
  id?: string;
  name: string;
  result: string;
}

export interface LiveClient {
  /** Open the socket. Resolves once connected (before the session `start`). */
  connect: () => Promise<void>;
  /** Begin the Gemini session with the screen's actions + context. */
  start: (tools: VoiceToolDeclaration[], context: string) => void;
  sendAudio: (base64Pcm16: string) => void;
  sendToolResults: (results: ToolResult[]) => void;
  close: () => void;
}

export function createLiveClient(onEvent: (event: LiveEvent) => void): LiveClient {
  let ws: WebSocket | null = null;

  const sendJson = (obj: unknown) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  };

  const connect = async () => {
    const token = await authToken();
    if (!token) throw new Error('You need to be signed in to use voice.');

    await new Promise<void>((resolve, reject) => {
      const sock = new WebSocket(`${WS_BASE}/voice/live?token=${encodeURIComponent(token)}`);
      ws = sock;

      sock.onopen = () => resolve();
      sock.onerror = () => reject(new Error("Couldn't reach the voice service."));
      sock.onmessage = (evt) => {
        if (typeof evt.data !== 'string') return;
        try {
          onEvent(JSON.parse(evt.data) as LiveEvent);
        } catch {
          // ignore malformed frame
        }
      };
      sock.onclose = () => {
        if (ws === sock) ws = null;
      };
    });
  };

  return {
    connect,
    start: (tools, context) => sendJson({ type: 'start', tools, context }),
    sendAudio: (data) => sendJson({ type: 'audio', data }),
    sendToolResults: (results) =>
      sendJson({ type: 'tool_response', responses: results }),
    close: () => {
      try {
        sendJson({ type: 'end' });
        ws?.close();
      } catch {
        // already closed
      }
      ws = null;
    },
  };
}
