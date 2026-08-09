'use client';

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";


export default function CTA() {
    const { t } = useTranslation();
  return(
    <section>
          {/* Bottom CTA strip — enhanced */}
        <div className="mt-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1c3a28] via-[#2d5a3d] to-[#1a3322]" />
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #c8a96e 0%, transparent 50%), radial-gradient(circle at 80% 50%, #f9f7f4 0%, transparent 50%)" }} />
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 p-10 lg:p-14">
            <div className="text-center lg:text-left">
              <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-3">Personalised Service</p>
              <h3
                className="text-[clamp(1.6rem,2.5vw,2rem)] font-semibold text-white leading-snug mb-2"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {t("features.cta.headline")}
              </h3>
              <p className="text-base text-white/80 max-w-lg">
                {t("features.cta.sub")}
              </p>
            </div>
            <Link
              href="/products"
              className="shrink-0 inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-[#c8a96e] via-[#d4b76a] to-[#c8a96e] text-[#1c1917] font-bold rounded-full hover:from-[#d4b76a] hover:to-[#c8a96e] transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-[#c8a96e]/50 border-2 border-transparent hover:border-white/50 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                {t("features.cta.button")}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-800 ease-out" />
            </Link>
          </div>
          <div className="absolute -bottom-6 -right-6 w-40 h-40 opacity-[0.07] pointer-events-none">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <path d="M50 5C55 25 75 35 95 50C75 65 55 75 50 95C45 75 25 65 5 50C25 35 45 25 50 5Z" fill="currentColor" />
            </svg>
          </div>
        </div>
    </section>
  )
}