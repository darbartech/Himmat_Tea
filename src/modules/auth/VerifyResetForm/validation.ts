import { z } from 'zod';

export const verifyOtpSchema = z.object({
  otp: z.string().length(6, 'Enter the 6-digit code from your email')
});

export type VerifyOtpData = z.infer<typeof verifyOtpSchema>;
