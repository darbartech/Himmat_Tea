'use client';

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { ArrowRight, Mail } from 'lucide-react';
import { createForgotPasswordSchema, ForgotPasswordData } from './validation';
import { useTranslation } from '@/hooks/useTranslation';

interface ForgotPasswordFormProps {
  className?: string;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useTranslation();

  const forgotPasswordSchema = useMemo(() => createForgotPasswordSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' }
  });

  const onSubmit = async (data: ForgotPasswordData) => {
    setIsLoading(true);
    setApiError(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || t('auth.forgotPassword.genericError'));
      }

      router.push(`/verify-reset?email=${encodeURIComponent(data.email.trim())}`);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : t('auth.forgotPassword.genericError')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div>
          <label
            htmlFor="forgot-email"
            className="block text-sm font-medium text-[#1c1917] mb-1.5"
          >
            {t('auth.forgotPassword.emailLabel')}
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e] aria-hidden" />
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              aria-describedby={errors.email ? 'forgot-email-error' : undefined}
              aria-invalid={!!errors.email}
              {...register('email')}
              placeholder={t('auth.forgotPassword.emailPlaceholder')}
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
              id="forgot-email-error"
              className="mt-1.5 text-sm text-red-600"
              role="alert"
            >
              {errors.email.message}
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
              {t('auth.forgotPassword.submitting')}
            </>
          ) : (
            <>
              {t('auth.forgotPassword.submit')}
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ForgotPasswordForm;
