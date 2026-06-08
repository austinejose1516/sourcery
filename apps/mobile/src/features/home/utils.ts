/**
 * Turns an ISO-3166 alpha-2 country code into its flag emoji by mapping each
 * letter to its regional-indicator symbol. Returns '' for unknown/blank codes.
 */
export function countryToFlag(iso: string | null | undefined): string {
  if (!iso || iso.length !== 2) return '';
  const A = 0x1f1e6;
  const code = iso.toUpperCase();
  const first = code.charCodeAt(0) - 65;
  const second = code.charCodeAt(1) - 65;
  if (first < 0 || first > 25 || second < 0 || second > 25) return '';
  return String.fromCodePoint(A + first) + String.fromCodePoint(A + second);
}

/** Minimal ISO-3166 alpha-2 → display name for the seed set's countries. */
const COUNTRY_NAMES: Record<string, string> = {
  IN: 'India',
  VN: 'Vietnam',
  BR: 'Brazil',
  GE: 'Georgia',
  MA: 'Morocco',
  LB: 'Lebanon',
  KR: 'South Korea',
  CA: 'Canada',
};

export const countryName = (iso: string | null | undefined): string =>
  (iso && COUNTRY_NAMES[iso]) || iso || '';

/** "Kerala, India" from a region's name + country code. */
export const regionLabel = (region: { name: string; country: string } | null): string | null =>
  region ? `${region.name}, ${countryName(region.country)}` : null;

/**
 * Compact relative time for feed timestamps, e.g. "now", "2h", "3d", "5w".
 */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 52) return `${weeks}w`;
  return `${Math.floor(days / 365)}y`;
}
