'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';

// Catches unexpected render errors anywhere under this route segment (a
// null-reference on unexpected API data, a third-party script failure,
// etc.) and shows a branded page instead of Next.js's default unstyled
// error screen. Previously there was no error.tsx anywhere in src/app, so
// visitors hitting a real production error saw a blank/generic crash page
// with no way back to the storefront.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[app error boundary]', error);
  }, [error]);

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-[#f9f7f4] via-[#f0f9f4] to-[#f9f7f4]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <Navigation />

      <main className="pt-[160px] pb-32">
        <div className="max-w-xl mx-auto px-6 lg:px-8 text-center">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-[#2d5a3d]/10 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-[#2d5a3d]" />
          </div>

          <h1
            className="text-3xl md:text-4xl font-semibold text-[#1c1917] mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Something went wrong
          </h1>
          <p className="text-[#78746e] mb-10">
            We hit a snag loading this page. It's on us — please try again, or
            head back to the storefront.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2d5a3d] text-white font-medium hover:bg-[#234832] transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#2d5a3d]/30 text-[#2d5a3d] font-medium hover:bg-[#2d5a3d]/5 transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
