import type { RecipeExtractor } from '@recipeer/core';
import { env } from '../env';
import { GoogleAIStudioRecipeExtractor } from './extractors/google';
import { OpenRouterRecipeExtractor } from './extractors/openrouter';

/**
 * Pick the recipe extractor adapter (spec §5 port). Google AI Studio is the
 * default; OpenRouter remains as a fallback. Selection is purely by which key
 * is present, so swapping providers is a .env change — no code edits.
 */
function selectExtractor(): RecipeExtractor {
  if (env.GEMINI_API_KEY) return new GoogleAIStudioRecipeExtractor();
  if (env.OPENROUTER_API_KEY) return new OpenRouterRecipeExtractor();
  throw new Error(
    'No recipe extractor configured. Set GEMINI_API_KEY (Google AI Studio) or OPENROUTER_API_KEY in .env.',
  );
}

let cached: RecipeExtractor | null = null;

/** Lazily resolve the extractor so the server (and /health) boots with no key set. */
export function getExtractor(): RecipeExtractor {
  if (!cached) cached = selectExtractor();
  return cached;
}
