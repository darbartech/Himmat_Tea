'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/app/components/ui/input-otp';
import { useTranslation } from '@/hooks/useTranslation';

interface VerifyResetFormProps {
  email: string;
  className?: string;
}

export const VerifyResetForm: React.FC<VerifyResetFormProps> = ({
  email,
  className = ''
}) => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [resending, setResending] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const handleVerify = async (code: string) => {
    if (code.length !== 6 || isLoading) return;

    setIsLoading(true);
    setApiError(null);

    try {
      const response = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || t('auth.verifyReset.genericError'));
      }

      router.push('/reset-password');
    } catch (error) {
      setOtp('');
      setApiError(
        error instanceof Error
          ? error.message
          : t('auth.verifyReset.genericError')
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
      const response = await fetch('/api/auth/resend-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || t('auth.verifyReset.resendError'));
      }

      setOtp('');
      setResendIn(60);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : t('auth.verifyReset.resendError')
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
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
              {t('auth.verifyReset.submitting')}
            </>
          ) : (
            t('auth.verifyReset.submit')
          )}
        </button>

        <div className="text-center text-sm text-[#6d6a63]">
          {resendIn > 0 ? (
            <>{t('auth.verifyReset.resendIn', { seconds: resendIn })}</>
          ) : (
            <>
              {t('auth.verifyReset.didntGetIt')}{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-[#2d5a3d] font-semibold hover:underline disabled:opacity-50"
              >
                {resending ? t('auth.verifyReset.sending') : t('auth.verifyReset.resendCode')}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default VerifyResetForm;
