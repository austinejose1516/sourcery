import { bytesToBase64, floatTo16BitPCM, resampleFloat32 } from './pcm';

/**
 * Load react-native-audio-api lazily (only when a session actually starts), not
 * at module import. Its JSI bindings don't survive a full JS reload, and a
 * top-level import would crash the whole app on boot/reload if the native module
 * is momentarily unavailable. Deferring it keeps boot resilient and lets any
 * failure surface in the voice overlay instead of taking down the app.
 */
function rnAudio() {
  return require('react-native-audio-api') as typeof import('react-native-audio-api');
}

/**
 * Mic capture for the Gemini Live session. Pulls float32 PCM from
 * react-native-audio-api's AudioRecorder, converts to the int16 16 kHz mono the
 * Live API wants, and hands each chunk to `onChunk` as base64. Half-duplex:
 * `pause()` keeps the mic session open but drops chunks while the assistant
 * speaks, so we don't stream our own voice back.
 */

const TARGET_RATE = 16000;
/** ~100 ms at 16 kHz — low latency without hammering the JS thread. */
const BUFFER_LENGTH = 1600;

export interface MicCapture {
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

/** Ask for mic access. Returns true if granted. */
export async function requestMicPermission(): Promise<boolean> {
  const status = await rnAudio().AudioManager.requestRecordingPermissions();
  return status === 'Granted';
}

/**
 * Put the iOS audio session into play-and-record so we can capture and play the
 * reply at once, audible through the silent switch (kitchens run muted).
 */
export function configureVoiceSession(): void {
  rnAudio().AudioManager.setAudioSessionOptions({
    iosCategory: 'playAndRecord',
    iosMode: 'voiceChat',
    iosOptions: ['defaultToSpeaker', 'allowBluetoothHFP'],
  });
}

export function createMicCapture(onChunk: (base64Pcm16: string) => void): MicCapture {
  const recorder = new (rnAudio().AudioRecorder)();
  let paused = false;

  recorder.onAudioReady({ sampleRate: TARGET_RATE, bufferLength: BUFFER_LENGTH, channelCount: 1 }, ({ buffer }) => {
    if (paused) return;
    let samples = buffer.getChannelData(0);
    // The recorder may not honor the requested rate (hardware-dependent), so
    // resample to exactly 16 kHz when needed.
    if (buffer.sampleRate !== TARGET_RATE) {
      samples = resampleFloat32(samples, buffer.sampleRate, TARGET_RATE);
    }
    onChunk(bytesToBase64(floatTo16BitPCM(samples)));
  });

  return {
    start: () => {
      recorder.start();
    },
    stop: () => {
      recorder.clearOnAudioReady();
      try {
        recorder.stop();
      } catch {
        // not recording
      }
    },
    pause: () => {
      paused = true;
    },
    resume: () => {
      paused = false;
    },
  };
}
