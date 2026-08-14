'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { Github, Chrome } from 'lucide-react';
import { LoginForm, SignupForm } from '@/modules/auth';

function getSafeRedirect(value: string | null): string {
  if (!value) return '/account';
  if (!value.startsWith('/')) return '/account';
  if (value.startsWith('//')) return '/account';
  return value;
}

export default function CustomerAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect');
  const rawMode = searchParams.get('mode');
  const safeRedirectTo = getSafeRedirect(rawRedirect);
  const initialMode: 'login' | 'signup' = rawMode === 'signup' ? 'signup' : 'login';
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [socialLoading, setSocialLoading] = useState<'google' | 'github' | null>(null);
  
  const { socialLogin, isLoggedIn, userType, isLoading } = useAuth();

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);
  
  useEffect(() => {
    if (isLoading) return;
    if (isLoggedIn) {
      if (userType === 'customer') {
        router.replace(safeRedirectTo);
        router.refresh();
      } else if (userType === 'admin') {
        router.replace('/himmat_admin_8526/dashboard');
        router.refresh();
      }
    }
  }, [isLoggedIn, userType, isLoading, router, safeRedirectTo]);
  
  if (isLoading || isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#eef4ea] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2d5a3d]"></div>
      </div>
    );
  }

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setSocialLoading(provider);
    
    try {
      const success = await socialLogin(provider);
      if (success) {
        router.replace(safeRedirectTo);
        router.refresh();
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAuthSuccess = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[AUTH] CustomerAuth page handleAuthSuccess → redirecting to ${safeRedirectTo}`
      );
    }
    router.replace(safeRedirectTo);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#eef4ea]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Navigation />
      <main className="pt-[140px] pb-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] items-start">
            {/* Left Brand Panel */}
            <section className="rounded-[32px] bg-[#2d5a3d] p-10 text-white shadow-[0_40px_120px_rgba(45,90,61,0.15)] sm:p-12 lg:p-14 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/20 blur-3xl"></div>
                <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-white/10 blur-3xl"></div>
              </div>
              
              <div className="relative">
                <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.32em] font-semibold text-[#d8e5ce] border border-white/10">
                  Customer {mode === 'login' ? 'login' : 'registration'}
                </span>
                
                <h1
                  className="mt-8 text-[clamp(2.75rem,4vw,4.5rem)] font-semibold leading-[0.95] max-w-3xl"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {mode === 'login' 
                    ? 'Welcome back to your account.' 
                    : 'Join our community of tea lovers.'}
                </h1>
                
                <p className="mt-6 max-w-2xl text-base leading-8 text-[#d8e5ce]">
                  {mode === 'login'
                    ? 'Sign in once and get instant access to your order tracker, saved addresses, personalized recommendations, and faster checkout.'
                    : 'Create an account to save your details, track orders, and enjoy exclusive offers tailored just for you.'}
                </p>

                <div className="mt-10 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[24px] bg-white/10 p-5 border border-white/10 backdrop-blur-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c8d3b9] mb-3">
                      {mode === 'login' ? 'Your benefits' : 'Why join us?'}
                    </p>
                    <ul className="space-y-3 text-sm leading-7 text-[#ecf3e8]">
                      {mode === 'login' ? (
                        <>
                          <li>Keep your deliveries on time</li>
                          <li>Save your favorite items</li>
                          <li>View purchase history</li>
                        </>
                      ) : (
                        <>
                          <li>Faster repeat checkout</li>
                          <li>Personalized offers</li>
                          <li>Secure profile management</li>
                        </>
                      )}
                    </ul>
                  </div>
                  <div className="rounded-[24px] bg-white/10 p-5 border border-white/10 backdrop-blur-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c8d3b9] mb-3">
                      {mode === 'login' ? 'Quick access' : 'Get started'}
                    </p>
                    <ul className="space-y-3 text-sm leading-7 text-[#ecf3e8]">
                      {mode === 'login' ? (
                        <>
                          <li>Track orders in real-time</li>
                          <li>Manage saved addresses</li>
                          <li>Access exclusive deals</li>
                        </>
                      ) : (
                        <>
                          <li>Save delivery addresses</li>
                          <li>Earn loyalty points</li>
                          <li>Get early access to drops</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Right Form Panel */}
            <div className="rounded-[32px] bg-white p-8 shadow-xl border border-[#e1e5df] sm:p-10">
              <div className="mb-8 text-center">
                <p className="text-xs uppercase tracking-[0.28em] text-[#2d5a3d] font-semibold mb-3">
                  {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                </p>
                <h2
                  className="text-[clamp(2rem,3.5vw,2.75rem)] font-semibold text-[#1c1917] leading-tight"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {mode === 'login' ? 'Sign In' : 'Join Us'}
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#6d6a63]">
                  {mode === 'login'
                    ? 'Sign in to access your account, track orders, and more.'
                    : 'Create an account to save your details and checkout faster.'}
                </p>
              </div>

              {/* Social Login Buttons */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleSocialLogin('google')}
                  disabled={!!socialLoading}
                  className="w-full flex items-center justify-center gap-3 rounded-2xl border border-[#e8e9e5] bg-[#fafaf8] px-5 py-3 text-sm font-medium text-[#1c1917] transition-all duration-200 hover:bg-[#f5f5f2] hover:border-[#d4d6cf] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
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
                  className="w-full flex items-center justify-center gap-3 rounded-2xl bg-[#1c1917] px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-[#111] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
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
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e8e9e5]"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-[#6d6a63] font-medium">
                    or continue with email
                  </span>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex rounded-2xl border border-[#e8e9e5] bg-[#f7f7f4] p-1 text-sm font-semibold text-[#5e5b53] mb-8">
                <button
                  onClick={() => {
                    setMode('login');
                    router.replace(`/customer-auth?mode=login${safeRedirectTo ? `&redirect=${encodeURIComponent(safeRedirectTo)}` : ''}`);
                  }}
                  className={`flex-1 rounded-2xl py-3 transition-all duration-200 ${
                    mode === 'login'
                      ? 'bg-white text-[#2d5a3d] shadow-sm'
                      : 'text-[#6d6a63] hover:text-[#2d5a3d]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMode('signup');
                    router.replace(`/customer-auth?mode=signup${safeRedirectTo ? `&redirect=${encodeURIComponent(safeRedirectTo)}` : ''}`);
                  }}
                  className={`flex-1 rounded-2xl py-3 transition-all duration-200 ${
                    mode === 'signup'
                      ? 'bg-white text-[#2d5a3d] shadow-sm'
                      : 'text-[#6d6a63] hover:text-[#2d5a3d]'
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
                  className="space-y-6"
                />
              ) : (
                <SignupForm 
                  onSuccess={handleAuthSuccess}
                  redirectTo={safeRedirectTo}
                  className="space-y-6"
                />
              )}

              {/* Bottom Toggle */}
              <div className="mt-6 text-center">
                <p className="text-sm text-[#6d6a63]">
                  {mode === 'login'
                    ? "Don't have an account?"
                    : 'Already have an account?'}
                  <button
                    onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                    className="ml-2 text-[#2d5a3d] font-semibold hover:underline transition-all"
                  >
                    {mode === 'login' ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
