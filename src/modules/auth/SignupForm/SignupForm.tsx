'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MailCheck, Eye, EyeOff } from 'lucide-react';
import { createSignupFormSchema, SignupFormData } from './validation';
import { useAuth } from '@/context/AuthContext';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/app/components/ui/input-otp';
import { useTranslation } from '@/hooks/useTranslation';
import { notify } from '@/lib/notify';
import { LoadingButton } from '@/app/components/ui/loading-button';

interface SignupFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
  className?: string;
}

export const SignupForm: React.FC<SignupFormProps> = ({
  onSuccess,
  redirectTo,
  className = ''
}) => {
  const router = useRouter();
  const { initiateCustomerSignup, verifyCustomerSignup, resendSignupOtp } = useAuth();
  const { t } = useTranslation();
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [pendingEmail, setPendingEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [resending, setResending] = useState(false);

  const signupFormSchema = useMemo(() => createSignupFormSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      address: '',
      agreeToTerms: false
    }
  });

  const password = watch('password');

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { color: 'bg-gray-200', label: '' };

    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[@$!%*?&]/.test(pwd)) strength++;

    if (strength <= 2) return { color: 'bg-red-500', label: t('auth.signup.strengthWeak') };
    if (strength <= 3) return { color: 'bg-yellow-500', label: t('auth.signup.strengthFair') };
    if (strength <= 4) return { color: 'bg-blue-500', label: t('auth.signup.strengthGood') };
    return { color: 'bg-green-500', label: t('auth.signup.strengthStrong') };
  };

  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setApiError(null);

    try {
      const result = await initiateCustomerSignup(
        data.name,
        data.email,
        data.phone,
        data.password,
        data.address
      );

      if (!result.success) {
        throw new Error(result.error || t('auth.signup.genericError'));
      }

      setPendingEmail(data.email.trim().toLowerCase());
      setOtp('');
      setResendIn(60);
      setStep('otp');
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : t('auth.signup.genericError')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (code: string) => {
    if (code.length !== 6 || isLoading) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const result = await verifyCustomerSignup(pendingEmail, code);

      if (!result.success) {
        throw new Error(result.error || t('auth.signup.otpInvalidCode'));
      }

      reset();

      if (onSuccess) {
        onSuccess();
      } else if (redirectTo && typeof window !== 'undefined') {
        router.replace(redirectTo);
        router.refresh();
      }
    } catch (error) {
      setOtp('');
      setApiError(
        error instanceof Error ? error.message : t('auth.signup.otpInvalidCodeRetry')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || resending) return;

    setResending(true);
    setApiError(null);

    try {
      const result = await resendSignupOtp(pendingEmail);
      if (!result.success) {
        throw new Error(result.error || t('auth.signup.otpResendError'));
      }
      setOtp('');
      setResendIn(60);
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : t('auth.signup.otpResendError')
      );
    } finally {
      setResending(false);
    }
  };

  const goBackToDetails = () => {
    setStep('details');
    setOtp('');
    setApiError(null);
  };

  if (step === 'otp') {
    return (
      <div className={`w-full ${className}`}>
        <div className="text-center mb-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#2d5a3d]/10">
            <MailCheck className="h-10 w-10 text-[#2d5a3d]" />
          </div>
          <h3 className="text-2xl font-semibold text-[#1c1917] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            {t('auth.signup.otpTitle')}
          </h3>
          <p className="mx-auto max-w-sm text-[15px] leading-7 text-[#6d6a63]">
            {t('auth.signup.otpSubtitlePrefix')} <span className="font-semibold text-[#1c1917]">{pendingEmail}</span>.
            {t('auth.signup.otpSubtitleSuffix')}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify(otp);
          }}
          className="space-y-6"
          noValidate
        >
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={(value) => {
              setOtp(value);
              setApiError(null);
            }}
            onComplete={handleVerify}
            disabled={isLoading}
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className="h-14 w-12 sm:h-16 sm:w-14 rounded-2xl border-[#e8e9e5] bg-[#fafaf8] text-xl font-semibold text-[#1c1917] transition-all duration-200 first:rounded-2xl last:rounded-2xl data-[active=true]:border-[#2d5a3d] data-[active=true]:ring-4 data-[active=true]:ring-[#2d5a3d]/15 mx-1"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>

          {apiError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700" role="alert" aria-live="polite">
              {apiError}
            </div>
          )}

          <LoadingButton
            type="submit"
            isLoading={isLoading}
            loadingLabel={<span>{t('auth.signup.otpVerifying')}</span>}
            disabled={otp.length !== 6}
            aria-disabled={isLoading || otp.length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2d5a3d] px-5 py-4 text-[15px] font-semibold text-white shadow-lg shadow-[#2d5a3d]/20 transition-all duration-200 hover:bg-[#234832] hover:shadow-xl hover:shadow-[#2d5a3d]/30 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
          >
            <span>{t('auth.signup.otpVerifyButton')}</span>
            <ArrowRight className="h-5 w-5" />
          </LoadingButton>

          <div className="text-center text-sm text-[#6d6a63]">
            {resendIn > 0 ? (
              <span>{t('auth.signup.otpResendIn', { seconds: resendIn })}</span>
            ) : (
              <>
                {t('auth.signup.otpDidntGetIt')}{' '}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="font-semibold text-[#2d5a3d] transition-opacity hover:underline disabled:opacity-50"
                >
                  {resending ? t('auth.signup.otpSending') : t('auth.signup.otpResendCode')}
                </button>
              </>
            )}
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={goBackToDetails}
              disabled={isLoading}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#6d6a63] transition-colors hover:text-[#1c1917] disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('auth.signup.otpEditDetails')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <label htmlFor="signup-name" className="block text-sm font-medium text-[#1c1917]">
            {t('auth.signup.fullNameLabel')}
          </label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            aria-describedby={errors.name ? 'signup-name-error' : undefined}
            aria-invalid={!!errors.name}
            {...register('name')}
            placeholder={t('auth.signup.fullNamePlaceholder')}
            className={`w-full rounded-2xl border bg-[#fafaf8] py-4 px-5 text-[15px] text-[#1c1917] transition-all duration-200 placeholder:text-[#b0aba4] focus:outline-none ${
              errors.name
                ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                : 'border-[#e8e9e5] hover:border-[#d4d6cf] focus:border-[#2d5a3d] focus:ring-4 focus:ring-[#2d5a3d]/10'
            }`}
          />
          {errors.name && (
            <p id="signup-name-error" className="mt-1 text-sm font-medium text-red-600" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="signup-email" className="block text-sm font-medium text-[#1c1917]">
              {t('auth.signup.emailLabel')}
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              aria-describedby={errors.email ? 'signup-email-error' : undefined}
              aria-invalid={!!errors.email}
              {...register('email')}
              placeholder={t('auth.signup.emailPlaceholder')}
              className={`w-full rounded-2xl border bg-[#fafaf8] py-4 px-5 text-[15px] text-[#1c1917] transition-all duration-200 placeholder:text-[#b0aba4] focus:outline-none ${
                errors.email
                  ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                  : 'border-[#e8e9e5] hover:border-[#d4d6cf] focus:border-[#2d5a3d] focus:ring-4 focus:ring-[#2d5a3d]/10'
              }`}
            />
            {errors.email && (
              <p id="signup-email-error" className="mt-1 text-sm font-medium text-red-600" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="signup-phone" className="block text-sm font-medium text-[#1c1917]">
              {t('auth.signup.phoneLabel')}
            </label>
            <input
              id="signup-phone"
              type="tel"
              autoComplete="tel"
              aria-describedby={errors.phone ? 'signup-phone-error' : undefined}
              aria-invalid={!!errors.phone}
              {...register('phone')}
              placeholder={t('auth.signup.phonePlaceholder')}
              className={`w-full rounded-2xl border bg-[#fafaf8] py-4 px-5 text-[15px] text-[#1c1917] transition-all duration-200 placeholder:text-[#b0aba4] focus:outline-none ${
                errors.phone
                  ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                  : 'border-[#e8e9e5] hover:border-[#d4d6cf] focus:border-[#2d5a3d] focus:ring-4 focus:ring-[#2d5a3d]/10'
              }`}
            />
            {errors.phone && (
              <p id="signup-phone-error" className="mt-1 text-sm font-medium text-red-600" role="alert">
                {errors.phone.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="signup-password" className="block text-sm font-medium text-[#1c1917]">
            {t('auth.signup.passwordLabel')}
          </label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-describedby={errors.password ? 'signup-password-error signup-password-strength' : 'signup-password-strength'}
              aria-invalid={!!errors.password}
              {...register('password')}
              placeholder={t('auth.signup.passwordPlaceholder')}
              className={`w-full rounded-2xl border bg-[#fafaf8] py-4 px-5 pr-12 text-[15px] text-[#1c1917] transition-all duration-200 placeholder:text-[#b0aba4] focus:outline-none ${
                errors.password
                  ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                  : 'border-[#e8e9e5] hover:border-[#d4d6cf] focus:border-[#2d5a3d] focus:ring-4 focus:ring-[#2d5a3d]/10'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#78746e] transition-colors hover:text-[#2d5a3d] focus:outline-none focus:text-[#2d5a3d] p-1"
              aria-label={showPassword ? t('auth.signup.hidePassword') : t('auth.signup.showPassword')}
            >
              {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
            </button>
          </div>

          {password && (
            <div id="signup-password-strength" className="mt-2">
              <div className="flex items-center gap-2">
                <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${passwordStrength.color}`} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#78746e]">
                  {passwordStrength.label}
                </span>
              </div>
            </div>
          )}

          {errors.password && (
            <p id="signup-password-error" className="mt-1 text-sm font-medium text-red-600" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-[#1c1917]">
            {t('auth.signup.confirmPasswordLabel')}
          </label>
          <div className="relative">
            <input
              id="signup-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-describedby={errors.confirmPassword ? 'signup-confirm-password-error' : undefined}
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
              placeholder={t('auth.signup.confirmPasswordPlaceholder')}
              className={`w-full rounded-2xl border bg-[#fafaf8] py-4 px-5 pr-12 text-[15px] text-[#1c1917] transition-all duration-200 placeholder:text-[#b0aba4] focus:outline-none ${
                errors.confirmPassword
                  ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                  : 'border-[#e8e9e5] hover:border-[#d4d6cf] focus:border-[#2d5a3d] focus:ring-4 focus:ring-[#2d5a3d]/10'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#78746e] transition-colors hover:text-[#2d5a3d] focus:outline-none focus:text-[#2d5a3d] p-1"
              aria-label={showConfirmPassword ? t('auth.signup.hideConfirmPassword') : t('auth.signup.showConfirmPassword')}
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p id="signup-confirm-password-error" className="mt-1 text-sm font-medium text-red-600" role="alert">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="signup-address" className="block text-sm font-medium text-[#1c1917]">
            {t('auth.signup.addressLabel')}
          </label>
          <textarea
            id="signup-address"
            autoComplete="street-address"
            aria-describedby={errors.address ? 'signup-address-error' : undefined}
            aria-invalid={!!errors.address}
            {...register('address')}
            placeholder={t('auth.signup.addressPlaceholder')}
            rows={3}
            className={`w-full resize-none rounded-2xl border bg-[#fafaf8] py-4 px-5 text-[15px] text-[#1c1917] transition-all duration-200 placeholder:text-[#b0aba4] focus:outline-none ${
              errors.address
                ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                : 'border-[#e8e9e5] hover:border-[#d4d6cf] focus:border-[#2d5a3d] focus:ring-4 focus:ring-[#2d5a3d]/10'
            }`}
          />
          {errors.address && (
            <p id="signup-address-error" className="mt-1 text-sm font-medium text-red-600" role="alert">
              {errors.address.message}
            </p>
          )}
        </div>

        <div className="flex items-start gap-2">
          <div className="flex h-5 items-center pt-0.5">
            <input
              id="signup-agree-terms"
              type="checkbox"
              aria-describedby="signup-terms-error"
              aria-invalid={!!errors.agreeToTerms}
              {...register('agreeToTerms')}
              className="h-4 w-4 cursor-pointer rounded border-[#d4d6cf] text-[#2d5a3d] focus:ring-[#2d5a3d] focus:ring-offset-0"
            />
          </div>
          <div className="text-sm">
            <label htmlFor="signup-agree-terms" className="cursor-pointer select-none text-[#6d6a63]">
              {t('auth.signup.agreeToTermsPrefix')}{' '}
              <Link href="/terms" className="font-semibold text-[#2d5a3d] hover:underline">
                {t('auth.signup.termsOfService')}
              </Link>{' '}
              {t('auth.signup.and')}{' '}
              <Link href="/privacy-policy" className="font-semibold text-[#2d5a3d] hover:underline">
                {t('auth.signup.privacyPolicy')}
              </Link>
            </label>
            {errors.agreeToTerms && (
              <p id="signup-terms-error" className="mt-1 text-sm font-medium text-red-600" role="alert">
                {errors.agreeToTerms.message}
              </p>
            )}
          </div>
        </div>

        {apiError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700" role="alert" aria-live="polite">
            {apiError}
          </div>
        )}

        <LoadingButton
          type="submit"
          isLoading={isLoading}
          loadingLabel={<span>{t('auth.signup.submitting')}</span>}
          aria-disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2d5a3d] px-5 py-4 text-[15px] font-semibold text-white shadow-lg shadow-[#2d5a3d]/20 transition-all duration-200 hover:bg-[#234832] hover:shadow-xl hover:shadow-[#2d5a3d]/30 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
        >
          <span>{t('auth.signup.submit')}</span>
          <ArrowRight className="h-5 w-5" />
        </LoadingButton>
      </form>
    </div>
  );
};

export default SignupForm;
