import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';

import { toToolDeclarations } from './api';
import { registerGlobalActions } from './global-actions';
import { collectActions, collectContext, useVoiceStore } from './voice-store';
import { configureVoiceSession, createMicCapture, requestMicPermission, type MicCapture } from './live/audio-capture';
import { createLiveClient, type LiveClient, type LiveEvent, type ToolResult } from './live/live-client';
import { createLivePlayback, type LivePlayback } from './live/live-playback';

/**
 * Owns the one voice session for the whole app.
 *
 *   idle ──(tap mic)──▶ connecting ──ready──▶ listening ⇄ speaking
 *      ▲                                            │
 *      └───────────────── (tap mic) ───────────────┘
 *
 * Tap-to-talk: tapping the mic opens a Gemini Live conversation immediately and
 * keeps it open continuously (server-side VAD handles turns) until the user taps
 * to stop. The recorder owns the mic for the whole session — half-duplex: the
 * mic pauses while the assistant speaks. Screens drive it via useAssistant() and
 * feed it via useVoiceActions/useVoiceContext.
 *
 * NOTE: the "Hey Chef" wake word is intentionally not wired in here — running an
 * always-on recognizer alongside the recorder caused mic-contention failures.
 * It'll return with a cleaner handoff; see live/wake-word.ts.
 */
interface AssistantApi {
  /** Pre-grant the mic permission + prepare the audio session. Call on mount. */
  enable: () => Promise<void>;
  /** Stop any active conversation. Call on unmount. */
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

type Phase = 'idle' | 'connecting' | 'listening' | 'speaking';
const SESSION_PHASES: Phase[] = ['connecting', 'listening', 'speaking'];

export function VoiceAssistantProvider({ children }: { children: ReactNode }) {
  const phaseRef = useRef<Phase>('idle');
  const permRef = useRef(false);

  const liveRef = useRef<LiveClient | null>(null);
  const captureRef = useRef<MicCapture | null>(null);
  const playbackRef = useRef<LivePlayback | null>(null);
  /** Pending "resume the mic after the reply finishes playing" timer. */
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Per-turn transcript buffers (Gemini streams these incrementally). */
  const inputBufRef = useRef('');
  const outputBufRef = useRef('');

  useEffect(() => registerGlobalActions(), []);

  const setPhase = useCallback((phase: Phase) => {
    phaseRef.current = phase;
    useVoiceStore.getState().setStatus(phase);
  }, []);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  /** Tear down the live session and go idle (keep an error message if asked). */
  const endSession = useCallback(
    ({ keepStatus = false }: { keepStatus?: boolean } = {}) => {
      clearResumeTimer();
      captureRef.current?.stop();
      captureRef.current = null;
      playbackRef.current?.destroy();
      playbackRef.current = null;
      liveRef.current?.close();
      liveRef.current = null;
      if (!keepStatus) setPhase('idle');
    },
    [clearResumeTimer, setPhase],
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
          // Setup acknowledged — start streaming the mic.
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
            clearResumeTimer(); // a new reply started; cancel any pending resume
            captureRef.current?.pause(); // half-duplex
            setPhase('speaking');
          }
          playbackRef.current?.enqueue(event.data, event.mimeType);
          break;
        case 'tool_call':
          void runToolCalls(event.calls);
          break;
        case 'turn_complete': {
          inputBufRef.current = '';
          outputBufRef.current = '';
          // Resume the mic only AFTER the reply finishes playing — otherwise the
          // mic captures the assistant's own voice and triggers spurious turns
          // (e.g. it keeps advancing steps with no user input).
          clearResumeTimer();
          const drain = (playbackRef.current?.drainDelayMs() ?? 0) + 250;
          resumeTimerRef.current = setTimeout(() => {
            resumeTimerRef.current = null;
            captureRef.current?.resume();
            if (phaseRef.current === 'speaking') setPhase('listening');
          }, drain);
          break;
        }
        case 'interrupted':
          clearResumeTimer();
          playbackRef.current?.stop();
          captureRef.current?.resume();
          setPhase('listening');
          break;
        case 'error':
          store.setError(event.message);
          store.setStatus('error');
          endSession({ keepStatus: true });
          break;
      }
    },
    [clearResumeTimer, endSession, runToolCalls, setPhase],
  );

  /** Pre-grant mic permission + configure the audio session. */
  const enable = useCallback(async () => {
    if (permRef.current) return;
    const granted = await requestMicPermission();
    if (!granted) {
      const store = useVoiceStore.getState();
      store.setStatus('error');
      store.setError('Microphone access is needed for voice control.');
      return;
    }
    permRef.current = true;
    configureVoiceSession();
  }, []);

  /** Open a live conversation — continuous until stopped. */
  const startSession = useCallback(async () => {
    if (SESSION_PHASES.includes(phaseRef.current)) return; // already live

    if (!permRef.current) await enable();
    if (!permRef.current) return; // permission denied

    setPhase('connecting');
    inputBufRef.current = '';
    outputBufRef.current = '';
    const store = useVoiceStore.getState();
    store.setError(null);
    store.setReply(null);
    store.setTranscript('');

    try {
      configureVoiceSession();
      const live = createLiveClient(handleEvent);
      liveRef.current = live;
      await live.connect();
      playbackRef.current = createLivePlayback();
      captureRef.current = createMicCapture((chunk) => live.sendAudio(chunk));
      live.start(toToolDeclarations(collectActions()), collectContext());
      // capture.start() fires on the 'ready' event.
    } catch (e) {
      store.setError(e instanceof Error ? e.message : String(e));
      store.setStatus('error');
      endSession({ keepStatus: true });
    }
  }, [enable, endSession, handleEvent, setPhase]);

  const disable = useCallback(() => {
    endSession();
    useVoiceStore.getState().setTranscript('');
  }, [endSession]);

  /** Mic button: stop the live conversation if one is active, else start one. */
  const toggle = useCallback(() => {
    if (SESSION_PHASES.includes(phaseRef.current)) endSession();
    else void startSession();
  }, [endSession, startSession]);

  const api = useMemo<AssistantApi>(() => ({ enable, disable, toggle }), [enable, disable, toggle]);
  return <AssistantContext.Provider value={api}>{children}</AssistantContext.Provider>;
}
