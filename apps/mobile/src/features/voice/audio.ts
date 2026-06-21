import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Speech from 'expo-speech';

/**
 * Playback for spoken replies. Gemini's voice arrives as base64 WAV from the API;
 * we drop it in a cache file and play it with expo-audio. `speakWithDevice` is the
 * fallback (on-device TTS) when the network voice call fails.
 */

let current: AudioPlayer | null = null;

/** Allow playback through the iOS silent switch (kitchens are loud, phones muted). */
export async function configureAudio(): Promise<void> {
  await setAudioModeAsync({ playsInSilentMode: true });
}

export async function playBase64Audio(base64: string, mime = 'audio/wav'): Promise<void> {
  const ext = mime.includes('wav') ? 'wav' : mime.includes('mp') ? 'mp3' : 'audio';
  const file = new File(Paths.cache, `voice-reply.${ext}`);
  file.create({ overwrite: true });
  file.write(base64, { encoding: 'base64' });

  stopAudio();
  const player = createAudioPlayer({ uri: file.uri });
  current = player;

  await new Promise<void>((resolve) => {
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        sub.remove();
        if (current === player) current = null;
        player.remove();
        resolve();
      }
    });
    player.play();
  });
}

export function speakWithDevice(text: string): Promise<void> {
  return new Promise((resolve) => {
    Speech.stop();
    Speech.speak(text, {
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: () => resolve(),
    });
  });
}

export function stopAudio(): void {
  if (current) {
    try {
      current.remove();
    } catch {
      // already released
    }
    current = null;
  }
  Speech.stop();
}
