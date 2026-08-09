import { z } from 'zod';

/**
 * Zod validation schema for login form
 */
export const loginFormSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  password: z.string()
    .min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
});

/**
 * Type definition for login form data derived from the Zod schema
 */
export type LoginFormData = z.infer<typeof loginFormSchema>;
