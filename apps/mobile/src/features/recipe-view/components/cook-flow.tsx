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
import { VoiceOverlay } from './voice-overlay';

export interface CookFlowProps {
  recipe: RecipeViewDTO;
  /** Leave cook mode entirely (back to the overview). */
  onExit: () => void;
}

/** Drives the dark cook experience: step ↔ step → complete, plus the voice assistant. */
export function CookFlow({ recipe, onExit }: CookFlowProps) {
  const [screen, setScreen] = useState<'cook' | 'complete'>('cook');
  const [index, setIndex] = useState(0);
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
      {
        name: 'next_step',
        description: 'Advance to the next cooking step ("next", "done", "what\'s next").',
        handler: () => next(),
      },
      {
        name: 'previous_step',
        description: 'Go back to the previous cooking step.',
        handler: () => prev(),
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
          if (!Number.isFinite(n)) return;
          const total = stateRef.current.steps.length;
          setScreen('cook');
          setIndex(Math.min(Math.max(0, n - 1), total - 1));
        },
      },
      {
        name: 'repeat_step',
        description: 'Read the current step instruction aloud again.',
        handler: () => {
          const { index: i, steps: s } = stateRef.current;
          return s[i]?.instruction ?? '';
        },
      },
      {
        name: 'exit_cooking',
        description: 'Leave cook mode and go back to the recipe overview.',
        handler: () => onExit(),
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

  // Stop listening when leaving cook mode or finishing.
  useEffect(() => {
    if (screen === 'complete') assistant.stop();
  }, [screen, assistant]);
  useEffect(() => () => assistant.stop(), [assistant]);

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
        onPrev={prev}
        onNext={next}
        onExit={onExit}
        onVoice={assistant.toggle}
      />

      {/* Overlay only for an active session — not while merely armed ('wake'). */}
      {status !== 'idle' && status !== 'wake' ? <VoiceOverlay onClose={assistant.stop} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: cookColors.bg },
});
