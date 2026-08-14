'use client';

import Link from "next/link";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import { ArrowRight } from "lucide-react";

const bubbles = [
  { id: 0, size: 20, left: 8, delay: 0.8 },
  { id: 1, size: 14, left: 18, delay: 2.1 },
  { id: 2, size: 26, left: 29, delay: 1.2 },
  { id: 3, size: 18, left: 38, delay: 3.4 },
  { id: 4, size: 24, left: 47, delay: 0.4 },
  { id: 5, size: 15, left: 56, delay: 2.8 },
  { id: 6, size: 28, left: 65, delay: 1.7 },
  { id: 7, size: 19, left: 73, delay: 4.1 },
  { id: 8, size: 23, left: 81, delay: 2.5 },
  { id: 9, size: 16, left: 88, delay: 0.9 },
  { id: 10, size: 25, left: 93, delay: 3.2 },
  { id: 11, size: 13, left: 3, delay: 4.6 },
];

export default function NotFound() {
  return (
    <div
      className="min-h-screen bg-gradient-to-b from-[#f9f7f4] via-[#f0f9f4] to-[#f9f7f4] relative overflow-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Decorative background elements */}
      <div className="absolute top-20 left-10 w-40 h-40 bg-[#c8a96e]/10 rounded-full blur-3xl" />

      <div className="absolute bottom-20 right-10 w-60 h-60 bg-[#2d5a3d]/5 rounded-full blur-3xl" />

      {/* Floating tea bubbles */}
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="absolute bottom-0 rounded-full bg-[#2d5a3d]/10 pointer-events-none"
          style={{
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            left: `${bubble.left}%`,
            animation: `rise 6s infinite ease-in ${bubble.delay}s`,
          }}
          aria-hidden="true"
        />
      ))}

      <Navigation />

      <main className="pt-[160px] pb-32 relative z-10">
        <div className="max-w-2xl mx-auto px-6 lg:px-8 text-center">

          {/* Tea cup illustration */}
          <div className="mb-10 relative inline-block">
            <div className="w-36 h-36 mx-auto relative">

              {/* Cup */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-24 bg-gradient-to-b from-white to-[#f0ede8] border-2 border-[#2d5a3d]/20 rounded-[40%_40%_45%_45%] shadow-xl" />

              {/* Tea */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-20 h-20 bg-gradient-to-b from-[#0b7c33] to-[#2d5a3d] rounded-full opacity-30" />

              {/* Cup handle */}
              <div className="absolute bottom-6 right-2 w-12 h-16 border-4 border-[#2d5a3d]/20 rounded-r-full border-l-0" />
            </div>

            <div className="absolute -top-8 -right-8 text-6xl animate-bounce">
              🍃
            </div>

            <div className="absolute top-0 -left-8 text-5xl animate-pulse">
              🌿
            </div>
          </div>

          {/* 404 */}
          <h1
            className="text-[clamp(5rem,18vw,10rem)] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#2d5a3d] via-[#0b7c33] to-[#c8a96e] leading-none mb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            404
          </h1>

          {/* Heading */}
          <h2
            className="text-[clamp(1.8rem,4vw,3rem)] leading-tight font-semibold text-[#1c1917] mb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Oops! This Page Went For a Walk
          </h2>

          {/* Description */}
          <p className="text-lg md:text-xl text-[#78746e] mb-10 max-w-lg mx-auto leading-relaxed">
            It seems like this page got lost in the tea fields!
            No worries, let&apos;s get you back to the perfect cup of tea.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#2d5a3d] text-white font-semibold rounded-xl hover:bg-[#234832] transition-all duration-300 hover:shadow-xl hover:shadow-[#2d5a3d]/20 group"
            >
              Back to Home

              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-[#1c1917] font-semibold rounded-xl border-2 border-[#2d5a3d]/20 hover:border-[#2d5a3d]/40 hover:bg-[#f0f9f4] transition-all duration-300"
            >
              Browse Teas
            </Link>

          </div>

          {/* Fun tea fact */}
          <div className="mt-14 p-6 bg-white/60 backdrop-blur-sm border border-[#2d5a3d]/10 rounded-2xl">
            <p className="text-sm text-[#78746e] mb-2 font-semibold uppercase tracking-wider">
              Fun Tea Fact
            </p>

            <p className="text-[#1c1917]">
              Did you know? Tea is the second most consumed drink in the world,
              after water! ☕
            </p>
          </div>

        </div>
      </main>

      <Footer />

      <style>{`
        @keyframes rise {
          0% {
            transform: translateY(0);
            opacity: 0;
          }

          10% {
            opacity: 1;
          }

          90% {
            opacity: 1;
          }

          100% {
            transform: translateY(-120vh);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}