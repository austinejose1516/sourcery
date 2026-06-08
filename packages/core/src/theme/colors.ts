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

  // Editorial accents — used to tint cuisine / region chips so cards stay varied.
  // Each pairs a soft surface tint with a saturated ink for text/icons on it.
  apricot: '#F4D3A8',
  apricotInk: '#9A5B16',
  bleu: '#C7D6DE',
  bleuInk: '#2F5A6E',
  burgundy: '#D9B8B8',
  burgundyInk: '#7A2E2E',
  editorial: '#DCE0C4',
  editorialInk: '#566034',

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

  // Editorial chip accents (surface tint + ink pairs)
  apricot: palette.apricot,
  apricotInk: palette.apricotInk,
  bleu: palette.bleu,
  bleuInk: palette.bleuInk,
  burgundy: palette.burgundy,
  burgundyInk: palette.burgundyInk,
  editorial: palette.editorial,
  editorialInk: palette.editorialInk,
} as const;

export type ColorToken = keyof typeof colors;
