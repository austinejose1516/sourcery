import { z } from 'zod';

/**
 * Runtime-validated environment. Expo inlines `EXPO_PUBLIC_*` vars at build time,
 * so these must be referenced as static `process.env.EXPO_PUBLIC_*` accesses.
 */
const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z
    .string()
    .min(1, 'Set EXPO_PUBLIC_SUPABASE_URL in apps/mobile/.env (e.g. https://xxx.supabase.co)')
    .refine((v) => /^https?:\/\//.test(v), 'EXPO_PUBLIC_SUPABASE_URL must be a full https:// URL'),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'Set EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env'),
});

function loadEnv() {
  const parsed = schema.safeParse({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  • ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return parsed.data;
}

export const env = loadEnv();
