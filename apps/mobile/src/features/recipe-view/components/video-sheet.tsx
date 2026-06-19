import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { RecipeViewStepDTO } from '@recipeer/core';
import { fontFamily, radius, spacing } from '@recipeer/core';

import { PressableScale, Text } from '@/components/ui';
import { cookColors, fmtMs } from '../cook-theme';

export interface VideoSheetProps {
  step: RecipeViewStepDTO;
  index: number;
  fullDurationMs: number | null;
  onClose: () => void;
}

/**
 * Bottom sheet showing the trimmed clip for a step. The real trimmed-video player
 * isn't wired yet (videoUrl is available on the step) — this shows the clip range
 * within the full recording so the framing is right.
 *
 * TODO(video): drop an expo-video player here, seeking to step.clip.startMs and
 * stopping at endMs.
 */
export function VideoSheet({ step, index, fullDurationMs, onClose }: VideoSheetProps) {
  const clip = step.clip;
  const clipStart = clip ? fmtMs(clip.startMs) : null;
  const clipEnd = clip ? fmtMs(clip.endMs) : null;
  const clipDuration = clip ? fmtMs(clip.endMs - clip.startMs) : null;

  const startPct = clip && fullDurationMs ? (clip.startMs / fullDurationMs) * 100 : 0;
  const widthPct = clip && fullDurationMs ? ((clip.endMs - clip.startMs) / fullDurationMs) * 100 : 100;

  return (
    <Pressable style={styles.scrim} accessibilityLabel="Close video" onPress={onClose}>
      <Pressable style={styles.sheet} onPress={() => {}}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={styles.headerMeta}>
            <Text style={styles.eyebrow}>
              STEP {index + 1} CLIP{clipDuration ? ` · ${clipDuration}` : ''}
            </Text>
            {step.summary ? <Text style={styles.title}>{step.summary}</Text> : null}
          </View>
          <PressableScale accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={15} color={cookColors.fg} />
          </PressableScale>
        </View>

        {/* placeholder video frame */}
        <View style={styles.frame}>
          <View style={styles.playBadge}>
            <Ionicons name="play" size={20} color={cookColors.bg} />
          </View>
          <Text style={styles.noPreview}>No preview yet</Text>
        </View>

        {/* trimmed-range scrubber within the full video */}
        <View style={styles.scrubber}>
          <View style={styles.track}>
            <View style={[styles.range, { left: `${startPct}%`, width: `${widthPct}%` }]} />
          </View>
          <View style={styles.scrubberLabels}>
            <Text style={styles.scrubberText}>{clip ? `${clipStart} – ${clipEnd}` : 'full clip'}</Text>
            {fullDurationMs ? <Text style={styles.scrubberText}>full video {fmtMs(fullDurationMs)}</Text> : null}
          </View>
        </View>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 220, backgroundColor: cookColors.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: cookColors.sheet, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  handle: { width: 36, height: 4, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'center', marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  headerMeta: { flex: 1, paddingRight: spacing.md },
  eyebrow: { fontFamily: fontFamily.bodySemibold, fontSize: 10.5, letterSpacing: 0.7, color: cookColors.accent },
  title: { fontFamily: fontFamily.display, fontSize: 16, color: cookColors.fg, marginTop: 3 },
  closeBtn: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: cookColors.chip, alignItems: 'center', justifyContent: 'center' },

  frame: { aspectRatio: 16 / 10, borderRadius: radius.md, backgroundColor: '#120D07', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  playBadge: { width: 54, height: 54, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  noPreview: { fontFamily: fontFamily.body, fontSize: 10.5, color: cookColors.fgMuted },

  scrubber: { marginTop: spacing.md },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)' },
  range: { position: 'absolute', top: 0, bottom: 0, backgroundColor: cookColors.accent, borderRadius: 3 },
  scrubberLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
  scrubberText: { fontFamily: fontFamily.body, fontSize: 11, color: cookColors.fgFaint },
});
