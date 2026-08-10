import { z } from 'zod';

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
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must be less than 128 characters')
    .refine(pw => /[a-z]/.test(pw), 'Must include a lowercase letter')
    .refine(pw => /[A-Z]/.test(pw), 'Must include an uppercase letter')
    .refine(pw => /\d/.test(pw), 'Must include a number')
    .refine(pw => /[^A-Za-z0-9]/.test(pw), 'Must include a special character'),
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

export type SignupFormData = z.infer<typeof signupFormSchema>;
