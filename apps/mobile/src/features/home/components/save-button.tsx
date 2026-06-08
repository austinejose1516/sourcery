import { StyleSheet, View } from 'react-native';
import { colors, radius } from '@recipeer/core';

import { Icon, PressableScale } from '@/components/ui';

export interface SaveButtonProps {
  saved: boolean;
  onPress: () => void;
}

/** Circular bookmark toggle overlaid on a recipe cover. */
export function SaveButton({ saved, onPress }: SaveButtonProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from saved' : 'Save recipe'}
      accessibilityState={{ selected: saved }}
      onPress={onPress}
      hitSlop={8}>
      <View style={styles.button}>
        <Icon name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={saved ? 'primary' : 'textPrimary'} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
