'use client';

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { createLoginFormSchema, LoginFormData } from './validation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
  showForgotPassword?: boolean;
  className?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  redirectTo,
  showForgotPassword = true,
  className = ''
}) => {
  const router = useRouter();
  const { customerLogin } = useAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const loginFormSchema = useMemo(() => createLoginFormSchema(t), [t]);

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

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setApiError(null);

    try {
      const result = await customerLogin(data.email, data.password);

      if (!result.success) {
        throw new Error(result.error || t('auth.login.invalidCredentials'));
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
          : t('auth.login.genericError')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <label 
            htmlFor="login-email" 
            className="block text-sm font-medium text-[#1c1917]"
          >
            {t('auth.login.emailLabel')}
          </label>
          <div className="relative group">
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              aria-invalid={!!errors.email}
              {...register('email')}
              placeholder={t('auth.login.emailPlaceholder')}
              className={`w-full px-5 py-4 rounded-2xl border text-[15px] transition-all duration-200 focus:outline-none
                ${errors.email 
                  ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                  : 'border-[#e8e9e5] bg-[#fafaf8] hover:border-[#d4d6cf] focus:border-[#2d5a3d] focus:ring-4 focus:ring-[#2d5a3d]/10'
                }
              `}
            />
          </div>
          {errors.email && (
            <p 
              id="login-email-error"
              className="mt-1 text-sm text-red-600 font-medium"
              role="alert"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label 
            htmlFor="login-password" 
            className="block text-sm font-medium text-[#1c1917]"
          >
            {t('auth.login.passwordLabel')}
          </label>
          <div className="relative group">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              aria-invalid={!!errors.password}
              {...register('password')}
              placeholder={t('auth.login.passwordPlaceholder')}
              className={`w-full px-5 py-4 pr-12 rounded-2xl border text-[15px] transition-all duration-200 focus:outline-none
                ${errors.password 
                  ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                  : 'border-[#e8e9e5] bg-[#fafaf8] hover:border-[#d4d6cf] focus:border-[#2d5a3d] focus:ring-4 focus:ring-[#2d5a3d]/10'
                }
              `}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#78746e] hover:text-[#2d5a3d] transition-colors focus:outline-none focus:text-[#2d5a3d] p-1"
              aria-label={showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" aria-hidden />
              ) : (
                <Eye className="h-5 w-5" aria-hidden />
              )}
            </button>
          </div>
          {errors.password && (
            <p 
              id="login-password-error"
              className="mt-1 text-sm text-red-600 font-medium"
              role="alert"
            >
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              id="login-remember-me"
              type="checkbox"
              {...register('rememberMe')}
              className="h-4 w-4 rounded border-[#d4d6cf] text-[#2d5a3d] focus:ring-[#2d5a3d] focus:ring-offset-0 cursor-pointer"
            />
            <label 
              htmlFor="login-remember-me"
              className="text-sm text-[#6d6a63] cursor-pointer select-none"
            >
              {t('auth.login.rememberMe')}
            </label>
          </div>
          {showForgotPassword && (
            <Link 
              href="/forgot-password"
              className="text-sm font-semibold text-[#1c1917] hover:text-[#2d5a3d] transition-colors"
            >
              {t('auth.login.forgotPassword')}
            </Link>
          )}
        </div>

        {apiError && (
          <div 
            className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-700 text-sm font-medium"
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
          className="w-full py-4 mt-2 bg-[#2d5a3d] text-white font-semibold rounded-2xl hover:bg-[#234832] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 shadow-lg shadow-[#2d5a3d]/20 hover:shadow-xl hover:shadow-[#2d5a3d]/30 text-[15px]"
        >
          {isLoading ? (
            <>
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
              <span>{t('auth.login.submitting')}</span>
            </>
          ) : (
            <span>{t('auth.login.submit')}</span>
          )}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
