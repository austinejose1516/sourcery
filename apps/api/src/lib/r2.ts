import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { MediaStore } from '@recipeer/core';
import { env, requireR2Env } from '../env';

/**
 * MediaStore adapter backed by Cloudflare R2 (S3-compatible). The mobile client
 * uploads bytes directly to the presigned PUT URL — never through this API.
 *
 * R2 credentials are resolved lazily on first use, so the server (and /health)
 * boots even before the R2 API token is configured — only the upload/process
 * endpoints fail, with a clear message naming what's missing.
 */
let cached: { client: S3Client; bucket: string } | null = null;

function getClient() {
  if (cached) return cached;
  const r2 = requireR2Env();
  cached = {
    bucket: r2.bucket,
    client: new S3Client({
      region: 'auto',
      endpoint: r2.endpoint,
      credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
      forcePathStyle: true,
    }),
  };
  return cached;
}

/**
 * Note: we deliberately do NOT sign ContentType into the PUT. SigV4 only
 * validates headers that were signed, so leaving it out means the client can
 * send any Content-Type header without a signature mismatch (the #1 R2 presign
 * failure). The bytes are what matter for the spike.
 */
export const mediaStore: MediaStore = {
  async presignUpload(key) {
    const { client, bucket } = getClient();
    const url = await getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: env.R2_PRESIGN_EXPIRES,
    });
    return { url };
  },

  async getSignedUrl(key) {
    const { client, bucket } = getClient();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: env.R2_PRESIGN_EXPIRES,
    });
  },
};
