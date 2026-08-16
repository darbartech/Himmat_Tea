import { z } from 'zod';

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

export const createSignupFormSchema = (t: TFunc) => z.object({
  name: z.string()
    .min(2, t('validation.name.minLength'))
    .max(100, t('validation.name.maxLength'))
    .regex(/^[a-zA-Z\s'-]+$/, t('validation.name.pattern'))
    .min(1, t('validation.name.required')),
  email: z.string()
    .email(t('validation.email.invalid'))
    .min(1, t('validation.email.required')),
  password: z.string()
    .min(8, t('validation.password.minLength'))
    .max(50, t('validation.password.maxLength'))
    .refine(pw => /[a-z]/.test(pw), t('validation.password.lowercase'))
    .refine(pw => /[A-Z]/.test(pw), t('validation.password.uppercase'))
    .refine(pw => /\d/.test(pw), t('validation.password.number'))
    .refine(pw => /[^A-Za-z0-9]/.test(pw), t('validation.password.specialChar')),
  confirmPassword: z.string()
    .min(1, t('validation.password.confirmRequired')),
  phone: z.string()
    .min(1, t('validation.phone.required')),
  address: z.string()
    .min(5, t('validation.address.minLength'))
    .max(500, t('validation.address.maxLength'))
    .min(1, t('validation.address.required')),
  agreeToTerms: z.boolean()
    .refine((val) => val === true, t('validation.terms.required'))
}).refine((data) => data.password === data.confirmPassword, {
  message: t('validation.password.mismatch'),
  path: ['confirmPassword']
});

export type SignupFormData = z.infer<ReturnType<typeof createSignupFormSchema>>;
