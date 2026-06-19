import { ScrollView, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { RecipeViewStepDTO } from '@recipeer/core';
import { fontFamily, radius, spacing } from '@recipeer/core';

import { PressableScale, Text } from '@/components/ui';
import { cautionVisual, cookColors, fmtMs } from '../cook-theme';
import { StepTimer } from './step-timer';

export interface CookStepProps {
  step: RecipeViewStepDTO;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  onVideo: () => void;
  onVoice: () => void;
}

/** A single dark, large-text cook step with its ingredients, video, timer and cues. */
export function CookStep({ step, index, total, onPrev, onNext, onExit, onVideo, onVoice }: CookStepProps) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const hasClip = step.clip != null;

  return (
    <View style={styles.root}>
      {/* top bar */}
      <View style={styles.topBar}>
        <PressableScale accessibilityRole="button" accessibilityLabel="Exit cook mode" onPress={onExit} style={styles.chipBtn}>
          <Ionicons name="close" size={16} color={cookColors.fg} />
        </PressableScale>
        <View style={styles.progress}>
          <View style={styles.bars}>
            {Array.from({ length: total }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  { backgroundColor: i < index ? cookColors.success : i === index ? cookColors.accent : cookColors.chip },
                ]}
              />
            ))}
          </View>
          <Text style={styles.progressLabel}>
            Step {index + 1} of {total}
          </Text>
        </View>
        <PressableScale accessibilityRole="button" accessibilityLabel="Voice control" onPress={onVoice} style={styles.chipBtn}>
          <Ionicons name="mic" size={16} color={cookColors.fg} />
        </PressableScale>
      </View>

      {/* body */}
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {step.summary ? <Text style={styles.verb}>{step.summary.toUpperCase()}</Text> : null}
        <Text style={styles.instruction}>{step.instruction}</Text>

        {step.stepIngredients.length > 0 ? <StepIngredients items={step.stepIngredients} /> : null}

        {hasClip ? <WatchVideoButton step={step} onPress={onVideo} /> : null}

        {step.timerSeconds ? (
          <View style={styles.block}>
            <StepTimer seconds={step.timerSeconds} label={step.timerLabel ?? 'timer'} />
          </View>
        ) : null}

        {step.caution ? <CautionCallout caution={step.caution} /> : null}

        {step.donenessCue ? <DonenessCue cue={step.donenessCue} /> : null}

        {step.tipText ? <Text style={styles.tip}>“{step.tipText}”</Text> : null}
      </ScrollView>

      {/* listening chip */}
      <View style={styles.listeningWrap}>
        <PressableScale accessibilityRole="button" accessibilityLabel="Voice control" onPress={onVoice} style={styles.listening}>
          <View style={styles.listeningDot} />
          <Text style={styles.listeningText}>Listening · say “next” or “how long?”</Text>
        </PressableScale>
      </View>

      {/* bottom nav */}
      <View style={styles.nav}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Previous step"
          disabled={isFirst}
          onPress={onPrev}
          style={[styles.prevBtn, isFirst && styles.prevBtnDisabled]}>
          <Ionicons name="arrow-back" size={22} color={cookColors.fg} />
        </PressableScale>
        <PressableScale accessibilityRole="button" accessibilityLabel={isLast ? 'Finish' : 'Next step'} onPress={onNext} style={styles.nextBtn}>
          <Text style={styles.nextLabel}>{isLast ? 'Finish' : 'Done — next step'}</Text>
          <Ionicons name={isLast ? 'checkmark' : 'chevron-forward'} size={20} color={cookColors.fg} />
        </PressableScale>
      </View>
    </View>
  );
}

