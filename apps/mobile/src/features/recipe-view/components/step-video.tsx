import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { MotiView } from 'moti';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { RecipeViewStepDTO } from '@recipeer/core';
import { fontFamily, radius, spacing } from '@recipeer/core';

import { PressableScale, Text } from '@/components/ui';
import { cookColors, fmtMs } from '../cook-theme';
import { useRecipeVideo } from '../hooks';
import { UploadSegment } from './upload-segment';
import { YouTubeSegment } from './youtube-segment';

export interface StepVideoProps {
  recipeId: string;
  step: RecipeViewStepDTO;
}

/**
 * Inline "watch this step" player. Shows a play poster first; tapping it fetches
 * the playback descriptor (so we don't load video until asked), shows a loading
 * animation, then plays the step's segment on loop with a mute toggle.
 */
export function StepVideo({ recipeId, step }: StepVideoProps) {
  const clip = step.clip;
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(true);
  const [frameWidth, setFrameWidth] = useState(0);
  const { data: video, isError } = useRecipeVideo(recipeId, started);

  if (!clip) return null;
  const duration = fmtMs(clip.endMs - clip.startMs);
  const onFrameLayout = (e: LayoutChangeEvent) => setFrameWidth(e.nativeEvent.layout.width);
  const ready = started && !!video && !isError;

  return (
    <View style={styles.block}>
      <View style={styles.frame} onLayout={onFrameLayout}>
        {!started ? (
          <PressableScale accessibilityRole="button" accessibilityLabel="Watch this step" onPress={() => setStarted(true)} style={styles.poster}>
            <View style={styles.playBadge}>
              <Ionicons name="play" size={26} color={cookColors.onAccent} />
            </View>
            <Text style={styles.posterLabel}>Watch this step · {duration}</Text>
          </PressableScale>
        ) : ready && video.kind === 'UPLOAD' ? (
          <UploadSegment url={video.url} startMs={clip.startMs} endMs={clip.endMs} muted={muted} />
        ) : ready && video.kind === 'YOUTUBE' && video.youtubeId && frameWidth > 0 ? (
          <YouTubeSegment
            youtubeId={video.youtubeId}
            startMs={clip.startMs}
            endMs={clip.endMs}
            width={frameWidth}
            height={(frameWidth * 10) / 16}
            muted={muted}
          />
        ) : isError ? (
          <Text style={styles.errorText}>Couldn’t load the clip</Text>
        ) : (
          <VideoLoader />
        )}

        {ready ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={muted ? 'Unmute' : 'Mute'}
            onPress={() => setMuted((m) => !m)}
            style={styles.muteBtn}>
            <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={14} color={cookColors.fg} />
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}

/** A tasteful three-dot wave while the clip loads. */
function VideoLoader() {
  return (
    <View style={styles.loader}>
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <MotiView
            key={i}
            from={{ opacity: 0.25, translateY: 3 }}
            animate={{ opacity: 1, translateY: -3 }}
            transition={{ loop: true, repeatReverse: true, type: 'timing', duration: 480, delay: i * 140 }}
            style={styles.dot}
          />
        ))}
      </View>
      <Text style={styles.loaderText}>Loading clip…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.md },
  frame: {
    aspectRatio: 16 / 10,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#120D07',
    alignItems: 'center',
    justifyContent: 'center',
  },
  poster: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  playBadge: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: cookColors.accent, alignItems: 'center', justifyContent: 'center', paddingLeft: 3 },
  posterLabel: { fontFamily: fontFamily.bodyMedium, fontSize: 12.5, color: cookColors.fg },

  loader: { alignItems: 'center', gap: spacing.md },
  dots: { flexDirection: 'row', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: cookColors.accent },
  loaderText: { fontFamily: fontFamily.body, fontSize: 11.5, color: cookColors.fgMuted },

  errorText: { fontFamily: fontFamily.body, fontSize: 12, color: cookColors.fgMuted },

  muteBtn: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
