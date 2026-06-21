/**
 * Shared types for the app-wide hands-free voice assistant.
 *
 * The model is given the *actions available on the current screen* as function
 * declarations and decides per utterance whether to call one (a command) or
 * answer in words (a question). Any screen contributes its own actions + context
 * via useVoiceActions / useVoiceContext, so the same assistant controls the whole
 * app, not just cook mode.
 */

/**
 * - idle: assistant off
 * - wake: armed, listening locally for the wake word (no streaming yet)
 * - connecting: wake word heard, opening the Gemini Live session
 * - listening: streaming the cook's speech to Gemini
 * - thinking: model is working (kept for the REST fallback path)
 * - speaking: playing Gemini's spoken reply
 * - error: something failed
 */
export type VoiceStatus =
  | 'idle'
  | 'wake'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

/** A capability the assistant can invoke on the current screen. */
export interface VoiceAction {
  /** snake_case function name Gemini will call, e.g. "next_step". */
  name: string;
  /** Natural-language description Gemini uses to decide when to call it. */
  description: string;
  /** OpenAPI-subset JSON schema for the call args (omit for no-arg actions). */
  parameters?: Record<string, unknown>;
  /**
   * Runs the action. Returning a non-empty string makes the assistant speak it
   * (e.g. repeat_step returns the instruction). Returning nothing stays silent —
   * the UI is its own feedback.
   */
  handler: (args: Record<string, unknown>) => void | string | Promise<void | string>;
}

/** Returns a free-text description of what's on screen right now. */
export type VoiceContextProvider = () => string;
