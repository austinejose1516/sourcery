import { create } from 'zustand';

import { type AuthSession } from '@/services/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  /** `loading` until the persisted session has been resolved at startup. */
  status: AuthStatus;
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
}

/**
 * Single source of truth for the current session. It is hydrated and kept in
 * sync exclusively by the auth provider's `onAuthStateChange` subscription —
 * components read from it but never write the session directly.
 */
export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  session: null,
  setSession: (session) =>
    set({ session, status: session ? 'authenticated' : 'unauthenticated' }),
}));
