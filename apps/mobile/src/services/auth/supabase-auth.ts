import {
  AuthError as SupabaseAuthError,
  type Session,
  type User,
} from '@supabase/supabase-js';

import { supabase } from '../supabase/client';
import {
  AuthError,
  type AuthService,
  type AuthSession,
  type SignInInput,
  type SignUpInput,
} from './types';

function toAuthSession(user: User): AuthSession {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    (typeof meta.name === 'string' && meta.name) ||
    (typeof meta.full_name === 'string' && meta.full_name) ||
    null;

  return { userId: user.id, email: user.email ?? null, displayName };
}

function sessionToAuth(session: Session | null): AuthSession | null {
  return session?.user ? toAuthSession(session.user) : null;
}

/** Map provider-specific failures onto our normalized AuthError codes. */
function normalizeError(error: unknown): AuthError {
  if (error instanceof SupabaseAuthError) {
    switch (error.code) {
      case 'invalid_credentials':
        return new AuthError('invalid_credentials', "That email or password doesn't look right.");
      case 'user_already_exists':
      case 'email_exists':
        return new AuthError('email_taken', 'An account with this email already exists.');
      case 'weak_password':
        return new AuthError('weak_password', 'Please choose a stronger password.');
      case 'email_not_confirmed':
        return new AuthError('email_not_confirmed', 'Please confirm your email, then sign in.');
      default:
        return new AuthError('unknown', error.message);
    }
  }
  if (error instanceof Error && /network|fetch/i.test(error.message)) {
    return new AuthError('network', 'Network problem — check your connection and try again.');
  }
  return new AuthError('unknown', 'Something went wrong. Please try again.');
}

export const supabaseAuthService: AuthService = {
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw normalizeError(error);
    return sessionToAuth(data.session);
  },

  onAuthStateChange(listener) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      listener(sessionToAuth(session));
    });
    return () => data.subscription.unsubscribe();
  },

  async signUp({ name, email, password }: SignUpInput) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw normalizeError(error);

    // With "Confirm email" enabled there's no session yet — guide the user instead
    // of silently failing the onboarding flow.
    if (!data.session) {
      throw new AuthError(
        'email_not_confirmed',
        'Almost there — check your email to confirm your account, then sign in.',
      );
    }
    return toAuthSession(data.session.user);
  },

  async signIn({ email, password }: SignInInput) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw normalizeError(error);
    return toAuthSession(data.user);
  },

  async sendPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw normalizeError(error);
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw normalizeError(error);
  },
};
