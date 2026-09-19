import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { requireYouTubeEnv } from '../env';

/**
 * AES-256-GCM for OAuth refresh tokens at rest. A refresh token is a bearer
 * credential for someone's YouTube account, so a database leak alone must not be
 * enough to use it — the key lives only in the server's env.
 *
 * Serialised as `iv:authTag:ciphertext`, all base64. GCM authenticates as well as
 * encrypts, so a tampered row fails to decrypt rather than yielding garbage.
 */

const IV_BYTES = 12; // 96 bits — the size GCM is specified for

export function encryptToken(plaintext: string): string {
  const { encKey } = requireYouTubeEnv();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', encKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join(':');
}

export function decryptToken(serialised: string): string {
  const { encKey } = requireYouTubeEnv();
  const [ivB64, tagB64, dataB64] = serialised.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Stored token is malformed (expected iv:tag:ciphertext)');
  }
  const decipher = createDecipheriv('aes-256-gcm', encKey, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}
