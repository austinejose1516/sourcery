import { useEffect, useId } from 'react';
import { useVoiceStore } from './voice-store';
import type { VoiceContextProvider } from './types';

/**
 * Contribute on-screen context (current recipe, step, ingredients…) so the
 * assistant can answer questions about it. Pass a stable provider (useCallback
 * reading refs) so it always reports the latest state. Mounted-screen scoped.
 */
export function useVoiceContext(provider: VoiceContextProvider): void {
  const id = useId();
  const register = useVoiceStore((s) => s.registerContext);
  const unregister = useVoiceStore((s) => s.unregisterContext);

  useEffect(() => {
    register(id, provider);
    return () => unregister(id);
  }, [id, provider, register, unregister]);
}
