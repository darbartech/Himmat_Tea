import { z } from 'zod';

/**
 * Zod validation schema for signup form
 */
export const signupFormSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .min(1, 'Full name is required'),
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  confirmPassword: z.string()
    .min(1, 'Please confirm your password'),
  phone: z.string()
    .min(1, 'Phone number is required'),
  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .max(500, 'Address must be less than 500 characters')
    .min(1, 'Address is required'),
  agreeToTerms: z.boolean()
    .refine((val) => val === true, 'You must agree to the Terms of Service and Privacy Policy')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

/**
 * Type definition for signup form data derived from the Zod schema
 */
export type SignupFormData = z.infer<typeof signupFormSchema>;
