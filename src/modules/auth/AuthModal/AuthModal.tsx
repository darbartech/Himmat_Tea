'use client';

import React, { useState, useEffect, useRef, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X, Github, Chrome } from 'lucide-react';
import { LoginForm } from '../LoginForm';
import { SignupForm } from '../SignupForm';
import { useAuth } from '@/context/AuthContext';

/**
 * Props for the AuthModal component
 */
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

/**
 * A reusable modal component for authentication that supports both login and signup
 * with smooth transitions, accessibility features, and responsive design.
 */
export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  initialMode = 'login' 
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [isVisible, setIsVisible] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'github' | null>(null);
  const { socialLogin, isLoggedIn } = useAuth();
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Reset mode when modal opens
  useEffect(() => {
    if (isOpen) {
      startTransition(() => setMode(initialMode));
      // Trigger fade in
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      startTransition(() => setIsVisible(false));
    }
  }, [isOpen, initialMode]);

  // Redirect if logged in
  useEffect(() => {
    if (isLoggedIn && isOpen) {
      onClose();
      router.push('/account');
    }
  }, [isLoggedIn, isOpen, onClose, router]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Close on Escape
      if (e.key === 'Escape') {
        onClose();
      }

      // Focus trap
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

  // Focus management
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
        router.push('/account');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAuthSuccess = () => {
    onClose();
    router.push('/account');
  };

  if (!isOpen && !isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[100] transition-all duration-300 ${
          isVisible 
            ? 'bg-[#1c1917]/55 backdrop-blur-sm opacity-100' 
            : 'bg-transparent opacity-0'
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
          className={`w-full max-w-md max-h-[calc(100vh-3rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl transition-all duration-300 ease-out ${
            isVisible 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-95 translate-y-4'
          }`}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(28,25,23,0.08)]">
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
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#f9f7f4] border border-[rgba(28,25,23,0.10)] hover:bg-[#f0ede8] hover:border-[rgba(28,25,23,0.18)] transition-all"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-[#1c1917]" />
            </button>
          </div>

          {/* Modal body */}
          <div className="p-6">
            {/* Social login buttons */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleSocialLogin('google')}
                disabled={!!socialLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-[rgba(28,25,23,0.15)] rounded-xl hover:bg-[#f9f7f4] transition-all text-sm font-medium text-[#1c1917] disabled:opacity-50"
              >
                {socialLoading === 'google' ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-[#1c1917] border-t-transparent" />
                ) : (
                  <Chrome className="h-5 w-5 text-red-500" />
                )}
                Continue with Google
              </button>

              <button
                onClick={() => handleSocialLogin('github')}
                disabled={!!socialLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#1c1917] text-white border border-[#1c1917] rounded-xl hover:bg-[#333] transition-all text-sm font-medium disabled:opacity-50"
              >
                {socialLoading === 'github' ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Github className="h-5 w-5" />
                )}
                Continue with GitHub
              </button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[rgba(28,25,23,0.1)]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-[#78746e]">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Mode toggle */}
            <div className="flex mb-6 bg-[#f9f7f4] p-1 rounded-xl">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'login'
                    ? 'bg-white text-[#2d5a3d] shadow-sm'
                    : 'text-[#78746e] hover:text-[#1c1917]'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
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
                showForgotPassword={true}
              />
            ) : (
              <SignupForm 
                onSuccess={handleAuthSuccess} 
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthModal;
