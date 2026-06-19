import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fontFamily, radius, spacing } from '@recipeer/core';

import { PressableScale, Text } from '@/components/ui';
import { cookColors, fmtClock } from '../cook-theme';

export interface StepTimerProps {
  seconds: number;
  label: string;
}

/** Inline countdown for a waiting step — tap to start/pause, restart when done. */
export function StepTimer({ seconds, label }: StepTimerProps) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset whenever we land on a different waiting step.
  useEffect(() => {
    setLeft(seconds);
    setRunning(false);
    setDone(false);
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    interval.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          setRunning(false);
          setDone(true);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, [running]);

  const pct = seconds > 0 ? 1 - left / seconds : 0;

  const onPress = () => {
    if (done) {
      setLeft(seconds);
      setDone(false);
      setRunning(true);
    } else {
      setRunning((r) => !r);
    }
  };

  const subtitle = done
    ? `${label} complete`
    : running
      ? `${label} · counting down`
      : `${fmtClock(seconds)} · tap to start ${label}`;

  return (
    <View style={styles.card}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={done ? 'Restart timer' : running ? 'Pause timer' : 'Start timer'}
        onPress={onPress}
        style={[styles.button, { backgroundColor: done ? cookColors.success : cookColors.accent }]}>
        <Ionicons name={done ? 'checkmark' : running ? 'pause' : 'play'} size={20} color={cookColors.onAccent} />
      </PressableScale>
      <View style={styles.meta}>
        <Text style={[styles.time, { color: done ? cookColors.success : cookColors.fg }]}>
          {done ? 'Done' : fmtClock(left)}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: done ? cookColors.success : cookColors.accent }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: cookColors.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: cookColors.border,
  },
  button: { width: 46, height: 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1, minWidth: 0 },
  time: { fontFamily: fontFamily.bodySemibold, fontSize: 24, letterSpacing: 0.5, lineHeight: 28 },
  subtitle: { fontFamily: fontFamily.body, fontSize: 12, color: cookColors.fgMuted, marginTop: 2 },
  track: { height: 3, borderRadius: 2, backgroundColor: cookColors.chip, marginTop: spacing.sm, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
});
