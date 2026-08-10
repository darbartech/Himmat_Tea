import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required')
});

export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
