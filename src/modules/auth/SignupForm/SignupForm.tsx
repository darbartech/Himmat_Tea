'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Lock, Mail, MailCheck, MapPin, Phone, User, Eye, EyeOff } from 'lucide-react';
import { signupFormSchema, SignupFormData } from './validation';
import { useAuth } from '@/context/AuthContext';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/app/components/ui/input-otp';

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
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [pendingEmail, setPendingEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [resending, setResending] = useState(false);

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

    if (strength <= 2) return { color: 'bg-red-500', label: 'Weak' };
    if (strength <= 3) return { color: 'bg-yellow-500', label: 'Fair' };
    if (strength <= 4) return { color: 'bg-blue-500', label: 'Good' };
    return { color: 'bg-green-500', label: 'Strong' };
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
        throw new Error(result.error || 'Signup failed');
      }

      setPendingEmail(data.email.trim().toLowerCase());
      setOtp('');
      setResendIn(60);
      setStep('otp');
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : 'Signup failed. Please try again.'
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
        throw new Error(result.error || 'Invalid verification code');
      }

      reset();

      if (onSuccess) {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[AUTH] SignupForm success → delegating redirect to onSuccess callback, redirectTo=${redirectTo}`
          );
        }
        onSuccess();
      } else if (redirectTo && typeof window !== 'undefined') {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[AUTH] SignupForm → self-redirecting to ${redirectTo}`);
        }
        router.replace(redirectTo);
        router.refresh();
      }
    } catch (error) {
      setOtp('');
      setApiError(
        error instanceof Error ? error.message : 'Invalid verification code. Please try again.'
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
        throw new Error(result.error || 'Could not resend the code. Please try again.');
      }
      setOtp('');
      setResendIn(60);
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : 'Could not resend the code. Please try again.'
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
        <div className="rounded-[26px] border border-[#e9e3d9] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2d5a3d]/10">
              <MailCheck className="h-7 w-7 text-[#2d5a3d]" />
            </div>
            <h3 className="text-lg font-semibold text-[#1c1917]">Verify your email</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#6d6a63]">
              We sent a 6-digit code to <span className="font-semibold text-[#1c1917]">{pendingEmail}</span>.
              Enter it below to complete your registration.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(otp);
            }}
            className="space-y-5"
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
                    className="h-12 w-11 border-[#e8e9e5] bg-[#fafaf8] text-lg font-semibold text-[#1c1917] transition-all duration-200 first:rounded-xl last:rounded-xl data-[active=true]:border-[#2d5a3d] data-[active=true]:ring-[#2d5a3d]/20 sm:h-14 sm:w-12"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>

            {apiError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700" role="alert" aria-live="polite">
                {apiError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              aria-disabled={isLoading || otp.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2d5a3d] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#2d5a3d]/20 transition-all duration-200 hover:bg-[#234832] hover:shadow-xl hover:shadow-[#2d5a3d]/30 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify & Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="text-center text-sm text-[#6d6a63]">
              {resendIn > 0 ? (
                <span>Resend code in {resendIn}s</span>
              ) : (
                <>
                  Didn&apos;t get it?{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="font-semibold text-[#2d5a3d] transition-opacity hover:underline disabled:opacity-50"
                  >
                    {resending ? 'Sending...' : 'Resend code'}
                  </button>
                </>
              )}
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={goBackToDetails}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6d6a63] transition-colors hover:text-[#1c1917] disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Edit your details
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="rounded-[26px] border border-[#e9e3d9] bg-white p-4 shadow-sm sm:p-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="signup-name" className="block text-sm font-medium text-[#1c1917]">
              Full Name
            </label>
            <div className="group relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a09b] transition-colors group-focus-within:text-[#2d5a3d]" />
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                aria-describedby={errors.name ? 'signup-name-error' : undefined}
                aria-invalid={!!errors.name}
                {...register('name')}
                placeholder="John Doe"
                className={`w-full rounded-2xl border bg-[#fafaf8] py-3 pl-10 pr-4 text-sm text-[#1c1917] transition-all duration-200 placeholder:text-[#9b9a97] focus:outline-none ${
                  errors.name
                    ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                    : 'border-[#e8e9e5] hover:border-[#d4d6cf] focus:border-[#2d5a3d] focus:ring-2 focus:ring-[#2d5a3d]/10'
                }`}
              />
            </div>
            {errors.name && (
              <p id="signup-name-error" className="mt-1 text-sm font-medium text-red-600" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="signup-email" className="block text-sm font-medium text-[#1c1917]">
                Email Address
              </label>
              <div className="group relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a09b] transition-colors group-focus-within:text-[#2d5a3d]" />
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  aria-describedby={errors.email ? 'signup-email-error' : undefined}
                  aria-invalid={!!errors.email}
                  {...register('email')}
                  placeholder="john@example.com"
                  className={`w-full rounded-2xl border bg-[#fafaf8] py-3 pl-10 pr-4 text-sm text-[#1c1917] transition-all duration-200 placeholder:text-[#9b9a97] focus:outline-none ${
                    errors.email
                      ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                      : 'border-[#e8e9e5] hover:border-[#d4d6cf] focus:border-[#2d5a3d] focus:ring-2 focus:ring-[#2d5a3d]/10'
                  }`}
                />
              </div>
              {errors.email && (
                <p id="signup-email-error" className="mt-1 text-sm font-medium text-red-600" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="signup-phone" className="block text-sm font-medium text-[#1c1917]">
                Phone Number
              </label>
              <div className="group relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a09b] transition-colors group-focus-within:text-[#2d5a3d]" />
                <input
                  id="signup-phone"
                  type="tel"
                  autoComplete="tel"
                  aria-describedby={errors.phone ? 'signup-phone-error' : undefined}
                  aria-invalid={!!errors.phone}
                  {...register('phone')}
                  placeholder="+977 98XXXXXXXX"
                  className={`w-full rounded-2xl border bg-[#fafaf8] py-3 pl-10 pr-4 text-sm text-[#1c1917] transition-all duration-200 placeholder:text-[#9b9a97] focus:outline-none ${
                    errors.phone
                      ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                      : 'border-[#e8e9e5] hover:border-[#d4d6cf] focus:border-[#2d5a3d] focus:ring-2 focus:ring-[#2d5a3d]/10'
                  }`}
                />
              </div>
              {errors.phone && (
                <p id="signup-phone-error" className="mt-1 text-sm font-medium text-red-600" role="alert">
                  {errors.phone.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="signup-password" className="block text-sm font-medium text-[#1c1917]">
              Password
            </label>
            <div className="group relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a09b] transition-colors group-focus-within:text-[#2d5a3d]" />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-describedby={errors.password ? 'signup-password-error signup-password-strength' : 'signup-password-strength'}
                aria-invalid={!!errors.password}
                {...register('password')}
                placeholder="Create a password"
                className={`w-full rounded-2xl border bg-[#fafaf8] py-3 pl-10 pr-11 text-sm text-[#1c1917] transition-all duration-200 placeholder:text-[#9b9a97] focus:outline-none ${
                  errors.password
                    ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                    : 'border-[#e8e9e5] hover:border-[#d4d6cf] focus:border-[#2d5a3d] focus:ring-2 focus:ring-[#2d5a3d]/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a09b] transition-colors hover:text-[#2d5a3d] focus:outline-none focus:text-[#2d5a3d]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
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

          <div className="space-y-1.5">
            <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-[#1c1917]">
              Confirm Password
            </label>
            <div className="group relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a09b] transition-colors group-focus-within:text-[#2d5a3d]" />
              <input
                id="signup-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-describedby={errors.confirmPassword ? 'signup-confirm-password-error' : undefined}
                aria-invalid={!!errors.confirmPassword}
                {...register('confirmPassword')}
                placeholder="Confirm your password"
                className={`w-full rounded-2xl border bg-[#fafaf8] py-3 pl-10 pr-11 text-sm text-[#1c1917] transition-all duration-200 placeholder:text-[#9b9a97] focus:outline-none ${
                  errors.confirmPassword
                    ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                    : 'border-[#e8e9e5] hover:border-[#d4d6cf] focus:border-[#2d5a3d] focus:ring-2 focus:ring-[#2d5a3d]/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a09b] transition-colors hover:text-[#2d5a3d] focus:outline-none focus:text-[#2d5a3d]"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p id="signup-confirm-password-error" className="mt-1 text-sm font-medium text-red-600" role="alert">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="signup-address" className="block text-sm font-medium text-[#1c1917]">
              Address
            </label>
            <div className="group relative">
              <MapPin className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-[#a1a09b] transition-colors group-focus-within:text-[#2d5a3d]" />
              <textarea
                id="signup-address"
                autoComplete="street-address"
                aria-describedby={errors.address ? 'signup-address-error' : undefined}
                aria-invalid={!!errors.address}
                {...register('address')}
                placeholder="Your delivery address"
                rows={3}
                className={`w-full resize-none rounded-2xl border bg-[#fafaf8] py-3 pl-10 pr-4 text-sm text-[#1c1917] transition-all duration-200 placeholder:text-[#9b9a97] focus:outline-none ${
                  errors.address
                    ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                    : 'border-[#e8e9e5] hover:border-[#d4d6cf] focus:border-[#2d5a3d] focus:ring-2 focus:ring-[#2d5a3d]/10'
                }`}
              />
            </div>
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
                I agree to the{' '}
                <Link href="/terms" className="font-semibold text-[#2d5a3d] hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy-policy" className="font-semibold text-[#2d5a3d] hover:underline">
                  Privacy Policy
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
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700" role="alert" aria-live="polite">
              {apiError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            aria-disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2d5a3d] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#2d5a3d]/20 transition-all duration-200 hover:bg-[#234832] hover:shadow-xl hover:shadow-[#2d5a3d]/30 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.99]"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Sending Verification Code...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignupForm;
