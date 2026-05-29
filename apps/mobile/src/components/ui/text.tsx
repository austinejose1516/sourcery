import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { colors, textVariants, type ColorToken, type TextVariant } from '@sourcery/core';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: ColorToken;
  align?: TextStyle['textAlign'];
}

/**
 * The single text component for the app. Pick a role-based `variant` and a
 * semantic `color` token — never inline font sizes or hex values at call sites.
 */
export function Text({
  variant = 'body',
  color = 'textPrimary',
  align,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      style={[textVariants[variant], { color: colors[color] }, align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
}
