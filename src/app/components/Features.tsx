'use client';

import { useTranslation } from "@/hooks/useTranslation";


export default function Features() {
  const { t } = useTranslation();

  const features = [
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C12 2 5 8 5 14a7 7 0 0014 0c0-6-7-12-7-12z" />
          <path d="M12 8v8M9 11l3-3 3 3" />
        </svg>
      ),
      title: t("features.f1.title"),
      description: t("features.f1.description"),
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
      title: t("features.f2.title"),
      description: t("features.f2.description"),
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
          <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
          <line x1="12" y1="12" x2="12" y2="12" />
        </svg>
      ),
      title: t("features.f3.title"),
      description: t("features.f3.description"),
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      title: t("features.f4.title"),
      description: t("features.f4.description"),
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      ),
      title: t("features.f5.title"),
      description: t("features.f5.description"),
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      ),
      title: t("features.f6.title"),
      description: t("features.f6.description"),
    },
  ];
   
  return (
    <section
      className="py-28 bg-white"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        {/* Header — asymmetric */}
        <div className="grid lg:grid-cols-[1fr_2fr] gap-16 items-end mb-20">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
              {t("features.eyebrow")}
            </p>
            <h2
              className="text-[clamp(2rem,3.5vw,2.75rem)] font-semibold leading-[1.15] text-[#1c1917]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {t("features.headline")}
              <br />
              <em className="not-italic text-[#2d5a3d]">{t("features.headlineAccent")}</em>
            </h2>
          </div>
          <p className="text-[17px] text-[#78746e] leading-relaxed max-w-[560px] lg:mb-1.5">
            {t("features.subheadline")}
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-[rgba(28,25,23,0.08)] rounded-2xl overflow-hidden">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white p-8 hover:bg-[#f9f7f4] transition-colors group cursor-default"
            >
              <div className="text-[#2d5a3d] mb-5 group-hover:scale-105 transition-transform inline-block">
                {f.icon}
              </div>
              <h3
                className="text-[18px] font-semibold text-[#1c1917] mb-3 leading-snug"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {f.title}
              </h3>
              <p className="text-[15px] text-[#78746e] leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>

      
      </div>
    </section>
  );
}
