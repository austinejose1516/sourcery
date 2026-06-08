import { useMutation } from '@tanstack/react-query';
import { apiPost } from '@/lib/api-client';
import { authService, type SignInInput, type SignUpInput } from '@/services/auth';
import { type AuthSession } from '@/services/auth/types';
import { useAuthStore } from './store';

async function syncUser(session: AuthSession) {
  await apiPost('/users/sync', {
    userId: session.userId,
    displayName: session.displayName,
    email: session.email,
  });
}

/** Current session (or null). */
export const useSession = () => useAuthStore((s) => s.session);

/** Auth lifecycle status: 'loading' | 'authenticated' | 'unauthenticated'. */
export const useAuthStatus = () => useAuthStore((s) => s.status);

/**
 * Auth actions as react-query mutations. Each writes the resulting session into
 * the store on success so navigation guards see the new state immediately (the
 * provider's onAuthStateChange subscription then keeps it in sync thereafter).
 */
export const useSignIn = () => {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: SignInInput) => authService.signIn(input),
    onSuccess: async (session) => {
      setSession(session);
      await syncUser(session);
    },
  });
};

export const useSignUp = () => {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: SignUpInput) => authService.signUp(input),
    onSuccess: async (session) => {
      setSession(session);
      await syncUser(session);
    },
  });
};

export const useSendPasswordReset = () =>
  useMutation({ mutationFn: (email: string) => authService.sendPasswordReset(email) });

export const useSignOut = () => {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: () => authService.signOut(),
    onSuccess: () => setSession(null),
  });
};
