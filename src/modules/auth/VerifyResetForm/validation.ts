import { z } from 'zod';

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

export const createVerifyOtpSchema = (t: TFunc) => z.object({
  otp: z.string().length(6, t('validation.otp.length'))
});

export type VerifyOtpData = z.infer<ReturnType<typeof createVerifyOtpSchema>>;
