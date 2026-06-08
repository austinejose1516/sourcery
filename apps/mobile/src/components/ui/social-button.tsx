import { StyleSheet, View } from 'react-native';
import { colors, radius, sizing, spacing } from '@recipeer/core';

import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

export type SocialProvider = 'apple' | 'google';

const PROVIDERS: Record<SocialProvider, { label: string; icon: IconName }> = {
  apple: { label: 'Continue with Apple', icon: 'logo-apple' },
  google: { label: 'Continue with Google', icon: 'logo-google' },
};

export interface SocialButtonProps {
  provider: SocialProvider;
  onPress?: () => void;
  disabled?: boolean;
}

/** Outlined third-party sign-in button. Presentational — wire `onPress` from the screen. */
export function SocialButton({ provider, onPress, disabled }: SocialButtonProps) {
  const { label, icon } = PROVIDERS[provider];

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}>
      <View style={styles.content}>
        <Icon name={icon} size={20} color="textPrimary" />
        <Text variant="bodyStrong">{label}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    height: sizing.buttonHeight,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  disabled: { opacity: 0.5 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
