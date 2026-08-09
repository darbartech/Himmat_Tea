/**
 * Unit tests for the LoginForm component
 * TODO: Add test runner and testing library to run these tests
 */

import React from 'react';
import { loginFormSchema, type LoginFormData } from './validation';

describe('LoginForm Validation', () => {
  describe('loginFormSchema', () => {
    it('should validate a correct login form', () => {
      const validData: LoginFormData = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true
      };
      
      const result = loginFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      const invalidEmail = {
        email: 'invalid-email',
        password: 'password123'
      };
      
      const result = loginFormSchema.safeParse(invalidEmail);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path[0]).toBe('email');
      }
    });

    it('should reject missing email', () => {
      const missingEmail = {
        password: 'password123'
      };
      
      const result = loginFormSchema.safeParse(missingEmail);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path[0]).toBe('email');
      }
    });

    it('should reject missing password', () => {
      const missingPassword = {
        email: 'test@example.com'
      };
      
      const result = loginFormSchema.safeParse(missingPassword);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path[0]).toBe('password');
      }
    });

    it('should accept rememberMe as optional', () => {
      const withoutRememberMe = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      const result = loginFormSchema.safeParse(withoutRememberMe);
      expect(result.success).toBe(true);
    });
  });
});
