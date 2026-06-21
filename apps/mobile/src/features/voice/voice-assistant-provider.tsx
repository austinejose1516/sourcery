import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';

import { toToolDeclarations } from './api';
import { registerGlobalActions } from './global-actions';
import { collectActions, collectContext, useVoiceStore } from './voice-store';
import { configureVoiceSession, createMicCapture, requestMicPermission, type MicCapture } from './live/audio-capture';
import { createLiveClient, type LiveClient, type LiveEvent, type ToolResult } from './live/live-client';
import { createLivePlayback, type LivePlayback } from './live/live-playback';
import { createWakeWord, type WakeWord } from './live/wake-word';

/**
 * Owns the one voice session for the whole app. The machine:
 *
 *   idle ─start()→ wake ─keyword→ connecting ─ready→ listening ⇄ speaking
 *      ▲                                              │ (idle timeout / stop)
 *      └──────────────── stop() ─────────────────────┘
 *
 * While "wake" we only run the on-device wake word (no streaming). On the keyword
 * we hand the mic from the wake word to the recorder and stream to Gemini Live
 * (proxied by the API). Half-duplex: the mic pauses while the assistant speaks.
 * Screens drive it via useAssistant() and feed it via useVoiceActions/Context.
 */
interface AssistantApi {
  start: () => Promise<void>;
  stop: () => void;
  toggle: () => void;
}

const AssistantContext = createContext<AssistantApi | null>(null);

export function useAssistant(): AssistantApi {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant must be used within <VoiceAssistantProvider>');
  return ctx;
}

type Phase = 'idle' | 'wake' | 'connecting' | 'listening' | 'speaking';

/** Close the streaming session after this long with no speech, to stop streaming. */
const IDLE_MS = 15_000;

export function VoiceAssistantProvider({ children }: { children: ReactNode }) {
  /** Whether the assistant is armed (wake word runs whenever we're idle). */
  const enabledRef = useRef(false);
  const phaseRef = useRef<Phase>('idle');

  const wakeRef = useRef<WakeWord | null>(null);
  const liveRef = useRef<LiveClient | null>(null);
  const captureRef = useRef<MicCapture | null>(null);
  const playbackRef = useRef<LivePlayback | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Per-turn transcript buffers (Gemini streams these incrementally). */
  const inputBufRef = useRef('');
  const outputBufRef = useRef('');

  useEffect(() => {
    const cleanup = registerGlobalActions();
    return cleanup;
  }, []);

  const setPhase = useCallback((phase: Phase) => {
    phaseRef.current = phase;
    useVoiceStore.getState().setStatus(phase);
  }, []);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  /** Tear down the live session and re-arm the wake word (or go fully idle). */
  const endSession = useCallback(async () => {
    clearIdleTimer();
    captureRef.current?.stop();
    captureRef.current = null;
    playbackRef.current?.destroy();
    playbackRef.current = null;
    liveRef.current?.close();
    liveRef.current = null;

    if (enabledRef.current && wakeRef.current) {
      setPhase('wake');
      try {
        await wakeRef.current.start();
      } catch {
        // mic still busy; leave armed, next keyword attempt will retry
      }
    } else {
      setPhase('idle');
    }
  }, [clearIdleTimer, setPhase]);

  const armIdleTimer = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => void endSession(), IDLE_MS);
  }, [clearIdleTimer, endSession]);

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
          armIdleTimer();
          break;
        case 'input_transcript':
          inputBufRef.current += event.text;
          store.setTranscript(inputBufRef.current);
          armIdleTimer();
          break;
        case 'output_transcript':
          outputBufRef.current += event.text;
          store.setReply(outputBufRef.current);
          break;
        case 'audio':
          if (phaseRef.current !== 'speaking') {
            clearIdleTimer(); // don't time out while the assistant is talking
            captureRef.current?.pause(); // half-duplex
            setPhase('speaking');
          }
          playbackRef.current?.enqueue(event.data, event.mimeType);
          break;
        case 'tool_call':
          void runToolCalls(event.calls);
          armIdleTimer();
          break;
        case 'turn_complete':
          inputBufRef.current = '';
          outputBufRef.current = '';
          captureRef.current?.resume();
          setPhase('listening');
          armIdleTimer();
          break;
        case 'interrupted':
          playbackRef.current?.stop();
          captureRef.current?.resume();
          setPhase('listening');
          break;
        case 'error':
          store.setError(event.message);
          store.setStatus('error');
          void endSession();
          break;
      }
    },
    [armIdleTimer, clearIdleTimer, endSession, runToolCalls, setPhase],
  );

  /** Wake word heard → open the Gemini Live session. */
  const startSession = useCallback(async () => {
    if (phaseRef.current !== 'wake') return; // already connecting/active
    setPhase('connecting');
    inputBufRef.current = '';
    outputBufRef.current = '';

    try {
      await wakeRef.current?.stop(); // release the mic for the recorder
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
      await endSession();
    }
  }, [endSession, handleEvent, setPhase]);

  const start = useCallback(async () => {
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
        () => void startSession(),
        (err) => {
          const store = useVoiceStore.getState();
          store.setError(err.message);
          store.setStatus('error');
        },
      );
      wakeRef.current = wake;
      enabledRef.current = true;
      const store = useVoiceStore.getState();
      store.setError(null);
      store.setReply(null);
      store.setTranscript('');
      await wake.start();
      setPhase('wake');
    } catch (e) {
      const store = useVoiceStore.getState();
      store.setStatus('error');
      store.setError(e instanceof Error ? e.message : String(e));
    }
  }, [setPhase, startSession]);

  const stop = useCallback(() => {
    enabledRef.current = false;
    clearIdleTimer();
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
  }, [clearIdleTimer, setPhase]);

  const toggle = useCallback(() => {
    if (enabledRef.current) stop();
    else void start();
  }, [start, stop]);

  const api = useMemo<AssistantApi>(() => ({ start, stop, toggle }), [start, stop, toggle]);
  return <AssistantContext.Provider value={api}>{children}</AssistantContext.Provider>;
}
