import { useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RecipeViewDTO } from '@recipeer/core';

import { useMarkTried } from '../hooks';
import { useVoiceControl } from '../voice/use-voice-control';
import { cookColors } from '../cook-theme';
import { CompleteScreen } from './complete-screen';
import { CookStep } from './cook-step';
import { VoiceOverlay } from './voice-overlay';

export interface CookFlowProps {
  recipe: RecipeViewDTO;
  /** Leave cook mode entirely (back to the overview). */
  onExit: () => void;
}

/** Drives the dark cook experience: step ↔ step → complete, plus voice + video overlays. */
export function CookFlow({ recipe, onExit }: CookFlowProps) {
  const [screen, setScreen] = useState<'cook' | 'complete'>('cook');
  const [index, setIndex] = useState(0);
  const voice = useVoiceControl();
  const markTried = useMarkTried(recipe.id);

  const steps = recipe.steps;
  const step = steps[index];

  const next = () => {
    if (index < steps.length - 1) setIndex((i) => i + 1);
    else setScreen('complete');
  };
  const prev = () => setIndex((i) => Math.max(0, i - 1));

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
        onPrev={prev}
        onNext={next}
        onExit={onExit}
        onVoice={voice.show}
      />

      {voice.visible ? <VoiceOverlay step={step} onClose={voice.hide} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: cookColors.bg },
});
