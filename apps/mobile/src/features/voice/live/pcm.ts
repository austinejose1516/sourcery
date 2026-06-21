/**
 * Audio format glue between react-native-audio-api (float32 samples, −1..1) and
 * the Gemini Live API (16-bit PCM, little-endian: 16 kHz mono in, 24 kHz out).
 * All pure + dependency-free so it can be unit-tested off-device.
 */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = (() => {
  const table = new Uint8Array(256);
  for (let i = 0; i < B64.length; i++) table[B64.charCodeAt(i)] = i;
  return table;
})();

/** Float32 [-1,1] → little-endian int16 PCM bytes. */
export function floatTo16BitPCM(input: Float32Array): Uint8Array {
  const out = new Uint8Array(input.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true /* little-endian */);
  }
  return out;
}

/** Little-endian int16 PCM bytes → Float32 [-1,1]. */
export function pcm16ToFloat32(bytes: Uint8Array): Float32Array {
  const frames = Math.floor(bytes.length / 2);
  const out = new Float32Array(frames);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < frames; i++) {
    out[i] = view.getInt16(i * 2, true) / 0x8000;
  }
  return out;
}

/**
 * Linear-interpolation resample. Only needed if the recorder won't honor the
 * requested 16 kHz (the docs warn the hardware rate may differ). Fine for a
 * spike; swap for a filtered resampler if aliasing is audible.
 */
export function resampleFloat32(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLength = Math.floor(input.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = pos - i0;
    out[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + '==';
  } else if (rem === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + '=';
  }
  return out;
}

export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const pad = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const byteLength = (clean.length * 3) / 4 - pad;
  const out = new Uint8Array(byteLength);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (B64_LOOKUP[clean.charCodeAt(i)] << 18) |
      (B64_LOOKUP[clean.charCodeAt(i + 1)] << 12) |
      (B64_LOOKUP[clean.charCodeAt(i + 2)] << 6) |
      B64_LOOKUP[clean.charCodeAt(i + 3)];
    if (p < byteLength) out[p++] = (n >> 16) & 0xff;
    if (p < byteLength) out[p++] = (n >> 8) & 0xff;
    if (p < byteLength) out[p++] = n & 0xff;
  }
  return out;
}
