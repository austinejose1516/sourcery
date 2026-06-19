import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { RecipeViewStepDTO } from '@recipeer/core';
import { fontFamily, radius, spacing } from '@recipeer/core';

import { Text } from '@/components/ui';
import { cookColors } from '../cook-theme';

export interface VoiceOverlayProps {
  step: RecipeViewStepDTO;
  onClose: () => void;
}

/**
 * Visual-only voice overlay: a mic orb that "listens", then surfaces the step's
 * seeded Q&A. Tap anywhere to dismiss. Real speech is wired later via
 * useVoiceControl — this is the surface it will drive.
 */
export function VoiceOverlay({ step, onClose }: VoiceOverlayProps) {
  const [phase, setPhase] = useState<'listening' | 'answer'>('listening');

  useEffect(() => {
    if (!step.voice) return;
    const id = setTimeout(() => setPhase('answer'), 1700);
    return () => clearTimeout(id);
  }, [step.voice]);

  return (
    <Pressable style={styles.backdrop} accessibilityLabel="Dismiss voice" onPress={onClose}>
      <View style={styles.orb}>
        <View style={styles.orbInner}>
          <Ionicons name="mic" size={34} color={cookColors.fg} />
        </View>
      </View>

      {phase === 'listening' || !step.voice ? (
        <Text style={styles.listening}>Listening…</Text>
      ) : (
        <View style={styles.answerWrap}>
          <Text style={styles.question}>“{step.voice.question}”</Text>
          <View style={styles.answerCard}>
            <View style={styles.answerHead}>
              <Ionicons name="sparkles" size={14} color={cookColors.fg} />
              <View style={styles.bars}>
                {[8, 16, 20, 12, 20, 16, 8].map((h, i) => (
                  <View key={i} style={[styles.eqBar, { height: h }]} />
                ))}
              </View>
            </View>
            <Text style={styles.answer}>{step.voice.answer}</Text>
          </View>
        </View>
      )}

      <Text style={styles.dismiss}>Tap anywhere to dismiss</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, backgroundColor: cookColors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  orb: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  orbInner: { width: 86, height: 86, borderRadius: radius.pill, backgroundColor: cookColors.accent, alignItems: 'center', justifyContent: 'center' },
  listening: { fontFamily: fontFamily.body, fontSize: 15, color: cookColors.fgMuted, marginTop: spacing.xl },
  answerWrap: { marginTop: spacing.lg, width: '100%', maxWidth: 300 },
  question: { fontFamily: fontFamily.display, fontSize: 18, fontStyle: 'italic', color: cookColors.fg, textAlign: 'center' },
  answerCard: { marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.card, backgroundColor: cookColors.panelStrong, borderWidth: StyleSheet.hairlineWidth, borderColor: cookColors.border },
  answerHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  eqBar: { width: 2.5, borderRadius: 2, backgroundColor: cookColors.accent },
  answer: { fontFamily: fontFamily.display, fontSize: 17, lineHeight: 24, color: cookColors.fg },
  dismiss: { position: 'absolute', bottom: 34, fontFamily: fontFamily.body, fontSize: 11.5, color: cookColors.fgFaint },
});
