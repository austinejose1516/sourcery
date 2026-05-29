import { z } from 'zod';

const email = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email');

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email,
  password: z.string().min(8, 'Use at least 8 characters'),
});

export const forgotPasswordSchema = z.object({ email });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
