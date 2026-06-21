import type { Context } from 'hono';
import type { WSContext, WSEvents } from 'hono/ws';
import { WebSocket as UpstreamSocket } from 'ws';
import { verifySupabaseJwt } from '../lib/auth';
import type { VoiceToolDeclaration } from '../lib/voice/gemini-voice';
import {
  buildSetup,
  liveUpstreamUrl,
  realtimeAudio,
  toolResponse,
  type ClientMessage,
  type GeminiServerMessage,
} from '../lib/voice/live';

/**
 * WebSocket proxy for the Gemini Live streaming voice assistant. Authenticates
 * the Supabase JWT on the upgrade (header or ?token=, since the upgrade can't
 * run the normal requireAuth middleware), then bridges the app's small protocol
 * to Gemini's BidiGenerateContent socket. See lib/voice/live.ts for the formats.
 *
 * Used with @hono/node-ws: app.get('/voice/live', upgradeWebSocket(createVoiceLiveEvents)).
 */
export function createVoiceLiveEvents(c: Context): WSEvents {
  const bearer = c.req.header('Authorization');
  const token = c.req.query('token') ?? (bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined);

  let authed = false;
  let upstream: UpstreamSocket | null = null;
  /** Audio chunks that arrived before the upstream finished connecting. */
  const pending: string[] = [];

  const closeUpstream = () => {
    if (upstream) {
      try {
        upstream.close();
      } catch {
        // already closing
      }
      upstream = null;
    }
  };

  const send = (client: WSContext, msg: unknown) => {
    try {
      client.send(JSON.stringify(msg));
    } catch {
      // client gone
    }
  };

  const openUpstream = (client: WSContext, tools: VoiceToolDeclaration[], context: string) => {
    const sock = new UpstreamSocket(liveUpstreamUrl());
    upstream = sock;

    sock.on('open', () => {
      sock.send(JSON.stringify(buildSetup(tools, context)));
    });

    sock.on('message', (raw) => {
      let msg: GeminiServerMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.setupComplete !== undefined) {
        // Flush any audio captured while connecting, then tell the app to record.
        for (const data of pending.splice(0)) sock.send(JSON.stringify(realtimeAudio(data)));
        send(client, { type: 'ready' });
        return;
      }

      if (msg.serverContent) {
        for (const part of msg.serverContent.modelTurn?.parts ?? []) {
          if (part.inlineData?.data) {
            send(client, {
              type: 'audio',
              data: part.inlineData.data,
              mimeType: part.inlineData.mimeType ?? 'audio/pcm;rate=24000',
            });
          }
        }
        const inputText = msg.serverContent.inputTranscription?.text;
        if (inputText) send(client, { type: 'input_transcript', text: inputText });
        const outputText = msg.serverContent.outputTranscription?.text;
        if (outputText) send(client, { type: 'output_transcript', text: outputText });
        if (msg.serverContent.interrupted) send(client, { type: 'interrupted' });
        if (msg.serverContent.turnComplete) send(client, { type: 'turn_complete' });
      }

      if (msg.toolCall?.functionCalls?.length) {
        send(client, {
          type: 'tool_call',
          calls: msg.toolCall.functionCalls.map((fc) => ({
            id: fc.id,
            name: fc.name,
            args: fc.args ?? {},
          })),
        });
      }

      if (msg.toolCallCancellation) {
        send(client, { type: 'interrupted' });
      }
    });

    sock.on('error', (err) => {
      send(client, { type: 'error', message: err instanceof Error ? err.message : 'upstream error' });
    });

    sock.on('close', (code) => {
      send(client, { type: 'error', message: `upstream closed (${code})` });
      upstream = null;
    });
  };

  return {
    async onOpen(_evt, ws) {
      const viewerId = await verifySupabaseJwt(token);
      if (!viewerId) {
        send(ws, { type: 'error', message: 'unauthorized' });
        ws.close(1008, 'unauthorized');
        return;
      }
      authed = true;
    },

    onMessage(evt, ws) {
      if (!authed) return;
      const raw = typeof evt.data === 'string' ? evt.data : evt.data.toString();
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }

      switch (msg.type) {
        case 'start':
          closeUpstream();
          pending.length = 0;
          openUpstream(ws, msg.tools ?? [], msg.context ?? '');
          break;
        case 'audio':
          if (upstream?.readyState === UpstreamSocket.OPEN) {
            upstream.send(JSON.stringify(realtimeAudio(msg.data)));
          } else {
            pending.push(msg.data); // connecting; flush on setupComplete
          }
          break;
        case 'tool_response':
          if (upstream?.readyState === UpstreamSocket.OPEN) {
            upstream.send(JSON.stringify(toolResponse(msg.responses)));
          }
          break;
        case 'end':
          closeUpstream();
          break;
      }
    },

    onClose() {
      closeUpstream();
    },

    onError() {
      closeUpstream();
    },
  };
}
