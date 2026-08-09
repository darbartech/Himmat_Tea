/**
 * Unit tests for the SignupForm component
 * TODO: Add test runner and testing library to run these tests
 */

import React from 'react';
import { signupFormSchema, type SignupFormData } from './validation';

describe('SignupForm Validation', () => {
  describe('signupFormSchema', () => {
    const validSignupData: SignupFormData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      phone: '+1234567890',
      address: '123 Main St, City, Country',
      agreeToTerms: true
    };

    it('should validate a correct signup form', () => {
      const result = signupFormSchema.safeParse(validSignupData);
      expect(result.success).toBe(true);
    });

    it('should reject when passwords do not match', () => {
      const data = {
        ...validSignupData,
        confirmPassword: 'DifferentPassword123!'
      };
      
      const result = signupFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject weak passwords without uppercase', () => {
      const data = {
        ...validSignupData,
        password: 'password123!',
        confirmPassword: 'password123!'
      };
      
      const result = signupFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject weak passwords without lowercase', () => {
      const data = {
        ...validSignupData,
        password: 'PASSWORD123!',
        confirmPassword: 'PASSWORD123!'
      };
      
      const result = signupFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject weak passwords without numbers', () => {
      const data = {
        ...validSignupData,
        password: 'Password!',
        confirmPassword: 'Password!'
      };
      
      const result = signupFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject weak passwords without special characters', () => {
      const data = {
        ...validSignupData,
        password: 'Password123',
        confirmPassword: 'Password123'
      };
      
      const result = signupFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject too short passwords', () => {
      const data = {
        ...validSignupData,
        password: 'Pass1!',
        confirmPassword: 'Pass1!'
      };
      
      const result = signupFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email addresses', () => {
      const data = {
        ...validSignupData,
        email: 'invalid-email'
      };
      
      const result = signupFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject when terms are not agreed to', () => {
      const data = {
        ...validSignupData,
        agreeToTerms: false
      };
      
      const result = signupFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject too short names', () => {
      const data = {
        ...validSignupData,
        name: 'J'
      };
      
      const result = signupFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject names with invalid characters', () => {
      const data = {
        ...validSignupData,
        name: 'John123 Doe!'
      };
      
      const result = signupFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
