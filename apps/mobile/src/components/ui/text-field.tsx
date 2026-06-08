import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, sizing, spacing, textVariants } from '@recipeer/core';

import { Icon } from './icon';
import { Text } from './text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  /** Validation/help message; turns the field into an error state when set with `invalid`. */
  error?: string;
  /** Subtle helper text shown below when there's no error. */
  hint?: string;
}

const AnimatedView = Animated.View;

/**
 * Labelled text input with an animated focus ring, error state, and a built-in
 * show/hide toggle for password fields.
 */
export function TextField({ label, error, hint, secureTextEntry, ...inputProps }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  const focus = useSharedValue(0);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? colors.danger
      : interpolateColor(focus.value, [0, 1], [colors.border, colors.focusRing]),
  }));

  return (
    <View style={styles.group}>
      {label ? (
        <Text variant="label" color="textSecondary" style={styles.label}>
          {label}
        </Text>
      ) : null}

      <AnimatedView style={[styles.field, borderStyle]}>
        <TextInput
          placeholderTextColor={colors.textPlaceholder}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            focus.value = withTiming(1, { duration: 160 });
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            focus.value = withTiming(0, { duration: 160 });
            inputProps.onBlur?.(e);
          }}
          style={styles.input}
          {...inputProps}
        />

        {secureTextEntry ? (
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((h) => !h)}>
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} color="textSecondary" />
          </Pressable>
        ) : null}
      </AnimatedView>

      {error ? (
        <Text variant="micro" color="danger" style={styles.helper}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="micro" color="textSecondary" style={styles.helper}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  label: { marginLeft: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: sizing.inputHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.input,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    fontFamily: textVariants.body.fontFamily,
    fontSize: textVariants.body.fontSize,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  helper: { marginLeft: spacing.xs },
});
