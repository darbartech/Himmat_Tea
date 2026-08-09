'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { Github, Chrome } from 'lucide-react';
import { LoginForm, SignupForm } from '@/modules/auth';

export default function CustomerAuth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [socialLoading, setSocialLoading] = useState<'google' | 'github' | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  
  const { socialLogin, isLoggedIn, userType } = useAuth();
  
  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      if (userType === 'customer') {
        router.replace('/account');
      } else {
        router.replace('/');
      }
    }
  }, [isLoggedIn, userType, router]);
  
  if (isLoggedIn) {
    return null;
  }

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setSocialLoading(provider);
    
    try {
      const success = await socialLogin(provider);
      if (success) {
        router.push(redirectTo);
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAuthSuccess = () => {
    router.push(redirectTo);
  };

  return (
    <div className="min-h-screen bg-[#f9f7f4]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Navigation />
      <main className="pt-[180px] pb-24">
        <div className="max-w-2xl mx-auto px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-semibold mb-3">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </p>
            <h1 
              className="text-[clamp(2rem,4vw,3rem)] leading-[1.1] font-semibold text-[#1c1917]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {mode === 'login' ? 'Sign In' : 'Join Us'}
            </h1>
            <p className="text-[#78746e] mt-3 max-w-md mx-auto">
              {mode === 'login' 
                ? 'Sign in to access your account, track orders, and more.'
                : 'Create an account to save your details and checkout faster.'}
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-[rgba(28,25,23,0.06)]">
            {/* Social Login Buttons */}
            <div className="space-y-3 mb-8">
              <button
                onClick={() => handleSocialLogin('google')}
                disabled={!!socialLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border border-[rgba(28,25,23,0.15)] rounded-xl hover:bg-[#f9f7f4] transition-all text-sm font-medium text-[#1c1917] disabled:opacity-50 cursor-pointer"
              >
                {socialLoading === 'google' ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-[#1c1917] border-t-transparent"></span>
                ) : (
                  <Chrome className="h-5 w-5 text-red-500" />
                )}
                Continue with Google
              </button>
              
              <button
                onClick={() => handleSocialLogin('github')}
                disabled={!!socialLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-[#1c1917] text-white border border-[#1c1917] rounded-xl hover:bg-[#333] transition-all text-sm font-medium disabled:opacity-50 cursor-pointer"
              >
                {socialLoading === 'github' ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                ) : (
                  <Github className="h-5 w-5" />
                )}
                Continue with GitHub
              </button>
            </div>
            
            {/* Divider */}
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[rgba(28,25,23,0.1)]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-[#78746e]">or continue with email</span>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex mb-8 bg-[#f9f7f4] p-1 rounded-xl">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'login'
                    ? 'bg-white text-[#2d5a3d] shadow-sm'
                    : 'text-[#78746e] hover:text-[#1c1917]'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-[#2d5a3d] shadow-sm'
                    : 'text-[#78746e] hover:text-[#1c1917]'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Reusable LoginForm Component */}
            {mode === 'login' && (
              <LoginForm 
                onSuccess={handleAuthSuccess}
                redirectTo={redirectTo}
                showForgotPassword={true}
              />
            )}

            {/* Reusable SignupForm Component */}
            {mode === 'signup' && (
              <SignupForm 
                onSuccess={handleAuthSuccess}
                redirectTo={redirectTo}
              />
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-[#78746e]">
                {mode === 'login' 
                  ? "Don't have an account?"
                  : "Already have an account?"}
                <button
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="ml-2 text-[#2d5a3d] font-semibold hover:underline"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
