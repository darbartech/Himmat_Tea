import { z } from 'zod';

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

export const createLoginFormSchema = (t: TFunc) => z.object({
  email: z.string()
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
  password: z.string()
    .min(1, "Password is required"),
  rememberMe: z.boolean().optional()
});

export type LoginFormData = z.infer<ReturnType<typeof createLoginFormSchema>>;
