'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Lock, Mail, MailCheck, MapPin, Phone, User } from 'lucide-react';
import { signupFormSchema, SignupFormData } from './validation';
import { useAuth } from '@/context/AuthContext';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/app/components/ui/input-otp';

/**
 * Props for the SignupForm component
 */
interface SignupFormProps {
  /** Callback function called when signup is successful */
  onSuccess?: () => void;
  /** Optional redirect URL after successful signup */
  redirectTo?: string;
  /** Custom class name for the form container */
  className?: string;
}

/**
 * Reusable SignupForm component with email verification (OTP), validation,
 * loading states, and accessibility support.
 */
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

  // Watch password to show strength indicator
  const password = watch('password');

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  /**
   * Checks password strength and returns a color and label
   */
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

  /**
   * Step 1: validate details and request an OTP for the given email.
   */
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
        error instanceof Error
          ? error.message
          : 'Signup failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Step 2: verify the OTP and complete the signup.
   */
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
        onSuccess();
      }

      if (redirectTo && typeof window !== 'undefined') {
        router.replace(redirectTo);
        router.refresh();
      }
    } catch (error) {
      setOtp('');
      setApiError(
        error instanceof Error
          ? error.message
          : 'Invalid verification code. Please try again.'
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
        error instanceof Error
          ? error.message
          : 'Could not resend the code. Please try again.'
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
                  className="h-12 w-11 sm:h-14 sm:w-12 text-lg font-semibold text-[#1c1917] border-[rgba(28,25,23,0.15)] bg-[#f9f7f4] data-[active=true]:border-[#2d5a3d] data-[active=true]:ring-[#2d5a3d]/25 first:rounded-l-xl last:rounded-r-xl"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>

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
            disabled={isLoading || otp.length !== 6}
            aria-disabled={isLoading || otp.length !== 6}
            className="w-full py-4 bg-[#2d5a3d] text-white font-semibold rounded-xl hover:bg-[#234832] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                Verifying...
              </>
            ) : (
              <>
                Verify & Create Account
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          <div className="text-center text-sm text-[#6d6a63]">
            {resendIn > 0 ? (
              <>Resend code in {resendIn}s</>
            ) : (
              <>
                Didn&apos;t get it?{' '}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-[#2d5a3d] font-semibold hover:underline disabled:opacity-50"
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
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6d6a63] hover:text-[#1c1917] transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Edit your details
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Full Name Field */}
        <div>
          <label
            htmlFor="signup-name"
            className="block text-sm font-medium text-[#1c1917] mb-1.5"
          >
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e] aria-hidden" />
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              aria-describedby={errors.name ? 'signup-name-error' : undefined}
              aria-invalid={!!errors.name}
              {...register('name')}
              placeholder="John Doe"
              className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-colors text-sm focus:outline-none
                ${errors.name
                  ? 'border-red-300 bg-red-50 focus:border-red-500'
                  : 'border-[rgba(28,25,23,0.12)] bg-[#f9f7f4] focus:border-[#2d5a3d]'
                }
              `}
            />
          </div>
          {errors.name && (
            <p
              id="signup-name-error"
              className="mt-1.5 text-sm text-red-600"
              role="alert"
            >
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email and Phone Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Email Field */}
          <div>
            <label
              htmlFor="signup-email"
              className="block text-sm font-medium text-[#1c1917] mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e] aria-hidden" />
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                aria-describedby={errors.email ? 'signup-email-error' : undefined}
                aria-invalid={!!errors.email}
                {...register('email')}
                placeholder="john@example.com"
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
                id="signup-email-error"
                className="mt-1.5 text-sm text-red-600"
                role="alert"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Phone Field */}
          <div>
            <label
              htmlFor="signup-phone"
              className="block text-sm font-medium text-[#1c1917] mb-1.5"
            >
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e] aria-hidden" />
              <input
                id="signup-phone"
                type="tel"
                autoComplete="tel"
                aria-describedby={errors.phone ? 'signup-phone-error' : undefined}
                aria-invalid={!!errors.phone}
                {...register('phone')}
                placeholder="+977 98XXXXXXXX"
                className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-colors text-sm focus:outline-none
                  ${errors.phone
                    ? 'border-red-300 bg-red-50 focus:border-red-500'
                    : 'border-[rgba(28,25,23,0.12)] bg-[#f9f7f4] focus:border-[#2d5a3d]'
                  }
                `}
              />
            </div>
            {errors.phone && (
              <p
                id="signup-phone-error"
                className="mt-1.5 text-sm text-red-600"
                role="alert"
              >
                {errors.phone.message}
              </p>
            )}
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="signup-password"
            className="block text-sm font-medium text-[#1c1917] mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e] aria-hidden" />
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              aria-describedby={errors.password ? 'signup-password-error signup-password-strength' : 'signup-password-strength'}
              aria-invalid={!!errors.password}
              {...register('password')}
              placeholder="Create a password"
              className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-colors text-sm focus:outline-none
                ${errors.password
                  ? 'border-red-300 bg-red-50 focus:border-red-500'
                  : 'border-[rgba(28,25,23,0.12)] bg-[#f9f7f4] focus:border-[#2d5a3d]'
                }
              `}
            />
          </div>
          {/* Password Strength Indicator */}
          {password && (
            <div id="signup-password-strength" className="mt-2">
              <div className="flex items-center gap-2">
                <div className={`h-1 flex-1 rounded-full ${passwordStrength.color}`}></div>
                <span className="text-xs text-[#78746e]">{passwordStrength.label}</span>
              </div>
            </div>
          )}
          {errors.password && (
            <p
              id="signup-password-error"
              className="mt-1.5 text-sm text-red-600"
              role="alert"
            >
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label
            htmlFor="signup-confirm-password"
            className="block text-sm font-medium text-[#1c1917] mb-1.5"
          >
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e] aria-hidden" />
            <input
              id="signup-confirm-password"
              type="password"
              autoComplete="new-password"
              aria-describedby={errors.confirmPassword ? 'signup-confirm-password-error' : undefined}
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
              placeholder="Confirm your password"
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
              id="signup-confirm-password-error"
              className="mt-1.5 text-sm text-red-600"
              role="alert"
            >
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Address Field */}
        <div>
          <label
            htmlFor="signup-address"
            className="block text-sm font-medium text-[#1c1917] mb-1.5"
          >
            Address
          </label>
          <div className="relative">
            <MapPin className="absolute left-4 top-3 h-4 w-4 text-[#78746e] aria-hidden" />
            <textarea
              id="signup-address"
              autoComplete="street-address"
              aria-describedby={errors.address ? 'signup-address-error' : undefined}
              aria-invalid={!!errors.address}
              {...register('address')}
              placeholder="Your delivery address"
              rows={3}
              className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-colors text-sm focus:outline-none resize-none
                ${errors.address
                  ? 'border-red-300 bg-red-50 focus:border-red-500'
                  : 'border-[rgba(28,25,23,0.12)] bg-[#f9f7f4] focus:border-[#2d5a3d]'
                }
              `}
            />
          </div>
          {errors.address && (
            <p
              id="signup-address-error"
              className="mt-1.5 text-sm text-red-600"
              role="alert"
            >
              {errors.address.message}
            </p>
          )}
        </div>

        {/* Terms of Service Checkbox */}
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="signup-agree-terms"
              type="checkbox"
              aria-describedby="signup-terms-error"
              aria-invalid={!!errors.agreeToTerms}
              {...register('agreeToTerms')}
              className="w-4 h-4 text-[#2d5a3d] border-gray-300 rounded focus:ring-[#2d5a3d]"
            />
          </div>
          <div className="ml-2 text-sm">
            <label
              htmlFor="signup-agree-terms"
              className="text-[#78746e]"
            >
              I agree to the{' '}
              <Link href="/terms" className="text-[#2d5a3d] font-medium hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy-policy" className="text-[#2d5a3d] font-medium hover:underline">
                Privacy Policy
              </Link>
            </label>
            {errors.agreeToTerms && (
              <p
                id="signup-terms-error"
                className="mt-1 text-sm text-red-600"
                role="alert"
              >
                {errors.agreeToTerms.message}
              </p>
            )}
          </div>
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
              Sending Verification Code...
            </>
          ) : (
            <>
              Create Account
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default SignupForm;
