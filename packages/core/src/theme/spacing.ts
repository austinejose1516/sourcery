/** 4pt spacing scale. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  input: 14,
  card: 20,
  pill: 999,
} as const;

export const sizing = {
  buttonHeight: 52,
  inputHeight: 54,
  iconButton: 44,
  maxContentWidth: 480,
} as const;

export type SpacingToken = keyof typeof spacing;
