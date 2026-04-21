import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
});

export const LoginSchema = z.object({
  email: z.email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

export const VerifyOtpSchema = z.object({
  userId: z.uuid('Invalid user ID'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const ResendOtpSchema = z.object({
  userId: z.uuid('Invalid user ID'),
});

export const ForgotPasswordSchema = z.object({
  email: z.email('Invalid email format'),
});

export const ResetPasswordSchema = z.object({
  email: z.email('Invalid email format'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});
