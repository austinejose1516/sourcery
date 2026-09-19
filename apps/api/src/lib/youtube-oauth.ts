import { requireYouTubeEnv } from '../env';

/**
 * Google OAuth 2.0, server-side authorization-code flow.
 *
 * We use the "Web application" client type and exchange the code here rather than
 * on the device, so the client secret and the long-lived refresh token never leave
 * the server. The mobile app only ever sees the consent URL.
 */

/** Read-only access to the signed-in user's own YouTube account. */
export const YOUTUBE_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

export function buildAuthUrl(state: string): string {
  const { clientId, redirectUri } = requireYouTubeEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: YOUTUBE_SCOPE,
    // Without access_type=offline Google returns no refresh token at all, and
    // without prompt=consent it omits it on every grant after the first.
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${AUTH_ENDPOINT}?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const { clientId, clientSecret, redirectUri } = requireYouTubeEnv();
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  const payload = (await res.json()) as TokenResponse;
  if (!payload.refresh_token) {
    // Happens if the user previously granted consent and Google skipped the
    // screen. prompt=consent should prevent it; surface it rather than storing
    // a connection we can't refresh tomorrow.
    throw new Error('Google returned no refresh token — revoke access at myaccount.google.com/permissions and retry');
  }
  return payload;
}

/**
 * Access tokens last an hour; refreshing on every request would add a Google
 * round-trip to each page of the picker. Cache per refresh token until shortly
 * before expiry. In-process only — a restart just re-fetches.
 */
const accessTokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const cached = accessTokenCache.get(refreshToken);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const { clientId, clientSecret } = requireYouTubeEnv();
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 400);
    // invalid_grant means the user revoked us, or the app is still in Google's
    // "Testing" publishing mode, where refresh tokens expire after 7 days.
    if (res.status === 400 && detail.includes('invalid_grant')) {
      throw new YouTubeReauthRequiredError();
    }
    throw new Error(`Google token refresh ${res.status}: ${detail}`);
  }

  const payload = (await res.json()) as TokenResponse;
  accessTokenCache.set(refreshToken, {
    token: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in - 60) * 1000,
  });
  return payload.access_token;
}

export async function revoke(refreshToken: string): Promise<void> {
  accessTokenCache.delete(refreshToken);
  const res = await fetch(REVOKE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: refreshToken }),
  });
  // A token that's already invalid is the state we wanted anyway.
  if (!res.ok && res.status !== 400) {
    throw new Error(`Google revoke ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

/** The stored grant is dead — the user has to reconnect their channel. */
export class YouTubeReauthRequiredError extends Error {
  constructor() {
    super('YouTube access expired. Reconnect your channel.');
    this.name = 'YouTubeReauthRequiredError';
  }
}
