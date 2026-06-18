import * as FileSystem from 'expo-file-system/legacy';
import type {
  MyRecipesResponse,
  ProcessingJobDTO,
  RecipeDetailDTO,
  RecipeVisibilityDTO,
  UpdateRecipeInput,
} from '@recipeer/core';
import { apiDelete, apiGet, apiPatch, apiPost, authToken, BASE_URL } from '@/lib/api-client';

export const fetchMyRecipes = () => apiGet<MyRecipesResponse>('/recipes/mine');

export const fetchJob = (jobId: string) => apiGet<ProcessingJobDTO>(`/recipes/jobs/${jobId}`);

export const fetchRecipeDetail = (recipeId: string) => apiGet<RecipeDetailDTO>(`/recipes/${recipeId}`);

export const updateRecipe = (recipeId: string, input: UpdateRecipeInput) =>
  apiPatch<{ ok: true }>(`/recipes/${recipeId}`, input);

export const publishRecipe = (recipeId: string, visibility: RecipeVisibilityDTO) =>
  apiPost<{ ok: true }>(`/recipes/${recipeId}/publish`, { visibility });

export const deleteRecipe = (recipeId: string) => apiDelete<{ ok: true }>(`/recipes/${recipeId}`);

export const dismissJob = (jobId: string) => apiDelete<{ ok: true }>(`/recipes/jobs/${jobId}`);

export const ingestUpload = (key: string) => apiPost<{ jobId: string }>('/recipes/ingest', { key });

export const importYouTubeLink = (url: string) =>
  apiPost<{ jobId?: string; recipeId?: string; deduped: boolean }>('/recipes/import-link', { url });

/**
 * Presigns an R2 key then uploads a local file directly to R2. Returns the object
 * key. The API never proxies the bytes — the client PUTs straight to the presigned
 * URL.
 */
export async function uploadFile(
  fileUri: string,
  ext: string,
  opts?: {
    onProgress?: (fraction: number) => void;
    /** Receives the upload task before it starts, so the UI can cancel it. */
    onTask?: (task: FileSystem.UploadTask) => void;
  },
): Promise<{ key: string }> {
  const { key, url } = await apiPost<{ key: string; url: string }>('/uploads/presign', { ext });

  const task = FileSystem.createUploadTask(
    url,
    fileUri,
    { httpMethod: 'PUT', uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT },
    (p) => {
      if (p.totalBytesExpectedToSend > 0) {
        opts?.onProgress?.(p.totalBytesSent / p.totalBytesExpectedToSend);
      }
    },
  );
  opts?.onTask?.(task);

  const result = await task.uploadAsync();
  if (!result || result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed (${result?.status ?? 'no response'})`);
  }
  return { key };
}

/** Upload a recipe video (to pass to /recipes/ingest) — alias of uploadFile. */
export const uploadVideo = uploadFile;

/** Upload a cover/thumbnail image; returns its R2 key for PATCH /recipes/:id. */
export const uploadImage = (fileUri: string, ext: string) => uploadFile(fileUri, ext);

// Re-exported so callers don't import api-client directly for the rare raw case.
export { authToken, BASE_URL };
