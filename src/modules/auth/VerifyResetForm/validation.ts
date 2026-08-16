import { z } from 'zod';

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

export const createVerifyOtpSchema = (t: TFunc) => z.object({
  otp: z.string().length(6, "Enter the 6-digit code from your email")
});

export type VerifyOtpData = z.infer<ReturnType<typeof createVerifyOtpSchema>>;
