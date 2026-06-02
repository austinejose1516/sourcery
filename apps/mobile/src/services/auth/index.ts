import { supabaseAuthService } from './supabase-auth';
import { type AuthService } from './types';

/**
 * The single wiring point for the auth backend. To switch providers, implement
 * `AuthService` elsewhere and reassign here — no screen or hook needs to change.
 */
export const authService: AuthService = supabaseAuthService;

export {
  AuthError,
  type AuthSession,
  type AuthErrorCode,
  type SignInInput,
  type SignUpInput,
  type AuthService,
} from './types';
