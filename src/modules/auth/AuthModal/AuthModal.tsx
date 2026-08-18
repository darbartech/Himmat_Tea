'use client';

import React, { useState, useEffect, useRef, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X, Github, Chrome } from 'lucide-react';
import { LoginForm } from '../LoginForm';
import { SignupForm } from '../SignupForm';
import { useAuth } from '@/context/AuthContext';

import { useTranslation } from '@/hooks/useTranslation';
import { notify } from '@/lib/notify';
import { LoadingButton } from '@/app/components/ui/loading-button';
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  redirectTo?: string;
}

function getSafeRedirect(value: string | null | undefined): string {
  if (!value) return '/account';
  if (!value.startsWith('/')) return '/account';
  if (value.startsWith('//')) return '/account';
  return value;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  initialMode = 'login',
  redirectTo = '/account'
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [isVisible, setIsVisible] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'github' | null>(null);
  const { socialLogin, isLoggedIn, isLoading, userType } = useAuth();
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const { t } = useTranslation();

  const safeRedirectTo = getSafeRedirect(redirectTo);

  useEffect(() => {
    if (isOpen) {
      startTransition(() => setMode(initialMode));
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      startTransition(() => setIsVisible(false));
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (isLoading) return;
    if (isLoggedIn && isOpen) {
      const dest = userType === 'admin' ? '/himmat_admin_8526/dashboard' : safeRedirectTo;
      onClose();
      router.replace(dest);
      router.refresh();
    }
  }, [isLoggedIn, isLoading, isOpen, onClose, router, safeRedirectTo, userType]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isVisible && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [isVisible]);

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setSocialLoading(provider);
    try {
      const success = await socialLogin(provider);
      if (success) {
        onClose();
        router.replace(safeRedirectTo);
        router.refresh();
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAuthSuccess = () => {
    onClose();
    router.replace(safeRedirectTo);
    router.refresh();
  };

  if (!isOpen && !isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[100] transition-all duration-300 ${
          isVisible 
            ? 'bg-[#1c1917]/60 backdrop-blur-sm opacity-100' 
            : 'bg-transparent opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div 
        className="fixed inset-0 z-[101] flex items-center justify-center px-4 sm:px-6 py-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div
          ref={modalRef}
          className={`w-full max-w-md bg-white rounded-3xl shadow-2xl transition-all duration-300 ease-out ${
            isVisible 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-95 translate-y-4'
          }`}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-7 py-5">
            <h2 
              id="auth-modal-title" 
              className="text-xl font-semibold text-[#1c1917]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </h2>
            <button
              ref={firstFocusableRef}
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#f9f7f4] border border-[#e8e9e5] hover:bg-[#f0ede8] hover:border-[#d4d6cf] transition-all"
              aria-label={t('a11y.close')}
            >
              <X className="h-4 w-4 text-[#1c1917]" />
            </button>
          </div>

          {/* Modal body */}
          <div className="px-7 pb-7">
            {/* Social login buttons */}
            <div className="space-y-2.5 mb-5">
              <LoadingButton
                onClick={() => handleSocialLogin('google')}
                isLoading={socialLoading === 'google'}
                disabled={!!socialLoading}
                spinnerClassName="border-[#1c1917] border-t-transparent"
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-[#e8e9e5] rounded-xl hover:bg-[#fafaf8] hover:border-[#d4d6cf] transition-all duration-200 text-sm font-medium text-[#1c1917] disabled:opacity-50 active:scale-[0.98]"
              >
                {socialLoading !== 'google' && <Chrome className="h-5 w-5 text-red-500" />}
                Continue with Google
              </LoadingButton>

              <LoadingButton
                onClick={() => handleSocialLogin('github')}
                isLoading={socialLoading === 'github'}
                disabled={!!socialLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-[#1c1917] text-white border border-[#1c1917] rounded-xl hover:bg-[#111] transition-all duration-200 text-sm font-medium disabled:opacity-50 active:scale-[0.98]"
              >
                {socialLoading !== 'github' && <Github className="h-5 w-5" />}
                Continue with GitHub
              </LoadingButton>
            </div>

            {/* Divider */}
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#e8e9e5]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-[#78746e] font-medium">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Mode toggle */}
            <div className="flex mb-5 bg-[#f7f7f4] p-1 rounded-xl">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === 'login'
                    ? 'bg-white text-[#2d5a3d] shadow-sm'
                    : 'text-[#78746e] hover:text-[#1c1917]'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === 'signup'
                    ? 'bg-white text-[#2d5a3d] shadow-sm'
                    : 'text-[#78746e] hover:text-[#1c1917]'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Form */}
            {mode === 'login' ? (
              <LoginForm 
                onSuccess={handleAuthSuccess} 
                redirectTo={safeRedirectTo}
                showForgotPassword={true}
              />
            ) : (
              <SignupForm 
                onSuccess={handleAuthSuccess} 
                redirectTo={safeRedirectTo}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthModal;
