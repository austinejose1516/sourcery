import type { CautionLevelDTO } from '@recipeer/core';

import type { IconName } from '@/components/ui';

/**
 * Dark, immersive palette for cook mode — high-contrast for glancing at while
 * your hands are busy. Centralised here (the single source of cook-mode hex) so
 * the cook components never inline colour values.
 */
export const cookColors = {
  bg: '#1A1208',
  fg: '#FBF6EC',
  fgMuted: 'rgba(251,246,236,0.60)',
  fgFaint: 'rgba(251,246,236,0.40)',
  panel: 'rgba(255,255,255,0.055)',
  panelStrong: 'rgba(255,255,255,0.09)',
  border: 'rgba(255,255,255,0.10)',
  chip: 'rgba(255,255,255,0.08)',
  overlay: 'rgba(12,8,3,0.86)',
  scrim: 'rgba(0,0,0,0.5)',
  sheet: '#15100A',
  // Brand accents from the light palette — they stay legible on the dark ground.
  accent: '#E8A53D', // saffron
  primary: '#C2410C', // paprika
  success: '#7A8B3F', // herb
  onAccent: '#1A1208',
} as const;

export interface CautionVisual {
  accent: string;
  label: string;
  icon: IconName;
}

/** Visual treatment for a step caution, by severity. */
export function cautionVisual(level: CautionLevelDTO): CautionVisual {
  switch (level) {
    case 'CRITICAL':
      return { accent: '#D9533F', label: 'Important', icon: 'alert-circle' };
    case 'WARN':
      return { accent: '#C2410C', label: 'Take care', icon: 'flame' };
    case 'CAUTION':
    default:
      return { accent: '#B8862F', label: 'Heads up', icon: 'alert-circle' };
  }
}

/** seconds → "m:ss". */
export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** milliseconds → "m:ss" (for clip ranges + durations). */
export const fmtMs = (ms: number) => fmtClock(ms / 1000);
