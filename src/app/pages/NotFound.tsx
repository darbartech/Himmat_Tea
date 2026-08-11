'use client';

import Link from "next/link";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

export default function NotFound() {
  const [bubbles] = useState<{ id: number; size: number; left: number; delay: number }[]>(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      size: Math.random() * 20 + 10,
      left: Math.random() * 100,
      delay: Math.random() * 5,
    }))
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9f7f4] via-[#f0f9f4] to-[#f9f7f4] relative overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Decorative background elements */}
      <div className="absolute top-20 left-10 w-40 h-40 bg-[#c8a96e]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-60 h-60 bg-[#2d5a3d]/5 rounded-full blur-3xl" />
      
      {/* Floating tea bubbles animation */}
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
        />
      ))}

      <Navigation />

      <main className="pt-[160px] pb-32 relative z-10">
        <div className="max-w-2xl mx-auto px-6 lg:px-8 text-center">
          {/* Tea cup illustration */}
          <div className="mb-10 relative inline-block">
            <div className="w-36 h-36 mx-auto relative">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-24 bg-gradient-to-b from-white to-[#f0ede8] border-2 border-[#2d5a3d]/20 rounded-[40%_40%_45%_45%] shadow-xl" />
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-20 h-20 bg-gradient-to-b from-[#0b7c33] to-[#2d5a3d] rounded-full opacity-30" />
              <div className="absolute bottom-6 right-2 w-12 h-16 border-4 border-[#2d5a3d]/20 rounded-r-full border-l-0" />
            </div>
            <div className="absolute -top-8 -right-8 text-6xl animate-bounce">🍃</div>
            <div className="absolute top-0 -left-8 text-5xl animate-pulse">🌿</div>
          </div>

          {/* 404 text */}
          <h1
            className="text-[clamp(5rem,18vw,10rem)] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#2d5a3d] via-[#0b7c33] to-[#c8a96e] leading-none mb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            404
          </h1>

          {/* Main heading */}
          <h2
            className="text-[clamp(1.8rem,4vw,3rem)] leading-tight font-semibold text-[#1c1917] mb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Oops! This Page Went For a Walk
          </h2>

          {/* Description */}
          <p className="text-lg md:text-xl text-[#78746e] mb-10 max-w-lg mx-auto leading-relaxed">
            It seems like this page got lost in the tea fields! No worries, let&apos;s get you back to the perfect cup of tea.
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
            <p className="text-sm text-[#78746e] mb-2 font-semibold uppercase tracking-wider">Fun Tea Fact</p>
            <p className="text-[#1c1917]">
              Did you know? Tea is the second most consumed drink in the world, after water! ☕
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
