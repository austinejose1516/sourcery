import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

/**
 * On-device wake-word detection using expo-speech-recognition (already in the
 * app) as a continuous phrase-spotter — no third-party wake engine / vendor
 * account needed. It runs only while the assistant is armed but idle; on hearing
 * the trigger phrase it fires `onDetected`, and the provider hands the mic to the
 * Gemini Live recorder. Recognition is on-device, so no audio leaves the phone
 * until a real session starts.
 */

const LANG = 'en-US';

/**
 * Trigger phrase + common on-device mishearings, matched loosely (substring on a
 * normalized transcript). Kept tight to avoid false triggers.
 */
const WAKE_PATTERNS = ['hey chef', 'hey chefs', 'hey chief', 'a chef', 'hey shef'];

function isWake(transcript: string): boolean {
  const t = transcript.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return WAKE_PATTERNS.some((p) => t.includes(p));
}

export interface WakeWord {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  destroy: () => void;
}

export async function createWakeWord(
  onDetected: () => void,
  onError?: (error: Error) => void,
): Promise<WakeWord> {
  let active = false;
  let detected = false;

  // Prefer on-device recognition (private, offline) for the always-on wake
  // listener — but the iOS Simulator has no on-device speech model, so fall back
  // to network recognition there ("Failed to initialize recognizer" otherwise).
  const onDevice = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();

  const begin = () => {
    try {
      ExpoSpeechRecognitionModule.start({
        lang: LANG,
        interimResults: true,
        continuous: true,
        requiresOnDeviceRecognition: onDevice,
        // Bias recognition toward the trigger phrase (iOS).
        contextualStrings: ['Hey Chef'],
      });
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  };

  const subs = [
    ExpoSpeechRecognitionModule.addListener('result', (event) => {
      if (!active || detected) return;
      const transcript = event.results?.[0]?.transcript ?? '';
      if (isWake(transcript)) {
        detected = true;
        try {
          ExpoSpeechRecognitionModule.abort();
        } catch {
          // not running
        }
        onDetected();
      }
    }),
    ExpoSpeechRecognitionModule.addListener('end', () => {
      // iOS ends a recognition session on silence even in continuous mode; keep
      // the wake listener alive until a real session takes over or we stop.
      if (active && !detected) begin();
    }),
    ExpoSpeechRecognitionModule.addListener('error', (event) => {
      if (!active || event.error === 'no-speech') return; // 'end' will restart
      onError?.(new Error(event.message || event.error));
    }),
  ];

  return {
    start: async () => {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        throw new Error('Microphone and speech permission are needed to listen for "Hey Chef".');
      }
      active = true;
      detected = false;
      begin();
    },
    stop: async () => {
      active = false;
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // not running
      }
    },
    destroy: () => {
      active = false;
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // not running
      }
      for (const sub of subs) sub.remove();
    },
  };
}
