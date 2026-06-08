import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radius, sizing, spacing, type ColorToken } from '@recipeer/core';

import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';
import { Text } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  /** Defaults to full width — the standard for stacked form actions. */
  fullWidth?: boolean;
  leftIcon?: IconName;
  style?: ViewStyle;
}

interface VariantStyle {
  container: ViewStyle;
  labelColor: ColorToken;
  spinnerColor: string;
}

const VARIANTS: Record<ButtonVariant, VariantStyle> = {
  primary: {
    container: { backgroundColor: colors.primary },
    labelColor: 'onPrimary',
    spinnerColor: colors.onPrimary,
  },
  secondary: {
    container: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    labelColor: 'textPrimary',
    spinnerColor: colors.textPrimary,
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    labelColor: 'primary',
    spinnerColor: colors.primary,
  },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  leftIcon,
  style,
}: ButtonProps) {
  const v = VARIANTS[variant];
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={[
        styles.base,
        v.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.spinnerColor} />
      ) : (
        <View style={styles.content}>
          {leftIcon ? <Icon name={leftIcon} size={20} color={v.labelColor} /> : null}
          <Text variant="button" color={v.labelColor}>
            {label}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    height: sizing.buttonHeight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
