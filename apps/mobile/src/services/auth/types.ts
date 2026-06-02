/**
 * Backend-agnostic auth contract.
 *
 * Screens and hooks depend ONLY on this port — never on Supabase directly.
 * Swapping providers (Firebase, Auth0, a custom API…) means writing one new
 * implementation of `AuthService` and changing the wiring in `./index.ts`.
 */

/** The app's normalized notion of a signed-in user. */
export interface AuthSession {
  userId: string;
  email: string | null;
  displayName: string | null;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_taken'
  | 'weak_password'
  | 'email_not_confirmed'
  | 'network'
  | 'unknown';

/** Normalized, provider-independent error so the UI can branch on `code`. */
export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

export type Unsubscribe = () => void;

export interface AuthService {
  /** Current session if one is persisted, else null. */
  getSession(): Promise<AuthSession | null>;
  /** Subscribe to sign-in / sign-out events. Returns an unsubscribe fn. */
  onAuthStateChange(listener: (session: AuthSession | null) => void): Unsubscribe;
  signUp(input: SignUpInput): Promise<AuthSession>;
  signIn(input: SignInInput): Promise<AuthSession>;
  sendPasswordReset(email: string): Promise<void>;
  signOut(): Promise<void>;
}
