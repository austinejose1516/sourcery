import { useState } from 'react';
import { StyleSheet, TextInput, type StyleProp, type TextStyle } from 'react-native';
import { colors, radius, spacing } from '@recipeer/core';

/**
 * Inline editable text — looks like plain text until focused, then gets a soft
 * light box. Transparent when idle so it blends into the surrounding card.
 * Shared by the review screen and the steps editor so the affordance stays consistent.
 */
export function Editable({
  value,
  onChangeText,
  multiline,
  placeholder,
  textStyle,
}: {
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  textStyle?: StyleProp<TextStyle>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      multiline={multiline}
      placeholder={placeholder}
      placeholderTextColor={colors.textPlaceholder}
      style={[styles.editable, textStyle, focused && styles.editableFocused]}
    />
  );
}

const styles = StyleSheet.create({
  editable: {
    color: colors.textPrimary,
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.input,
    margin: 0,
  },
  editableFocused: { backgroundColor: colors.surfaceMuted },
});
