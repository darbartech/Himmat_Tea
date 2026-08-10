'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock } from 'lucide-react';
import { resetPasswordSchema, ResetPasswordData } from './validation';
import { RESET_TOKEN_STORAGE_KEY } from '../VerifyResetForm/VerifyResetForm';

interface ResetPasswordFormProps {
  className?: string;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' }
  });

  const password = watch('newPassword');

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { color: 'bg-gray-200', label: '' };

    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[@$!%*?&]/.test(pwd)) strength++;

    if (strength <= 2) return { color: 'bg-red-500', label: 'Weak' };
    if (strength <= 3) return { color: 'bg-yellow-500', label: 'Fair' };
    if (strength <= 4) return { color: 'bg-blue-500', label: 'Good' };
    return { color: 'bg-green-500', label: 'Strong' };
  };

  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: ResetPasswordData) => {
    setIsLoading(true);
    setApiError(null);

    let resetToken = '';
    try {
      resetToken = sessionStorage.getItem(RESET_TOKEN_STORAGE_KEY) || '';
    } catch {
      resetToken = '';
    }

    if (!resetToken) {
      setApiError('Your reset session has expired. Please start over.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword: data.newPassword })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Could not reset your password. Please try again.');
      }

      try {
        sessionStorage.removeItem(RESET_TOKEN_STORAGE_KEY);
      } catch {
        // noop
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/customer-auth?redirect=/account');
      }, 1800);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : 'Could not reset your password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let hasToken = false;
    try {
      hasToken = Boolean(sessionStorage.getItem(RESET_TOKEN_STORAGE_KEY));
    } catch {
      hasToken = false;
    }
    if (!hasToken) {
      router.replace('/forgot-password');
    }
  }, [router]);

  if (success) {
    return (
      <div className={`w-full ${className}`}>
        <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-green-600 text-2xl">✓</span>
          </div>
          <p className="text-green-800 font-semibold">Password updated</p>
          <p className="mt-1 text-sm text-green-700">
            Your password has been reset. Redirecting you to sign in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <label
            htmlFor="reset-password"
            className="block text-sm font-medium text-[#1c1917] mb-1.5"
          >
            New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e] aria-hidden" />
            <input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              aria-describedby={errors.newPassword ? 'reset-password-error reset-password-strength' : 'reset-password-strength'}
              aria-invalid={!!errors.newPassword}
              {...register('newPassword')}
              placeholder="Create a new password"
              className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-colors text-sm focus:outline-none
                ${errors.newPassword
                  ? 'border-red-300 bg-red-50 focus:border-red-500'
                  : 'border-[rgba(28,25,23,0.12)] bg-[#f9f7f4] focus:border-[#2d5a3d]'
                }
              `}
            />
          </div>
          {password && (
            <div id="reset-password-strength" className="mt-2">
              <div className="flex items-center gap-2">
                <div className={`h-1 flex-1 rounded-full ${passwordStrength.color}`}></div>
                <span className="text-xs text-[#78746e]">{passwordStrength.label}</span>
              </div>
            </div>
          )}
          {errors.newPassword && (
            <p
              id="reset-password-error"
              className="mt-1.5 text-sm text-red-600"
              role="alert"
            >
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="reset-confirm-password"
            className="block text-sm font-medium text-[#1c1917] mb-1.5"
          >
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e] aria-hidden" />
            <input
              id="reset-confirm-password"
              type="password"
              autoComplete="new-password"
              aria-describedby={errors.confirmPassword ? 'reset-confirm-password-error' : undefined}
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
              placeholder="Confirm your new password"
              className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-colors text-sm focus:outline-none
                ${errors.confirmPassword
                  ? 'border-red-300 bg-red-50 focus:border-red-500'
                  : 'border-[rgba(28,25,23,0.12)] bg-[#f9f7f4] focus:border-[#2d5a3d]'
                }
              `}
            />
          </div>
          {errors.confirmPassword && (
            <p
              id="reset-confirm-password-error"
              className="mt-1.5 text-sm text-red-600"
              role="alert"
            >
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {apiError && (
          <div
            className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
            role="alert"
            aria-live="polite"
          >
            {apiError}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          aria-disabled={isLoading}
          className="w-full py-4 bg-[#2d5a3d] text-white font-semibold rounded-xl hover:bg-[#234832] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
              Resetting...
            </>
          ) : (
            <>
              Reset Password
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordForm;
