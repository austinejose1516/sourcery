/**
 * Raw brand palette — the only place hex values live.
 * UI code should consume the semantic `colors` map below, never `palette` directly.
 */
export const palette = {
  cream: '#FBF6EC',
  butter: '#F4E4BC',
  espresso: '#3D2817',
  bark: '#6B4423',
  paprika: '#C2410C',
  paprikaDark: '#A83209',
  saffron: '#E8A53D',
  herb: '#7A8B3F',
  chili: '#9B2C2C',
  white: '#FFFFFF',
  hairline: '#E8DCC4',

  // Translucent "ink" overlays (espresso @ alpha) — taken from the source design.
  ink04: 'rgba(61, 40, 23, 0.04)',
  ink06: 'rgba(61, 40, 23, 0.06)',
  ink08: 'rgba(61, 40, 23, 0.08)',
  ink12: 'rgba(61, 40, 23, 0.12)',
  ink18: 'rgba(61, 40, 23, 0.18)',
  ink40: 'rgba(61, 40, 23, 0.40)',
} as const;

/**
 * Semantic colour tokens. Reference these from components so the palette can change
 * in one place without touching screens.
 */
export const colors = {
  // Surfaces
  background: palette.cream,
  surface: palette.white,
  surfaceMuted: palette.butter,
  surfacePressed: palette.ink06,

  // Text
  textPrimary: palette.espresso,
  textSecondary: palette.bark,
  textInverse: palette.cream,
  textPlaceholder: palette.ink40,

  // Brand / interactive
  primary: palette.paprika,
  primaryPressed: palette.paprikaDark,
  onPrimary: palette.cream,
  accent: palette.saffron,
  herb: palette.herb,
  danger: palette.chili,

  // Lines & borders
  border: palette.hairline,
  borderStrong: palette.ink18,
  divider: palette.hairline,

  // Interaction states
  overlayPressed: palette.ink08,
  focusRing: palette.saffron,
} as const;

export type ColorToken = keyof typeof colors;
