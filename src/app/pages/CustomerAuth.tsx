'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import { useAuth } from '@/context/AuthContext';
import {
  Mail,
  User,
  Eye,
  EyeOff,
  Leaf,
  Shield,
  Truck,
  Gift,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Check,
} from 'lucide-react';
import { LoginForm, SignupForm } from '@/modules/auth';
import { useTranslation } from '@/hooks/useTranslation';

function getSafeRedirect(value: string | null): string {
  if (!value) return '/account';
  if (!value.startsWith('/')) return '/account';
  if (value.startsWith('//')) return '/account';
  return value;
}

const GoogleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const FacebookIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
  </svg>
);

const AppleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="#1c1917"/>
  </svg>
);

const SocialButton: React.FC<{
  provider: 'google' | 'facebook' | 'apple';
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}> = ({ provider, onClick, disabled, loading }) => {
  const Icon = provider === 'google' ? GoogleIcon : provider === 'facebook' ? FacebookIcon : AppleIcon;
  const labels: Record<string, string> = {
    google: 'Google',
    facebook: 'Facebook',
    apple: 'Apple',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="group relative flex items-center justify-center gap-3 w-full h-[54px] rounded-2xl bg-white border border-border/70 hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none active:scale-[0.98]"
      aria-label={`Continue with ${labels[provider]}`}
    >
      {loading ? (
        <span className="animate-spin rounded-full h-5 w-5 border-2 border-foreground border-t-transparent" />
      ) : (
        <>
          <Icon />
          <span className="text-sm font-medium text-foreground/90 group-hover:text-foreground transition-colors">
            Continue with {labels[provider]}
          </span>
        </>
      )}
    </button>
  );
};

