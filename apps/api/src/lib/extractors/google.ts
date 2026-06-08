import {
  type RecipeExtraction,
  type RecipeExtractor,
  recipeExtractionSchema,
} from '@recipeer/core';
import { env } from '../../env';
import { EXTRACTION_SYSTEM_PROMPT, EXTRACTION_USER_PROMPT } from '../prompt';
import { fetchVideoBytes, isYouTubeUrl, sleep, stripJsonFences } from './shared';

/**
 * RecipeExtractor adapter: Google AI Studio (Gemini API) via the Files API.
 *
 * Video is fetched server-side, uploaded to the Files API (resumable), polled
 * until ACTIVE, then referenced from generateContent in JSON mode. Unlike inline
 * base64 this handles real, multi-minute videos (Files API takes up to ~2GB).
 */
export class GoogleAIStudioRecipeExtractor implements RecipeExtractor {
  private readonly base = env.GEMINI_BASE_URL.replace(/\/$/, '');

  async extract({ videoUri }: { videoUri: string }): Promise<RecipeExtraction> {
    const key = env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set');

    let fileData: { fileUri: string; mimeType?: string };
    if (isYouTubeUrl(videoUri)) {
      // Gemini ingests YouTube URLs natively — no download/upload needed.
      fileData = { fileUri: videoUri };
    } else {
      const { bytes, mime } = await fetchVideoBytes(videoUri);
      const file = await this.uploadFile(bytes, mime, key);
      await this.waitUntilActive(file.name, key);
      fileData = { fileUri: file.uri, mimeType: file.mimeType ?? mime };
    }

    const text = await this.generate(fileData, key);
    return recipeExtractionSchema.parse(JSON.parse(stripJsonFences(text)));
  }

  /** Resumable upload → returns the created file's name/uri/state. */
  private async uploadFile(bytes: Buffer, mime: string, key: string) {
    const startRes = await fetch(`${this.base}/upload/v1beta/files?key=${key}`, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(bytes.length),
        'X-Goog-Upload-Header-Content-Type': mime,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: 'recipeer-upload' } }),
    });
    if (!startRes.ok) {
      throw new Error(`Files API start ${startRes.status}: ${(await startRes.text()).slice(0, 400)}`);
    }
    const uploadUrl = startRes.headers.get('x-goog-upload-url');
    if (!uploadUrl) throw new Error('Files API did not return an upload URL');

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: new Blob([new Uint8Array(bytes)], { type: mime }),
    });
    if (!uploadRes.ok) {
      throw new Error(`Files API upload ${uploadRes.status}: ${(await uploadRes.text()).slice(0, 400)}`);
    }
    const payload = (await uploadRes.json()) as {
      file?: { name: string; uri: string; state: string; mimeType?: string };
    };
    if (!payload.file?.uri || !payload.file?.name) {
      throw new Error(`Files API returned no file: ${JSON.stringify(payload).slice(0, 400)}`);
    }
    return payload.file;
  }

  /** Video files are PROCESSING after upload; generateContent needs ACTIVE. */
  private async waitUntilActive(name: string, key: string) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const res = await fetch(`${this.base}/v1beta/${name}?key=${key}`);
      if (!res.ok) {
        throw new Error(`Files API get ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }
      const { state } = (await res.json()) as { state: string };
      if (state === 'ACTIVE') return;
      if (state === 'FAILED') throw new Error('Gemini failed to process the video file');
      await sleep(2000);
    }
    throw new Error('Timed out waiting for Gemini to process the video');
  }

  private async generate(
    fileData: { fileUri: string; mimeType?: string },
    key: string,
  ): Promise<string> {
    const res = await fetch(`${this.base}/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: EXTRACTION_SYSTEM_PROMPT }] },
        contents: [
          {
            role: 'user',
            parts: [{ text: EXTRACTION_USER_PROMPT }, { fileData }],
          },
        ],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) {
      throw new Error(`Gemini generateContent ${res.status}: ${(await res.text()).slice(0, 600)}`);
    }
    const payload = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
    if (!text) {
      throw new Error(`Gemini returned no content: ${JSON.stringify(payload).slice(0, 600)}`);
    }
    return text;
  }
}
