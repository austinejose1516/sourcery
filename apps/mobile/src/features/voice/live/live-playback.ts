import { base64ToBytes, pcm16ToFloat32, resampleFloat32 } from './pcm';

/** Lazy native handle — see audio-capture.ts for why this isn't a top-level import. */
function rnAudio() {
  return require('react-native-audio-api') as typeof import('react-native-audio-api');
}

type AudioCtx = InstanceType<typeof import('react-native-audio-api').AudioContext>;

/**
 * Gapless streaming playback of Gemini's spoken reply. Audio arrives as base64
 * PCM chunks (24 kHz); each is scheduled on a running playhead cursor so they
 * butt up against each other without clicks. `stop()` cancels everything
 * scheduled — used for barge-in / interruption.
 *
 * react-native-audio-api plays an AudioBuffer at the context's rate WITHOUT
 * resampling, so a 24 kHz buffer in the device's native 48 kHz context plays ~2×
 * fast and an octave high. We use the device's native context rate and resample
 * the incoming 24 kHz audio up to it, so the buffer rate matches the context and
 * it plays at the correct speed/pitch. (Forcing a 24 kHz context produces broken
 * audio on-device, so we don't.)
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
  /** Milliseconds of audio still queued to play (so the mic can wait it out). */
  drainDelayMs: () => number;
}

export function createLivePlayback(): LivePlayback {
  let ctx: AudioCtx | null = null;
  let playhead = 0;
  const sources = new Set<ReturnType<AudioCtx['createBufferSource']>>();

  const ensureCtx = () => {
    if (!ctx) {
      ctx = new (rnAudio().AudioContext)(); // device-native rate (e.g. 48 kHz)
      playhead = ctx.currentTime;
    }
    return ctx;
  };

  return {
    enqueue: (base64, mimeType) => {
      const srcRate = rateFromMime(mimeType);
      let floats = pcm16ToFloat32(base64ToBytes(base64));
      if (floats.length === 0) return;

      const c = ensureCtx();
      // Resample to the context's native rate so the buffer plays at the correct
      // speed/pitch (react-native-audio-api doesn't resample buffers itself).
      if (srcRate !== c.sampleRate) floats = resampleFloat32(floats, srcRate, c.sampleRate);
      const buffer = c.createBuffer(1, floats.length, c.sampleRate);
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
    drainDelayMs: () => (ctx ? Math.max(0, (playhead - ctx.currentTime) * 1000) : 0),
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
