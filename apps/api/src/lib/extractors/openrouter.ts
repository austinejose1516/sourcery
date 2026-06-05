import {
  type RecipeExtraction,
  type RecipeExtractor,
  recipeExtractionSchema,
} from '@sourcery/core';
import { env } from '../../env';
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_USER_PROMPT } from '../prompt';
import { fetchVideoBytes, stripJsonFences } from './shared';

/**
 * RecipeExtractor adapter: OpenRouter → Gemini Flash (kept as a fallback to the
 * Google AI Studio adapter). Video is base64-inlined as a `video_url` data URL,
 * which is the dependable path through OpenRouter's Gemini routing but caps out
 * on request size for long videos.
 */
export class OpenRouterRecipeExtractor implements RecipeExtractor {
  async extract({ videoUri }: { videoUri: string }): Promise<RecipeExtraction> {
    const { bytes, mime } = await fetchVideoBytes(videoUri);
    const dataUrl = `data:${mime};base64,${bytes.toString('base64')}`;

    const res = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'Sourcery',
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: EXTRACTION_USER_PROMPT },
              { type: 'video_url', video_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`OpenRouter ${res.status}: ${detail.slice(0, 800)}`);
    }

    const payload = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`OpenRouter returned no content: ${JSON.stringify(payload).slice(0, 800)}`);
    }

    return recipeExtractionSchema.parse(JSON.parse(stripJsonFences(content)));
  }
}
