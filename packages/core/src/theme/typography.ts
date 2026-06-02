/**
 * Font families map to the exact @expo-google-fonts weights loaded at app start
 * (see the root layout's useFonts call). Keep these in sync.
 */
export const fontFamily = {
  display: 'Fraunces_500Medium',
  displaySemibold: 'Fraunces_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
} as const;

/**
 * Role-based text variants. The `<Text>` primitive renders one of these,
 * so screens never hand-assemble font/size/lineHeight combinations.
 */
export const textVariants = {
  display: { fontFamily: fontFamily.display, fontSize: 36, lineHeight: 42, letterSpacing: -0.5 },
  title: { fontFamily: fontFamily.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.3 },
  heading: { fontFamily: fontFamily.displaySemibold, fontSize: 22, lineHeight: 28 },
  body: { fontFamily: fontFamily.body, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamily.bodyMedium, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fontFamily.bodyMedium, fontSize: 14, lineHeight: 20 },
  button: { fontFamily: fontFamily.bodySemibold, fontSize: 16, lineHeight: 20 },
  caption: { fontFamily: fontFamily.body, fontSize: 14, lineHeight: 20 },
  micro: { fontFamily: fontFamily.body, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
} as const;

export type TextVariant = keyof typeof textVariants;

/** Legacy flat scale kept for any non-variant call-sites. */
export const typography = {
  fontFamily,
  fontSize: { display: 36, h1: 28, h2: 22, body: 16, caption: 14, micro: 12 },
  lineHeight: { display: 42, h1: 34, h2: 28, body: 24, caption: 20 },
} as const;
