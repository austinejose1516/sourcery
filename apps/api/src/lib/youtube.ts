/**
 * Extracts the canonical YouTube video id from any of the common URL shapes:
 *   - https://www.youtube.com/watch?v=ID
 *   - https://youtu.be/ID
 *   - https://www.youtube.com/shorts/ID
 *   - https://www.youtube.com/embed/ID
 * Returns null for non-YouTube URLs so callers can reject them.
 */
export function parseYouTubeId(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const isYt = host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be';
  if (!isYt) return null;

  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    return isValidId(id) ? id : null;
  }

  const v = u.searchParams.get('v');
  if (v && isValidId(v)) return v;

  const m = u.pathname.match(/\/(shorts|embed|v)\/([^/?#]+)/);
  if (m && isValidId(m[2])) return m[2];

  return null;
}

function isValidId(id: string | undefined): id is string {
  return !!id && /^[A-Za-z0-9_-]{6,}$/.test(id);
}
