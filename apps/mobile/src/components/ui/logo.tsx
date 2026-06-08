import { StyleSheet, Text as RNText, View, type ViewStyle } from 'react-native';
import { colors, fontFamily, spacing } from '@recipeer/core';

const HONEY = '#D4A574';

const SIZES = {
  lg: { fontSize: 48, letterSpacing: -0.96, gap: spacing.xxs },
} as const;

export interface LogoProps {
  size?: keyof typeof SIZES;
  style?: ViewStyle;
}

export function Logo({ size = 'lg', style }: LogoProps) {
  const wm = SIZES[size];
  return (
    <View style={[styles.root, { gap: wm.gap }, style]}>
      <RNText
        style={[styles.wordmark, { fontSize: wm.fontSize, letterSpacing: wm.letterSpacing }]}
        allowFontScaling={false}
      >
        <RNText style={styles.reci}>Reci</RNText>
        <RNText style={styles.peer}>Peer</RNText>
      </RNText>

      <View style={styles.ornamentRow}>
        <View style={styles.rule} />
        <RNText style={styles.tagline} numberOfLines={1} allowFontScaling={false}>
          cook · share · connect
        </RNText>
        <View style={styles.rule} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: fontFamily.display,
  },
  reci: {
    color: colors.textPrimary,
  },
  peer: {
    color: colors.primary,
  },
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rule: {
    width: spacing.lg,
    height: 1,
    borderRadius: 1,
    backgroundColor: HONEY,
  },
  tagline: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 9,
    letterSpacing: 2.2,
    color: colors.textSecondary,
  },
});
