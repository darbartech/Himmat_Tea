import { z } from 'zod';

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

export const createLoginFormSchema = (t: TFunc) => z.object({
  email: z.string()
    .email(t('validation.email.invalid'))
    .min(1, t('validation.email.required')),
  password: z.string()
    .min(1, t('validation.password.required')),
  rememberMe: z.boolean().optional()
});

export type LoginFormData = z.infer<ReturnType<typeof createLoginFormSchema>>;

