import { supabase } from '@/services/supabase/client';
import { env } from './env';

/**
 * Tiny typed fetch wrapper around the Hono API (apps/api). Centralises the base
 * URL, JSON encoding and error normalisation so feature hooks stay declarative.
 */
const BASE_URL = env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token
    ? { Authorization: `Bearer ${data.session.access_token}` }
    : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = await authHeader();
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...auth, ...init?.headers },
    });
  } catch {
    // Network-level failure (server down, wrong EXPO_PUBLIC_API_URL, no LAN route).
    throw new ApiError(
      "Couldn't reach the server. Is the API running and EXPO_PUBLIC_API_URL correct?",
      0,
    );
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(body?.error ?? `Request failed (${res.status})`, res.status);
  }
  return (await res.json()) as T;
}

export const apiGet = <T>(path: string) => request<T>(path, { method: 'GET' });

export const apiPost = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

export const apiDelete = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined });
