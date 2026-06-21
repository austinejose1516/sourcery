import { create } from 'zustand';
import type { VoiceAction, VoiceContextProvider, VoiceStatus } from './types';

/**
 * Global voice state + the action/context registry. Screens register their
 * actions and context (keyed by a per-mount id) so the assistant always knows
 * what it can do *right now*. The provider reads the registry imperatively at
 * turn time (collectActions / collectContext) — registering doesn't re-render it.
 */
interface VoiceState {
  /** Lifecycle of the current voice session, drives the overlay. */
  status: VoiceStatus;
  /** Live user speech (interim or final) for the listening UI. */
  transcript: string;
  /** Last spoken assistant reply. */
  reply: string | null;
  error: string | null;

  actionGroups: Record<string, VoiceAction[]>;
  contextProviders: Record<string, VoiceContextProvider>;

  setStatus: (status: VoiceStatus) => void;
  setTranscript: (transcript: string) => void;
  setReply: (reply: string | null) => void;
  setError: (error: string | null) => void;

  registerActions: (id: string, actions: VoiceAction[]) => void;
  unregisterActions: (id: string) => void;
  registerContext: (id: string, provider: VoiceContextProvider) => void;
  unregisterContext: (id: string) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  status: 'idle',
  transcript: '',
  reply: null,
  error: null,
  actionGroups: {},
  contextProviders: {},

  setStatus: (status) => set({ status }),
  setTranscript: (transcript) => set({ transcript }),
  setReply: (reply) => set({ reply }),
  setError: (error) => set({ error }),

  registerActions: (id, actions) =>
    set((s) => ({ actionGroups: { ...s.actionGroups, [id]: actions } })),
  unregisterActions: (id) =>
    set((s) => {
      const next = { ...s.actionGroups };
      delete next[id];
      return { actionGroups: next };
    }),
  registerContext: (id, provider) =>
    set((s) => ({ contextProviders: { ...s.contextProviders, [id]: provider } })),
  unregisterContext: (id) =>
    set((s) => {
      const next = { ...s.contextProviders };
      delete next[id];
      return { contextProviders: next };
    }),
}));

/** Flatten every registered screen's actions. Later registrations win on name clash. */
export function collectActions(): VoiceAction[] {
  const byName = new Map<string, VoiceAction>();
  for (const group of Object.values(useVoiceStore.getState().actionGroups)) {
    for (const action of group) byName.set(action.name, action);
  }
  return [...byName.values()];
}

/** Join every registered screen's context into one prompt block. */
export function collectContext(): string {
  return Object.values(useVoiceStore.getState().contextProviders)
    .map((fn) => {
      try {
        return fn();
      } catch {
        return '';
      }
    })
    .filter(Boolean)
    .join('\n\n');
}
