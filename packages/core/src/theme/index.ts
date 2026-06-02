export { palette, colors, type ColorToken } from './colors';
export {
  fontFamily,
  typography,
  textVariants,
  type TextVariant,
} from './typography';
export { spacing, radius, sizing, type SpacingToken } from './spacing';

import { colors } from './colors';
import { fontFamily, textVariants, typography } from './typography';
import { radius, sizing, spacing } from './spacing';

/** Single aggregated theme object for convenient consumption. */
export const theme = {
  colors,
  spacing,
  radius,
  sizing,
  fontFamily,
  textVariants,
  typography,
} as const;

export type Theme = typeof theme;
