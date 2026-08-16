import { z } from 'zod';

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

export const createResetPasswordSchema = (t: TFunc) => z.object({
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(50, "Password must be less than 50 characters")
    .regex(/[a-z]/, "Must include a lowercase letter")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/\d/, "Must include a number")
    .regex(/[^A-Za-z0-9]/, "Must include a special character"),
  confirmPassword: z.string().min(1, "Please confirm your password")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ['confirmPassword']
});

export type ResetPasswordData = z.infer<ReturnType<typeof createResetPasswordSchema>>;
