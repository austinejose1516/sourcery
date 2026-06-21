import { useEffect, useId } from 'react';
import { useVoiceStore } from './voice-store';
import type { VoiceAction } from './types';

/**
 * Register this screen's voice actions for as long as it's mounted. The assistant
 * picks them up at turn time. Pass a stable array (memoize it, or use refs inside
 * the handlers) so handlers always see the latest state without thrashing.
 */
export function useVoiceActions(actions: VoiceAction[]): void {
  const id = useId();
  const register = useVoiceStore((s) => s.registerActions);
  const unregister = useVoiceStore((s) => s.unregisterActions);

  useEffect(() => {
    register(id, actions);
    return () => unregister(id);
  }, [id, actions, register, unregister]);
}
