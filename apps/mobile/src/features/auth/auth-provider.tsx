import { useEffect, type ReactNode } from 'react';

import { authService } from '@/services/auth';

import { useAuthStore } from './store';

/**
 * Bootstraps auth state at startup and keeps the store in sync with the backend:
 * resolves any persisted session, then subscribes to sign-in/out events.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    let active = true;

    authService
      .getSession()
      .then((session) => active && setSession(session))
      .catch(() => active && setSession(null));

    const unsubscribe = authService.onAuthStateChange((session) => setSession(session));

    return () => {
      active = false;
      unsubscribe();
    };
  }, [setSession]);

  return <>{children}</>;
}
