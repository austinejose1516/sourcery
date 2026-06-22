import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';

import { toToolDeclarations } from './api';
import { registerGlobalActions } from './global-actions';
import { collectActions, collectContext, useVoiceStore } from './voice-store';
import { configureVoiceSession, createMicCapture, requestMicPermission, type MicCapture } from './live/audio-capture';
import { createLiveClient, type LiveClient, type LiveEvent, type ToolResult } from './live/live-client';
import { createLivePlayback, type LivePlayback } from './live/live-playback';
import { createWakeWord, type WakeWord } from './live/wake-word';

/**
 * Owns the one voice session for the whole app.
 *
 *   disabled ─enable()→ wake ⇄ (tap mic / "Hey Chef") → connecting → listening ⇄ speaking
 *      ▲                                                      │ (tap mic to stop)
 *      └──────────────────── disable() ──────────────────────┘
 *
 * `enable()` arms the on-device wake word in the background (so "Hey Chef" can
 * start a conversation hands-free) — call it when a voice-capable screen mounts.
 * Tapping the mic (`toggle`) starts a live conversation immediately and keeps it
 * open continuously until the user taps to stop — no wake word needed once
 * tapped, no idle timeout. Half-duplex: the mic pauses while the assistant talks.
 */
interface AssistantApi {
  /** Arm the background wake word so "Hey Chef" works. Call on screen mount. */
  enable: () => Promise<void>;
  /** Fully stop (session + wake word). Call on screen unmount. */
  disable: () => void;
  /** Start a live conversation, or stop the active one — the mic button. */
  toggle: () => void;
}

const AssistantContext = createContext<AssistantApi | null>(null);

export function useAssistant(): AssistantApi {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant must be used within <VoiceAssistantProvider>');
  return ctx;
}

type Phase = 'idle' | 'wake' | 'connecting' | 'listening' | 'speaking';
const SESSION_PHASES: Phase[] = ['connecting', 'listening', 'speaking'];

