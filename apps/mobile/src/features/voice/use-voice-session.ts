import { useVoiceStore } from './voice-store';

/** Read-only session state for voice UI (the overlay). */
export function useVoiceSession() {
  const status = useVoiceStore((s) => s.status);
  const transcript = useVoiceStore((s) => s.transcript);
  const reply = useVoiceStore((s) => s.reply);
  const error = useVoiceStore((s) => s.error);
  return { status, transcript, reply, error };
}
