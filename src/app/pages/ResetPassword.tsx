'use client';

import Link from 'next/link';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import { ResetPasswordForm } from '@/modules/auth/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#eef4ea]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Navigation />
      <main className="pt-[140px] pb-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] items-center">
            <section className="rounded-[32px] bg-[#2d5a3d] p-10 text-white shadow-[0_40px_120px_rgba(45,90,61,0.15)] sm:p-12 lg:p-14">
              <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.32em] font-semibold text-[#d8e5ce]">
                New password
              </span>
              <h1
                className="mt-8 text-[clamp(2.5rem,4vw,4rem)] font-semibold leading-[0.95] max-w-3xl"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Almost there. Set a new password.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#d8e5ce]">
                Choose a strong password you haven&apos;t used for this account before.
                It must be at least 12 characters and include uppercase, lowercase, a number,
                and a special character.
              </p>
            </section>

            <div className="rounded-[32px] bg-white p-8 shadow-xl border border-[#e1e5df] sm:p-10">
              <div className="mb-8 text-center">
                <p className="text-xs uppercase tracking-[0.28em] text-[#2d5a3d] font-semibold mb-3">
                  Reset Password
                </p>
                <h2
                  className="text-[clamp(1.75rem,3vw,2.5rem)] font-semibold text-[#1c1917]"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Create a new password
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#6d6a63]">
                  Your code is verified. Pick a new password to secure your account.
                </p>
              </div>

              <ResetPasswordForm className="space-y-6" />

              <div className="mt-6 text-center">
                <p className="text-sm text-[#6d6a63]">
                  <Link href="/customer-auth" className="text-[#2d5a3d] font-semibold hover:underline">
                    Back to sign in
                  </Link>
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