export function VoiceAssistantProvider({ children }: { children: ReactNode }) {
  /** Whether the assistant is armed (wake word runs whenever no session is live). */
  const enabledRef = useRef(false);
  const phaseRef = useRef<Phase>('idle');

  const wakeRef = useRef<WakeWord | null>(null);
  const liveRef = useRef<LiveClient | null>(null);
  const captureRef = useRef<MicCapture | null>(null);
  const playbackRef = useRef<LivePlayback | null>(null);
  /** Stable indirection so the wake word's callback always calls the latest startSession. */
  const startSessionRef = useRef<() => void>(() => {});

  /** Per-turn transcript buffers (Gemini streams these incrementally). */
  const inputBufRef = useRef('');
  const outputBufRef = useRef('');

  useEffect(() => registerGlobalActions(), []);

  const setPhase = useCallback((phase: Phase) => {
    phaseRef.current = phase;
    useVoiceStore.getState().setStatus(phase);
  }, []);

  /** Tear down the live session and re-arm the wake word (or go fully idle). */
  const endSession = useCallback(
    async ({ keepStatus = false }: { keepStatus?: boolean } = {}) => {
      captureRef.current?.stop();
      captureRef.current = null;
      playbackRef.current?.destroy();
      playbackRef.current = null;
      liveRef.current?.close();
      liveRef.current = null;

      if (enabledRef.current && wakeRef.current) {
        phaseRef.current = 'wake'; // listening for "Hey Chef" again
        if (!keepStatus) setPhase('wake');
        try {
          await wakeRef.current.start();
        } catch {
          // mic still busy; next attempt will retry
        }
      } else if (!keepStatus) {
        setPhase('idle');
      }
    },
    [setPhase],
  );

  const runToolCalls = useCallback(
    async (calls: { id?: string; name: string; args: Record<string, unknown> }[]) => {
      const actions = collectActions();
      const byName = new Map(actions.map((a) => [a.name, a]));
      const results: ToolResult[] = [];
      for (const call of calls) {
        const action = byName.get(call.name);
        if (!action) {
          results.push({ id: call.id, name: call.name, result: 'unknown action' });
          continue;
        }
        try {
          const out = await action.handler(call.args ?? {});
          results.push({
            id: call.id,
            name: call.name,
            result: typeof out === 'string' && out.trim() ? out.trim() : 'done',
          });
        } catch {
          results.push({ id: call.id, name: call.name, result: 'failed' });
        }
      }
      liveRef.current?.sendToolResults(results);
    },
    [],
  );

  const handleEvent = useCallback(
    (event: LiveEvent) => {
      const store = useVoiceStore.getState();
      switch (event.type) {
        case 'ready':
          // Setup acknowledged — hand the mic to the recorder and start streaming.
          captureRef.current?.start();
          setPhase('listening');
          break;
        case 'input_transcript':
          inputBufRef.current += event.text;
          store.setTranscript(inputBufRef.current);
          break;
        case 'output_transcript':
          outputBufRef.current += event.text;
          store.setReply(outputBufRef.current);
          break;
        case 'audio':
          if (phaseRef.current !== 'speaking') {
            captureRef.current?.pause(); // half-duplex
            setPhase('speaking');
          }
          playbackRef.current?.enqueue(event.data, event.mimeType);
          break;
        case 'tool_call':
          void runToolCalls(event.calls);
          break;
        case 'turn_complete':
          inputBufRef.current = '';
          outputBufRef.current = '';
          captureRef.current?.resume();
          setPhase('listening');
          break;
        case 'interrupted':
          playbackRef.current?.stop();
          captureRef.current?.resume();
          setPhase('listening');
          break;
        case 'error':
          store.setError(event.message);
          store.setStatus('error');
          void endSession({ keepStatus: true });
          break;
      }
    },
    [endSession, runToolCalls, setPhase],
  );

  /** Arm the background wake word (perm + recognizer) so "Hey Chef" works. */
  const enable = useCallback(async () => {
    if (enabledRef.current) return;

    const granted = await requestMicPermission();
    if (!granted) {
      const store = useVoiceStore.getState();
      store.setStatus('error');
      store.setError('Microphone access is needed for voice control.');
      return;
    }

    try {
      configureVoiceSession();
      const wake = await createWakeWord(
        () => startSessionRef.current(),
        (err) => {
          // The wake word is a best-effort, background hands-free trigger. Its
          // failures must NOT surface as the assistant's error or block the
          // tap-to-talk path — tapping the mic always works regardless.
          if (__DEV__) console.warn('[voice] wake word:', err.message);
        },
      );
      wakeRef.current = wake;
      enabledRef.current = true;
      const store = useVoiceStore.getState();
      store.setError(null);
      store.setReply(null);
      store.setTranscript('');
      await wake.start();
      if (!SESSION_PHASES.includes(phaseRef.current)) setPhase('wake');
    } catch (e) {
      const store = useVoiceStore.getState();
      store.setStatus('error');
      store.setError(e instanceof Error ? e.message : String(e));
    }
  }, [setPhase]);

  /** Open a live conversation (from a mic tap or the wake word). Continuous until stopped. */
  const startSession = useCallback(async () => {
    if (SESSION_PHASES.includes(phaseRef.current)) return; // already live
    if (!enabledRef.current) await enable();
    if (!enabledRef.current) return; // enable failed (e.g. permission denied)

    setPhase('connecting');
    inputBufRef.current = '';
    outputBufRef.current = '';
    useVoiceStore.getState().setReply(null);

    try {
      await wakeRef.current?.stop(); // release the mic from the wake word
      configureVoiceSession(); // re-assert play-and-record after the handoff
      const live = createLiveClient(handleEvent);
      liveRef.current = live;
      await live.connect();
      playbackRef.current = createLivePlayback();
      captureRef.current = createMicCapture((chunk) => live.sendAudio(chunk));
      live.start(toToolDeclarations(collectActions()), collectContext());
      // capture.start() fires on the 'ready' event.
    } catch (e) {
      const store = useVoiceStore.getState();
      store.setError(e instanceof Error ? e.message : String(e));
      store.setStatus('error');
      await endSession({ keepStatus: true });
    }
  }, [enable, endSession, handleEvent, setPhase]);

  startSessionRef.current = () => void startSession();

  const disable = useCallback(() => {
    enabledRef.current = false;
    captureRef.current?.stop();
    captureRef.current = null;
    playbackRef.current?.destroy();
    playbackRef.current = null;
    liveRef.current?.close();
    liveRef.current = null;
    void wakeRef.current?.stop();
    wakeRef.current?.destroy();
    wakeRef.current = null;
    setPhase('idle');
    useVoiceStore.getState().setTranscript('');
  }, [setPhase]);

  /** Mic button: stop the live conversation if one is active, else start one. */
  const toggle = useCallback(() => {
    if (SESSION_PHASES.includes(phaseRef.current)) void endSession();
    else void startSession();
  }, [endSession, startSession]);

  const api = useMemo<AssistantApi>(() => ({ enable, disable, toggle }), [enable, disable, toggle]);
  return <AssistantContext.Provider value={api}>{children}</AssistantContext.Provider>;
}
