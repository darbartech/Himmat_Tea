'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { loginFormSchema, LoginFormData } from './validation';
import { useAuth } from '@/context/AuthContext';

/**
 * Props for the LoginForm component
 */
interface LoginFormProps {
  /** Callback function called when login is successful */
  onSuccess?: () => void;
  /** Optional redirect URL after successful login */
  redirectTo?: string;
  /** Whether to show the "Forgot Password" link */
  showForgotPassword?: boolean;
  /** Custom class name for the form container */
  className?: string;
}

/**
 * Reusable LoginForm component with validation, loading states, and accessibility support
 * 
 * @example
 * ```tsx
 * <LoginForm 
 *   onSuccess={() => router.push('/dashboard')}
 *   redirectTo="/dashboard"
 * />
 * ```
 */
export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  redirectTo,
  showForgotPassword = true,
  className = ''
}) => {
  const router = useRouter();
  const { customerLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  });

  /**
   * Handles form submission
   * @param data - The validated form data
   */
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setApiError(null);

    try {
      const success = await customerLogin(data.email, data.password);

      if (!success) {
        throw new Error('Invalid credentials');
      }

      reset();

      if (onSuccess) {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[AUTH] LoginForm success → delegating redirect to onSuccess callback, redirectTo=${redirectTo}`
          );
        }
        onSuccess();
      } else if (redirectTo && typeof window !== 'undefined') {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[AUTH] LoginForm → self-redirecting to ${redirectTo}`);
        }
        router.replace(redirectTo);
        router.refresh();
      }

    } catch (error) {
      setApiError(
        error instanceof Error 
          ? error.message 
          : 'Login failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Email Field */}
        <div>
          <label 
            htmlFor="login-email" 
            className="block text-sm font-medium text-[#1c1917] mb-1.5"
          >
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e] aria-hidden" />
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              aria-invalid={!!errors.email}
              {...register('email')}
              placeholder="your@email.com"
              className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-colors text-sm focus:outline-none
                ${errors.email 
                  ? 'border-red-300 bg-red-50 focus:border-red-500' 
                  : 'border-[rgba(28,25,23,0.12)] bg-[#f9f7f4] focus:border-[#2d5a3d]'
                }
              `}
            />
          </div>
          {errors.email && (
            <p 
              id="login-email-error"
              className="mt-1.5 text-sm text-red-600"
              role="alert"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label 
              htmlFor="login-password" 
              className="block text-sm font-medium text-[#1c1917]"
            >
              Password
            </label>
            {showForgotPassword && (
              <Link 
                href="/forgot-password"
                className="text-xs text-[#2d5a3d] font-medium hover:underline"
              >
                Forgot Password?
              </Link>
            )}
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e] aria-hidden" />
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              aria-invalid={!!errors.password}
              {...register('password')}
              placeholder="Enter your password"
              className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-colors text-sm focus:outline-none
                ${errors.password 
                  ? 'border-red-300 bg-red-50 focus:border-red-500' 
                  : 'border-[rgba(28,25,23,0.12)] bg-[#f9f7f4] focus:border-[#2d5a3d]'
                }
              `}
            />
          </div>
          {errors.password && (
            <p 
              id="login-password-error"
              className="mt-1.5 text-sm text-red-600"
              role="alert"
            >
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center">
          <input
            id="login-remember-me"
            type="checkbox"
            {...register('rememberMe')}
            className="w-4 h-4 text-[#2d5a3d] border-gray-300 rounded focus:ring-[#2d5a3d]"
          />
          <label 
            htmlFor="login-remember-me"
            className="ml-2 text-sm text-[#78746e]"
          >
            Remember Me
          </label>
        </div>

        {/* API Error Message */}
        {apiError && (
          <div 
            className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
            role="alert"
            aria-live="polite"
          >
            {apiError}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          aria-disabled={isLoading}
          className="w-full py-4 bg-[#2d5a3d] text-white font-semibold rounded-xl hover:bg-[#234832] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
              Signing In...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
