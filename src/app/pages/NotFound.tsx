'use client';

import Link from 'next/link';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import { ArrowRight, Home, SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#fafaf8] text-[#1c1917]">
      <Navigation />

      <main className="flex flex-1 items-center justify-center px-6 pb-20 pt-32 sm:px-8 lg:px-12">
        <div className="w-full max-w-xl text-center">
   
          {/* 404 */}
          <p className="text-7xl font-bold tracking-tight text-[#2d5a3d] sm:text-8xl">
            404
          </p>

          {/* Title */}
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#1c1917] sm:text-4xl">
            Page not found
          </h1>

          {/* Description */}
          <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[#78746e] sm:text-lg">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. It may
            have been moved, renamed, or no longer exists.
          </p>

          {/* Actions */}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2d5a3d] px-6 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#234832] hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-[#2d5a3d]/15"
            >
              <Home className="h-4 w-4" />
              Back to Home

              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/products"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-[#2d5a3d]/15 bg-white px-6 text-sm font-semibold text-[#1c1917] transition-colors duration-200 hover:bg-[#f3f7f4] hover:text-[#2d5a3d] focus:outline-none focus:ring-4 focus:ring-[#2d5a3d]/10"
            >
              Explore Products
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}