function StepIngredients({ items }: { items: RecipeViewStepDTO['stepIngredients'] }) {
  return (
    <View style={styles.block}>
      <Text style={styles.eyebrow}>FOR THIS STEP</Text>
      <View style={styles.chips}>
        {items.map((ing, i) => (
          <View key={`${ing.name}-${i}`} style={styles.ingChip}>
            <Text style={styles.ingName}>{ing.name}</Text>
            {ing.qty ? <Text style={styles.ingQty}>{ing.qty}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function WatchVideoButton({ step, onPress }: { step: RecipeViewStepDTO; onPress: () => void }) {
  const duration = step.clip ? fmtMs(step.clip.endMs - step.clip.startMs) : null;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel="Watch this step" onPress={onPress} style={[styles.block, styles.watch]}>
      <View style={styles.watchIcon}>
        <Ionicons name="play" size={15} color={cookColors.fg} />
      </View>
      <View style={styles.watchMeta}>
        <Text style={styles.watchTitle}>Watch this step</Text>
        <Text style={styles.watchSub}>{duration ? `${duration} clip from the video` : 'Clip from the video'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={cookColors.fgMuted} />
    </PressableScale>
  );
}

function CautionCallout({ caution }: { caution: NonNullable<RecipeViewStepDTO['caution']> }) {
  const v = cautionVisual(caution.level);
  return (
    <View style={[styles.block, styles.callout, { backgroundColor: `${v.accent}26` }]}>
      <View style={[styles.calloutIcon, { backgroundColor: v.accent }]}>
        <Ionicons name={v.icon} size={15} color={cookColors.fg} />
      </View>
      <View style={styles.calloutMeta}>
        <Text style={[styles.eyebrow, { color: v.accent }]}>{v.label.toUpperCase()}</Text>
        <Text style={styles.calloutText}>{caution.text}</Text>
      </View>
    </View>
  );
}

function DonenessCue({ cue }: { cue: string }) {
  return (
    <View style={[styles.block, styles.doneness]}>
      <View style={styles.donenessIcon}>
        <Ionicons name="checkmark" size={15} color={cookColors.success} />
      </View>
      <View style={styles.calloutMeta}>
        <Text style={[styles.eyebrow, { color: cookColors.success }]}>LOOK FOR</Text>
        <Text style={styles.calloutText}>{cue}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  chipBtn: { width: 38, height: 38, borderRadius: radius.pill, backgroundColor: cookColors.chip, alignItems: 'center', justifyContent: 'center' },
  progress: { flex: 1 },
  bars: { flexDirection: 'row', gap: spacing.xs },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  progressLabel: { fontFamily: fontFamily.body, fontSize: 11, color: cookColors.fgMuted, marginTop: 6 },

  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  verb: { fontFamily: fontFamily.bodySemibold, fontSize: 11, letterSpacing: 0.9, color: cookColors.accent, marginBottom: spacing.sm },
  instruction: { fontFamily: fontFamily.display, fontSize: 26, lineHeight: 32, color: cookColors.fg },

  block: { marginTop: spacing.md },
  eyebrow: { fontFamily: fontFamily.bodySemibold, fontSize: 10.5, letterSpacing: 0.7, color: cookColors.fgMuted, marginBottom: spacing.sm },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  ingChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: cookColors.chip },
  ingName: { fontFamily: fontFamily.body, fontSize: 12.5, color: cookColors.fg },
  ingQty: { fontFamily: fontFamily.body, fontSize: 11.5, color: cookColors.fgMuted },

  watch: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: cookColors.panel, borderWidth: StyleSheet.hairlineWidth, borderColor: cookColors.border },
  watchIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: cookColors.primary, alignItems: 'center', justifyContent: 'center' },
  watchMeta: { flex: 1 },
  watchTitle: { fontFamily: fontFamily.bodyMedium, fontSize: 14, color: cookColors.fg },
  watchSub: { fontFamily: fontFamily.body, fontSize: 11.5, color: cookColors.fgMuted, marginTop: 1 },

  callout: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.md },
  calloutIcon: { width: 26, height: 26, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  calloutMeta: { flex: 1 },
  calloutText: { fontFamily: fontFamily.body, fontSize: 13, lineHeight: 18, color: cookColors.fg },

  doneness: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: cookColors.panel, borderWidth: StyleSheet.hairlineWidth, borderColor: cookColors.border },
  donenessIcon: { width: 26, height: 26, borderRadius: radius.pill, backgroundColor: 'rgba(122,139,63,0.18)', alignItems: 'center', justifyContent: 'center' },

  tip: { fontFamily: fontFamily.display, fontSize: 14, fontStyle: 'italic', lineHeight: 20, color: cookColors.fgMuted, marginTop: spacing.md },

  listeningWrap: { alignItems: 'center', paddingBottom: spacing.sm },
  listening: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 7, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: cookColors.chip },
  listeningDot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: cookColors.success },
  listeningText: { fontFamily: fontFamily.bodyMedium, fontSize: 12, color: cookColors.fg },

  nav: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  prevBtn: { width: 58, height: 58, borderRadius: radius.pill, backgroundColor: cookColors.chip, alignItems: 'center', justifyContent: 'center' },
  prevBtnDisabled: { opacity: 0.4 },
  nextBtn: { flex: 1, height: 58, borderRadius: radius.pill, backgroundColor: cookColors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  nextLabel: { fontFamily: fontFamily.bodyMedium, fontSize: 16, color: cookColors.fg },
});
