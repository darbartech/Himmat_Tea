"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/context/StoreContext";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.2,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

const FEATURES = [
  {
    label: "Hand-Picked\nLeaves",
    icon: (
      <path d="M4 14c0-6 4-10 10-10 5 0 6 5 4 8-3 4-9 5-14 2z M4 14c4-1 8-3 10-6" />
    ),
  },
  {
    label: "Small-Batch\nBlended",
    icon: (
      <path d="M9 3h6 M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3 M8 15h8" />
    ),
  },
  {
    label: "Certified\nOrganic",
    icon: <path d="M12 7.5v9M8 12h8 M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17" />,
  },
  {
    label: "Ethically\nSourced",
    icon: (
      <path d="M5 4v9a7 7 0 0 0 14 0V4 M5 8H3.5A1.5 1.5 0 0 1 2 6.5 1.5 1.5 0 0 1 3.5 5H5 M19 8h1.5A1.5 1.5 0 0 0 22 6.5 1.5 1.5 0 0 0 20.5 5H19 M8 21h8" />
    ),
  },
];

export default function Hero() {
  const { ref: stageWrapRef, inView } = useInView<HTMLDivElement>();
  const { heroVisuals } = useStore();
  const [hovering, setHovering] = useState(false);
  const [index, setIndex] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const autoplayPaused = hovering || !inView;

  const activeHeroVisuals = heroVisuals
    .filter(visual => visual.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  useEffect(() => {
    if (autoplayPaused || activeHeroVisuals.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % activeHeroVisuals.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [autoplayPaused, activeHeroVisuals.length]);

  return (
    <section
      className="bg-[#f9f7f4] py-16 md:py-20"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <style jsx global>{`
        @keyframes sway {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(2deg);
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 items-center gap-10 md:grid-cols-2">
        <div className="order-2 max-w-xl py-12 md:order-1 md:py-16">
          <div className="flex items-center gap-2.5 mb-5">
            <div
              aria-hidden
              style={{
                width: "26px",
                height: "2px",
                borderRadius: "2px",
                background: "linear-gradient(to right, #c8a96e, rgba(200,169,110,0.25))",
              }}
            />
            <p className="text-[#c8a96e] font-semibold" style={{ fontSize: "11px", letterSpacing: "0.25em", textTransform: "uppercase" }}>
              HIMMAT TEA · SMALL-BATCH TEA
            </p>
          </div>

          <h1
            className="font-semibold leading-[1.04] tracking-[-0.01em] text-[#1c1917] mb-5"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(34px, 5vw, 68px)",
            }}
          >
            Nature’s Gift,
            <br />
            <em className="not-italic text-[#2d5a3d]">Steeped in Grace</em>
          </h1>

          <div className="h-0.5 w-16 bg-[#c8a96e] mb-5" />

          <p className="max-w-md text-[16.5px] leading-relaxed text-[#78746e] mb-8">
            Hand-picked leaves, slow-dried in shade and blended in small batches —
            every tin carries a quiet ritual from soil to cup.
          </p>

          <ul className="flex flex-wrap mb-11">
            {FEATURES.map((f, i) => (
              <li
                key={f.label}
                className={`min-w-[35%] flex-1 px-4 py-2 first:pl-0 sm:min-w-0 ${
                  i === 0 ? "border-l-0" : "border-l border-[#e5e1d9]"
                }`}
              >
                <div className="group flex flex-col items-start gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#c8a96e] text-[#c8a96e] transition-all duration-300 ease-out group-hover:-translate-y-0.5 group-hover:border-[#c8a96e] group-hover:bg-[#c8a96e] group-hover:text-[#f9f7f4] group-hover:shadow-[0_8px_18px_rgba(200,169,110,0.28)]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px]">
                      {f.icon}
                    </svg>
                  </span>
                  <span className="whitespace-pre-line text-[10.5px] font-semibold uppercase leading-relaxed tracking-[0.06em] text-[#1c1917]">
                    {f.label}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-4">
            <Link
              href="#shop"
              className="group inline-flex items-center gap-3 rounded-lg bg-[#2d5a3d] px-7 py-4.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#f9f7f4] transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-[#234832] hover:shadow-[0_14px_28px_rgba(45,90,61,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#2d5a3d] active:translate-y-0 active:shadow-none"
            >
              Shop Collection
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:translate-x-1">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link
              href="#story"
              className="inline-flex items-center rounded-lg border border-[#1c1917] px-6 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-[#1c1917] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[#1c1917] hover:text-[#f9f7f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1917] active:translate-y-0"
            >
              Our Story
            </Link>
          </div>
        </div>

        <div
          className="order-1 flex max-h-[400px] w-full items-end justify-center md:order-2 md:h-[600px] md:max-h-[600px]"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          <div className="relative aspect-square w-full flex items-center justify-center">
            <svg
              viewBox="0 0 40 60"
              className="absolute right-[8%] top-[1%] h-[18%] w-[10%] origin-bottom text-[#2d5a3d] motion-safe:animate-[sway_6s_ease-in-out_infinite] motion-reduce:animate-none z-10"
              aria-hidden="true"
            >
              <path d="M20 2 C34 14 34 46 20 58 C6 46 6 14 20 2 Z" fill="currentColor" />
              <path d="M20 6 V54" stroke="#1a3a28" strokeWidth="1" opacity=".5" />
            </svg>
            <svg
              viewBox="0 0 40 60"
              className="absolute right-[16%] top-[9%] h-[14%] w-[8%] origin-bottom text-[#2d5a3d] opacity-80 motion-safe:animate-[sway_7s_ease-in-out_infinite] motion-reduce:animate-none [animation-delay:.8s] z-10"
              aria-hidden="true"
            >
              <path d="M20 2 C34 14 34 46 20 58 C6 46 6 14 20 2 Z" fill="currentColor" />
            </svg>
            <svg
              viewBox="0 0 40 60"
              className="absolute left-[5%] bottom-[10%] h-[12%] w-[7%] origin-bottom text-[#c8a96e] opacity-70 motion-safe:animate-[sway_5.5s_ease-in-out_infinite] motion-reduce:animate-none [animation-delay:.3s] z-10"
              aria-hidden="true"
            >
              <path d="M20 2 C34 14 34 46 20 58 C6 46 6 14 20 2 Z" fill="currentColor" />
            </svg>

            <div className="relative h-full w-full flex items-center justify-center">
              <img
                src="/Hero section.png"
                alt="Hero section"
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
