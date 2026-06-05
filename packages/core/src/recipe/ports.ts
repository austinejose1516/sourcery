import type { RecipeExtraction } from './schema';

/**
 * Volatile external seams (Technical Spec §5). Consumers depend on these
 * interfaces, never on a concrete vendor, so adapters can be swapped without
 * touching call sites (e.g. OpenRouter → Vertex; Supabase Storage → R2).
 */

export interface RecipeExtractor {
  /** OpenRouter→Gemini now; Google AI Studio / Vertex fallback (spec §11, risk 1). */
  extract(input: { videoUri: string }): Promise<RecipeExtraction>;
}

export interface MediaStore {
  /** Presigned PUT URL the client uploads to directly (never through the API). */
  presignUpload(key: string): Promise<{ url: string }>;
  /** Short-lived signed GET URL for reading an object back. */
  getSignedUrl(key: string): Promise<string>;
}