export default function CustomerAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect');
  const rawMode = searchParams.get('mode');
  const safeRedirectTo = getSafeRedirect(rawRedirect);
  const initialMode: 'login' | 'signup' = rawMode === 'signup' ? 'signup' : 'login';
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const { t } = useTranslation();

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
      <div className="min-h-screen bg-gradient-to-b from-[#f9faf7] to-[#f3f6ef] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">{t('auth.checkingAuthentication')}</p>
        </div>
      </div>
    );
  }

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
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

  const isLogin = mode === 'login';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9faf7] via-[#f6f8f2] to-[#f3f6ef]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Navigation />
      <main className="pt-[130px] pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">

          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              {t('auth.backToHome')}
            </Link>
          </div>

          <div className="rounded-[32px] bg-white shadow-[0_30px_100px_-30px_rgba(45,90,61,0.15)] border border-border/40 overflow-hidden">
            <div className="grid lg:grid-cols-[1.05fr_1fr]">

              {/* Left Brand Panel */}
              <section className="relative hidden lg:flex flex-col justify-between p-10 xl:p-14 bg-gradient-to-br from-[#2d5a3d] via-[#2a573a] to-[#0b7c33] text-white overflow-hidden">

                <div className="absolute inset-0 opacity-[0.06]" aria-hidden>
                  <div className="absolute top-16 -left-16 w-80 h-80 rounded-full bg-white blur-3xl"></div>
                  <div className="absolute bottom-24 -right-10 w-72 h-72 rounded-full bg-[#c8a96e] blur-3xl"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.8)_1px,transparent_0)] [background-size:18px_18px] opacity-[0.5]"></div>
                </div>

                <div className="relative z-10 space-y-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.32em] font-semibold text-[#d8e5ce] border border-white/12 backdrop-blur-sm">
                    <Leaf className="h-3.5 w-3.5 text-[#c8a96e]" />
                    {t('customerAuth.brandBadge')}
                  </span>

                  <h1
                    className="mt-10 text-[2.6rem] xl:text-[3rem] font-semibold leading-[1.06] tracking-tight"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {isLogin
                      ? t('customerAuth.welcomeBackTitle')
                      : t('customerAuth.createAccountTitle')}
                  </h1>

                  <p className="mt-5 text-base leading-8 text-[#d8e5ce] max-w-md">
                    {isLogin
                      ? t('customerAuth.loginSubtitle')
                      : t('customerAuth.signupSubtitle')}
                  </p>
                </div>

                <div className="relative z-10 space-y-4 mt-12">
                  <div className="flex items-center gap-4 text-[#ecf3e8]">
                    <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 backdrop-blur-sm">
                      <Truck className="w-5 h-5 text-[#c8a96e]" />
                    </div>
                    <span className="text-sm font-medium">{t('customerAuth.benefit1')}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[#ecf3e8]">
                    <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 backdrop-blur-sm">
                      <Gift className="w-5 h-5 text-[#c8a96e]" />
                    </div>
                    <span className="text-sm font-medium">{t('customerAuth.benefit2')}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[#ecf3e8]">
                    <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 backdrop-blur-sm">
                      <Shield className="w-5 h-5 text-[#c8a96e]" />
                    </div>
                    <span className="text-sm font-medium">{t('customerAuth.benefit3')}</span>
                  </div>
                </div>

                <div className="relative z-10 pt-12 border-t border-white/10 mt-12">
                  <div className="grid grid-cols-3 gap-8">
                    <div>
                      <div className="text-3xl font-bold text-[#c8a96e] tracking-tight">50+</div>
                      <div className="text-xs text-[#d8e5ce] mt-1.5 leading-relaxed">{t('customerAuth.stats.teaVarieties')}</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-[#c8a96e] tracking-tight">10K+</div>
                      <div className="text-xs text-[#d8e5ce] mt-1.5 leading-relaxed">{t('customerAuth.stats.happyCustomers')}</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-[#c8a96e] tracking-tight flex items-center gap-1">
                        4.9<Sparkles className="h-4 w-4 text-yellow-300 ml-0.5" />
                      </div>
                      <div className="text-xs text-[#d8e5ce] mt-1.5 leading-relaxed">{t('customerAuth.stats.customerRating')}</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Right Form Panel */}
              <div className="p-8 sm:p-10 lg:p-12 xl:p-14">
                <div className="max-w-[440px] mx-auto">

                  <div className="mb-10 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 mb-5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10.5px] uppercase tracking-[0.2em] font-bold text-primary">
                        {isLogin ? t('auth.page.formEyebrowLogin') : t('auth.page.formEyebrowSignup')}
                      </span>
                    </div>

                    <h2
                      className="text-[2.3rem] font-semibold text-foreground leading-tight tracking-tight"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {isLogin ? t('customerAuth.formTitleLogin') : t('customerAuth.formTitleSignup')}
                    </h2>
                    <p className="text-center text-base text-muted-foreground mt-3 leading-relaxed">
                      {isLogin
                        ? t('customerAuth.formSubtitleLogin')
                        : t('customerAuth.formSubtitleSignup')}
                    </p>
                  </div>

                  <div className="space-y-3.5 mb-8">
                    <SocialButton
                      provider="google"
                      onClick={() => handleSocialLogin('google')}
                      loading={socialLoading === 'google'}
                      disabled={socialLoading !== null}
                    />
                    <SocialButton
                      provider="facebook"
                      onClick={() => handleSocialLogin('facebook')}
                      loading={socialLoading === 'facebook'}
                      disabled={socialLoading !== null}
                    />
                    <SocialButton provider="apple" disabled />
                  </div>

                  <div className="relative mb-8 flex items-center gap-4">
                    <div className="flex-1 h-px bg-border/70"></div>
                    <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground bg-white px-2">
                      {t('customerAuth.orDivider')}
                    </span>
                    <div className="flex-1 h-px bg-border/70"></div>
                  </div>

                  {isLogin ? (
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

                  <div className="mt-10 pt-8 border-t border-border/50 text-center">
                    <span className="text-[15px] text-muted-foreground">
                      {isLogin ? t('customerAuth.switchPromptLogin') : t('customerAuth.switchPromptSignup')}{' '}
                    </span>
                    <button
                      onClick={() => {
                        setMode(isLogin ? 'signup' : 'login');
                        router.push(`/customer-auth?mode=${isLogin ? 'signup' : 'login'}${rawRedirect ? `&redirect=${encodeURIComponent(rawRedirect)}` : ''}`, { scroll: false });
                      }}
                      className="text-[15px] font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 group"
                    >
                      {isLogin ? t('customerAuth.switchToSignup') : t('customerAuth.switchToLogin')}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
