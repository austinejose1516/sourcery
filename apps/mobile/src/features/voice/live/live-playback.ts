import { base64ToBytes, pcm16ToFloat32 } from './pcm';

/** Lazy native handle — see audio-capture.ts for why this isn't a top-level import. */
function rnAudio() {
  return require('react-native-audio-api') as typeof import('react-native-audio-api');
}

type AudioCtx = InstanceType<typeof import('react-native-audio-api').AudioContext>;

/**
 * Gapless streaming playback of Gemini's spoken reply. Audio arrives as a series
 * of base64 PCM chunks (24 kHz); each is scheduled on a running playhead cursor
 * so they butt up against each other without clicks. `stop()` cancels everything
 * scheduled — used for barge-in / interruption.
 */

const DEFAULT_RATE = 24000;

function rateFromMime(mime: string): number {
  const match = mime.match(/rate=(\d+)/);
  return match ? Number(match[1]) : DEFAULT_RATE;
}

export interface LivePlayback {
  enqueue: (base64: string, mimeType: string) => void;
  stop: () => void;
  destroy: () => void;
}

export function createLivePlayback(): LivePlayback {
  let ctx: AudioCtx | null = null;
  let playhead = 0;
  const sources = new Set<ReturnType<AudioCtx['createBufferSource']>>();

  const ensureCtx = () => {
    if (!ctx) {
      ctx = new (rnAudio().AudioContext)();
      playhead = ctx.currentTime;
    }
    return ctx;
  };

  return {
    enqueue: (base64, mimeType) => {
      const floats = pcm16ToFloat32(base64ToBytes(base64));
      if (floats.length === 0) return;

      const c = ensureCtx();
      const buffer = c.createBuffer(1, floats.length, rateFromMime(mimeType));
      buffer.getChannelData(0).set(floats);

      const source = c.createBufferSource();
      source.buffer = buffer;
      source.connect(c.destination);

      const startAt = Math.max(c.currentTime, playhead);
      source.start(startAt);
      playhead = startAt + buffer.duration;

      sources.add(source);
      source.onEnded = () => {
        sources.delete(source);
      };
    },
    stop: () => {
      for (const source of sources) {
        try {
          source.stop();
        } catch {
          // already stopped
        }
      }
      sources.clear();
      if (ctx) playhead = ctx.currentTime;
    },
    destroy: () => {
      for (const source of sources) {
        try {
          source.stop();
        } catch {
          // already stopped
        }
      }
      sources.clear();
      ctx?.close().catch(() => {});
      ctx = null;
    },
  };
}
