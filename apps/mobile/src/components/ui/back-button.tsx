import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { colors, sizing } from '@sourcery/core';

import { Icon } from './icon';
import { PressableScale } from './pressable-scale';

/** Circular back control for stacked screens. */
export function BackButton() {
  const router = useRouter();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={() => router.back()}
      style={styles.button}>
      <Icon name="chevron-back" size={22} color="textPrimary" />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    width: sizing.iconButton,
    height: sizing.iconButton,
    borderRadius: sizing.iconButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
