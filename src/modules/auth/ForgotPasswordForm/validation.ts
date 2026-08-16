import { z } from 'zod';

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

export const createForgotPasswordSchema = (t: TFunc) => z.object({
  email: z.string()
    .email(t('validation.email.invalid'))
    .min(1, t('validation.email.required'))
});

export type ForgotPasswordData = z.infer<ReturnType<typeof createForgotPasswordSchema>>;
