'use client';

import { Star } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const featured = {
  quote:
    "I've been collecting fine teas for fifteen years and Himmat Tea is the only retailer I trust for my Wuyi rock oolongs. The sourcing transparency alone sets them apart — I know exactly which garden and harvest season I'm drinking.",
  name: "James Okonkwo",
  role: "Tea collector & writer",
  location: "London, UK",
  rating: 5,
};

const others = [
  {
    quote:
      "Switched our café entirely to Himmat Tea six months ago. Customer feedback on our tea menu has been overwhelmingly positive since the change.",
    name: "Mei-Ling Hsu",
    role: "Café owner",
    location: "Portland, OR",
    rating: 5,
  },
  {
    quote:
      "The subscription box is exceptional. Each month I discover something I'd never have found on my own. The tasting notes are genuinely educational.",
    name: "Anouk Vermeer",
    role: "Wellness practitioner",
    location: "Amsterdam",
    rating: 5,
  },
  {
    quote:
      "Ordered a gift set for my mother who's very particular about her teas. She called me the same evening — that's never happened before with a gift.",
    name: "Priya Nair",
    role: "Customer since 2023",
    location: "Toronto",
    rating: 5,
  },
  {
    quote:
      "The packaging is extraordinary — compostable, beautifully designed, and it actually keeps the tea fresh. I reuse the tins.",
    name: "Stefan Müller",
    role: "Sustainable living advocate",
    location: "Berlin",
    rating: 5,
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-[#c8a96e] text-[#c8a96e]" />
      ))}
    </div>
  );
}

export default function Testimonials() {
  const { t } = useTranslation();
  return (
    <section
      className="py-28 bg-white"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        {/* Label */}
        <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-14">
          {t("testimonials.eyebrow")}
        </p>

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-16 items-start">

          {/* Featured testimonial — left */}
          <div>
            <div className="relative">
              {/* Large decorative quote */}
              <span
                className="absolute -top-6 -left-3 text-[120px] leading-none text-[#f0ede8] font-serif select-none pointer-events-none"
                style={{ fontFamily: "'Playfair Display', serif" }}
                aria-hidden
              >
                "
              </span>
              <blockquote
                className="relative text-[1.35rem] leading-[1.6] font-medium text-[#1c1917] mb-8"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {featured.quote}
              </blockquote>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#2d5a3d] flex items-center justify-center text-white font-semibold text-lg">
                {featured.name[0]}
              </div>
              <div>
                <div className="font-semibold text-[#1c1917]">{featured.name}</div>
                <div className="text-sm text-[#78746e]">
                  {featured.role} · {featured.location}
                </div>
              </div>
              <div className="ml-auto">
                <Stars count={featured.rating} />
              </div>
            </div>

            {/* Trust numbers */}
            <div className="grid grid-cols-3 gap-6 mt-14 pt-12 border-t border-[rgba(28,25,23,0.08)]">
              {[
                { value: t("testimonials.stat.ratingValue"), label: t("testimonials.stat.ratingLabel"), sub: t("testimonials.stat.ratingSub") },
                { value: t("testimonials.stat.recommendValue"), label: t("testimonials.stat.recommendLabel"), sub: t("testimonials.stat.recommendSub") },
                { value: t("testimonials.stat.customersValue"), label: t("testimonials.stat.customersLabel"), sub: t("testimonials.stat.customersSub") },
              ].map((stat) => (
                <div key={stat.label}>
                  <div
                    className="text-3xl font-semibold text-[#1c1917] mb-1"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-sm font-medium text-[#1c1917]">{stat.label}</div>
                  <div className="text-xs text-[#78746e] mt-0.5">{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Grid of shorter testimonials — right */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {others.map((t, i) => (
              <div
                key={i}
                className="p-6 bg-[#f9f7f4] rounded-2xl border border-[rgba(28,25,23,0.06)] hover:border-[rgba(28,25,23,0.12)] transition-colors"
              >
                <Stars count={t.rating} />
                <p className="text-[15px] text-[#1c1917] leading-relaxed mt-3 mb-4">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#e8e4de] flex items-center justify-center text-sm font-semibold text-[#2d5a3d]">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#1c1917]">{t.name}</div>
                    <div className="text-xs text-[#78746e]">{t.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
    </section>
  );
}
