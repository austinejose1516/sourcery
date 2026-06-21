import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fontFamily, radius, spacing } from '@recipeer/core';

import { Text } from '@/components/ui';
import { useVoiceSession } from '@/features/voice';
import { cookColors } from '../cook-theme';

export interface VoiceOverlayProps {
  /** Dismiss the assistant (stops listening). */
  onClose: () => void;
}

/**
 * Live voice surface, driven by the global assistant session: a mic orb plus the
 * current phase — listening (with the partial transcript), thinking, then the
 * spoken reply. Tap anywhere to stop. Visible whenever a session is active.
 */
export function VoiceOverlay({ onClose }: VoiceOverlayProps) {
  const { status, transcript, reply, error } = useVoiceSession();
  const orbColor = status === 'error' ? cookColors.danger : cookColors.accent;

  return (
    <Pressable style={styles.backdrop} accessibilityLabel="Stop voice" onPress={onClose}>
      <View style={styles.orb}>
        <View style={[styles.orbInner, { backgroundColor: orbColor }]}>
          <Ionicons name={status === 'error' ? 'alert' : 'mic'} size={34} color={cookColors.onAccent} />
        </View>
      </View>

      {status === 'error' ? (
        <Text style={styles.listening}>{error ?? 'Voice unavailable'}</Text>
      ) : status === 'connecting' ? (
        <Text style={styles.listening}>Connecting…</Text>
      ) : status === 'listening' ? (
        <>
          <Text style={styles.listening}>Listening…</Text>
          {transcript ? <Text style={styles.partial}>{transcript}</Text> : null}
        </>
      ) : status === 'thinking' ? (
        <View style={styles.answerWrap}>
          {transcript ? <Text style={styles.question}>“{transcript}”</Text> : null}
          <Text style={styles.listening}>Thinking…</Text>
        </View>
      ) : status === 'speaking' ? (
        <View style={styles.answerWrap}>
          {transcript ? <Text style={styles.question}>“{transcript}”</Text> : null}
          {reply ? (
            <View style={styles.answerCard}>
              <View style={styles.answerHead}>
                <Ionicons name="sparkles" size={14} color={cookColors.fg} />
                <View style={styles.bars}>
                  {[8, 16, 20, 12, 20, 16, 8].map((h, i) => (
                    <View key={i} style={[styles.eqBar, { height: h }]} />
                  ))}
                </View>
              </View>
              <Text style={styles.answer}>{reply}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.dismiss}>Tap anywhere to stop</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, backgroundColor: cookColors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  orb: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  orbInner: { width: 86, height: 86, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  listening: { fontFamily: fontFamily.body, fontSize: 15, color: cookColors.fgMuted, marginTop: spacing.xl, textAlign: 'center' },
  partial: { fontFamily: fontFamily.body, fontSize: 15, color: cookColors.fg, marginTop: spacing.sm, textAlign: 'center', maxWidth: 320 },
  answerWrap: { marginTop: spacing.lg, width: '100%', maxWidth: 300, alignItems: 'center' },
  question: { fontFamily: fontFamily.display, fontSize: 18, fontStyle: 'italic', color: cookColors.fg, textAlign: 'center' },
  answerCard: { marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.card, backgroundColor: cookColors.panelStrong, borderWidth: StyleSheet.hairlineWidth, borderColor: cookColors.border, width: '100%' },
  answerHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  eqBar: { width: 2.5, borderRadius: 2, backgroundColor: cookColors.accent },
  answer: { fontFamily: fontFamily.display, fontSize: 17, lineHeight: 24, color: cookColors.fg },
  dismiss: { position: 'absolute', bottom: 34, fontFamily: fontFamily.body, fontSize: 11.5, color: cookColors.fgFaint },
});
