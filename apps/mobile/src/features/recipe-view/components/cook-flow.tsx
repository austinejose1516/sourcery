import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RecipeViewDTO } from '@recipeer/core';

import { useAssistant, useVoiceActions, useVoiceContext, useVoiceSession } from '@/features/voice';
import type { VoiceAction } from '@/features/voice';
import { useMarkTried } from '../hooks';
import { cookColors } from '../cook-theme';
import { CompleteScreen } from './complete-screen';
import { CookStep } from './cook-step';

export interface CookFlowProps {
  recipe: RecipeViewDTO;
  /** Leave cook mode entirely (back to the overview). */
  onExit: () => void;
}

/** Drives the dark cook experience: step ↔ step → complete, plus the voice assistant. */
export function CookFlow({ recipe, onExit }: CookFlowProps) {
  const [screen, setScreen] = useState<'cook' | 'complete'>('cook');
  const [index, setIndex] = useState(0);
  // Bumped by the "play the video" voice command to start the current step's clip.
  const [videoPlayNonce, setVideoPlayNonce] = useState(0);
  const assistant = useAssistant();
  const { status } = useVoiceSession();
  const markTried = useMarkTried(recipe.id);

  const steps = recipe.steps;
  const step = steps[index];

  // Latest state the voice handlers/context read at turn time (avoids stale closures
  // while keeping the action/context identities stable so they don't re-register).
  const stateRef = useRef({ index, steps, recipe });
  stateRef.current = { index, steps, recipe };

  const next = useCallback(() => {
    const { index: i, steps: s } = stateRef.current;
    if (i < s.length - 1) setIndex(i + 1);
    else setScreen('complete');
  }, []);
  const prev = useCallback(() => setIndex(Math.max(0, stateRef.current.index - 1)), []);

  const actions = useMemo<VoiceAction[]>(
    () => [
      // Handlers return a short description of the resulting step so the
      // assistant can confirm + read it aloud (the Live session's context is set
      // once at connect time, so the tool result is how it learns the new step).
      {
        name: 'next_step',
        description: 'Advance to the next cooking step ("next", "done", "what\'s next").',
        handler: () => {
          const { index: i, steps: s } = stateRef.current;
          next();
          if (i >= s.length - 1) return 'That was the last step — nice work!';
          const ns = s[i + 1];
          return `Step ${i + 2} of ${s.length}${ns.summary ? `, ${ns.summary}` : ''}: ${ns.instruction}`;
        },
      },
      {
        name: 'previous_step',
        description: 'Go back to the previous cooking step.',
        handler: () => {
          const { index: i, steps: s } = stateRef.current;
          prev();
          if (i <= 0) return "You're already on the first step.";
          const ps = s[i - 1];
          return `Step ${i} of ${s.length}${ps.summary ? `, ${ps.summary}` : ''}: ${ps.instruction}`;
        },
      },
      {
        name: 'go_to_step',
        description: 'Jump straight to a specific step by its number.',
        parameters: {
          type: 'object',
          properties: { number: { type: 'integer', description: '1-based step number' } },
          required: ['number'],
        },
        handler: (args) => {
          const n = Number(args.number);
          if (!Number.isFinite(n)) return "I didn't catch which step you meant.";
          const total = stateRef.current.steps.length;
          const target = Math.min(Math.max(0, n - 1), total - 1);
          setScreen('cook');
          setIndex(target);
          const ts = stateRef.current.steps[target];
          return `Step ${target + 1} of ${total}${ts.summary ? `, ${ts.summary}` : ''}: ${ts.instruction}`;
        },
      },
      {
        name: 'repeat_step',
        description: 'Read the current step instruction aloud again.',
        handler: () => {
          const { index: i, steps: s } = stateRef.current;
          const cur = s[i];
          return cur ? `Step ${i + 1} of ${s.length}: ${cur.instruction}` : 'No step to repeat.';
        },
      },
      {
        name: 'play_video',
        description: "Play this step's video clip when the user asks to watch or show the video.",
        handler: () => {
          const { index: i, steps: s, recipe: r } = stateRef.current;
          if (r.videoKind == null || !s[i]?.clip) return "This step doesn't have a video.";
          setVideoPlayNonce((n) => n + 1);
          return 'Playing the video for this step.';
        },
      },
      {
        name: 'exit_cooking',
        description: 'Leave cook mode and go back to the recipe overview.',
        handler: () => {
          onExit();
          return 'Leaving cook mode.';
        },
      },
    ],
    [next, prev, onExit],
  );
  useVoiceActions(actions);

  const contextProvider = useCallback(() => {
    const { index: i, steps: s, recipe: r } = stateRef.current;
    const cur = s[i];
    if (!cur) return `The user is cooking "${r.title}".`;
    const lines = [
      `The user is cooking "${r.title}" in hands-free cook mode.`,
      `Current step ${i + 1} of ${s.length}${cur.summary ? ` — ${cur.summary}` : ''}: ${cur.instruction}`,
    ];
    if (cur.stepIngredients.length) {
      const items = cur.stepIngredients
        .map((ing) => (ing.qty ? `${ing.name} (${ing.qty})` : ing.name))
        .join(', ');
      lines.push(`Ingredients for this step: ${items}.`);
    }
    if (cur.timerSeconds) {
      lines.push(`Timer: ${cur.timerLabel ?? 'timer'} for about ${Math.round(cur.timerSeconds / 60)} min.`);
    }
    if (cur.caution) lines.push(`Caution: ${cur.caution.text}`);
    if (cur.donenessCue) lines.push(`Look for: ${cur.donenessCue}`);
    return lines.join('\n');
  }, []);
  useVoiceContext(contextProvider);

  // Arm the wake word on entry so "Hey Chef" works hands-free; fully stop on exit.
  useEffect(() => {
    void assistant.enable();
    return () => assistant.disable();
  }, [assistant]);
  // Stop when the recipe is finished.
  useEffect(() => {
    if (screen === 'complete') assistant.disable();
  }, [screen, assistant]);

  if (screen === 'complete') {
    return (
      <>
        <StatusBar barStyle="dark-content" />
        <CompleteScreen recipe={recipe} onMarkTried={() => markTried.mutateAsync({})} onClose={onExit} />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      <CookStep
        recipeId={recipe.id}
        step={step}
        index={index}
        total={steps.length}
        hasVideo={recipe.videoKind != null}
        voiceStatus={status}
        videoPlaySignal={videoPlayNonce}
        onPrev={prev}
        onNext={next}
        onExit={onExit}
        onVoice={assistant.toggle}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: cookColors.bg },
});
