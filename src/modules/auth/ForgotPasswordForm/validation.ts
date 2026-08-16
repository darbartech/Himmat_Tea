import { z } from 'zod';

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

export const createForgotPasswordSchema = (t: TFunc) => z.object({
  email: z.string()
    .email("Please enter a valid email address")
    .min(1, "Email is required")
});

export type ForgotPasswordData = z.infer<ReturnType<typeof createForgotPasswordSchema>>;
