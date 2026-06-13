import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@recipeer/core';

import { Icon, PressableScale, Text } from '@/components/ui';

export interface SearchBarProps {
  /** Placeholder copy — varies per active tab. */
  placeholder: string;
  onPress: () => void;
}

/**
 * The tap-target search pill on the main Explore screen. It isn't a live input —
 * tapping opens the full-screen search overlay.
 */
export function SearchBar({ placeholder, onPress }: SearchBarProps) {
  return (
    <PressableScale
      accessibilityRole="search"
      accessibilityLabel={placeholder}
      onPress={onPress}
      style={styles.bar}>
      <Icon name="search" size={18} color="textSecondary" />
      <Text variant="body" color="textPlaceholder" numberOfLines={1} style={styles.placeholder}>
        {placeholder}
      </Text>
      <View style={styles.mic}>
        <Icon name="mic-outline" size={18} color="textSecondary" />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeholder: { flex: 1 },
  mic: { marginLeft: spacing.xs },
});
