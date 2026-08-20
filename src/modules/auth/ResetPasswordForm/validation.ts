import { z } from 'zod';

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

export const createResetPasswordSchema = (t: TFunc) => z.object({
  newPassword: z.string()
    .min(8, t('validation.password.minLength'))
    .max(50, t('validation.password.maxLength'))
    .regex(/[a-z]/, t('validation.password.lowercase'))
    .regex(/[A-Z]/, t('validation.password.uppercase'))
    .regex(/\d/, t('validation.password.number'))
    .regex(/[^A-Za-z0-9]/, t('validation.password.specialChar')),
  confirmPassword: z.string().min(1, t('validation.password.confirmRequired'))
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: t('validation.password.mismatch'),
  path: ['confirmPassword']
});

export type ResetPasswordData = z.infer<ReturnType<typeof createResetPasswordSchema>>;
