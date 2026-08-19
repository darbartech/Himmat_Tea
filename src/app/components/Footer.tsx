'use client';

import Link from "next/link";
import { Instagram, Facebook, Youtube } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { BRAND } from "@/config/brand";
import Image from "next/image";
import { useStore } from "@/context/StoreContext";

export default function Footer() {
  const { t } = useTranslation();
  const { productLines } = useStore();

  const links = {
    [t("footer.shop")]: [
      ...productLines.filter(pl => pl.isActive).map(pl => ({ label: pl.name, href: `/${pl.slug}` })),
      { label: t("footer.subscriptions"), href: "/subscribe" },
    ],
    [t("footer.company")]: [
      { label: t("nav.ourStory"), href: "/about" },
      { label: t("footer.sourcing"), href: "/about/sourcing" },
      { label: t("footer.sustainability"), href: "/about" },
      { label: t("nav.wholesale"), href: "/wholesale" },
      { label: t("footer.blog"), href: "/blog" },
      { label: t("footer.careers"), href: "/careers" },
    ],
    [t("footer.support")]: [
      { label: t("footer.faq"), href: "/faq" },
      { label: t("footer.shippingReturns"), href: "/shipping-returns" },
      { label: t("footer.brewingGuides"), href: "/brewing-guides" },
      { label: t("footer.contactUs"), href: "/contact" },
      { label: t("footer.privacyPolicy"), href: "/privacy-policy" },
      { label: t("footer.termsOfService"), href: "/terms" },
    ],
  };

  return (
    <footer
      className="bg-[#1c1917] text-white"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-12">
          {/* Brand column */}
          <div>
            <Link href="/" className="flex items-center gap-3 mb-6">
             
                  <Image
                           src="/logo.svg"
                           alt={BRAND.companyName}
                           width={100}
                           height={100}
                           className="w-[150px] h-[100%]"
                          
                         />
            </Link>
            <p className="text-white/60 text-[15px] leading-relaxed mb-6 max-w-[260px]">
              {BRAND.tagline}
            </p>

            <div className="flex gap-3 mb-8">
              {[
                { Icon: Instagram, label: "Instagram", href: BRAND.socialLinks.instagram },
                { Icon: Facebook, label: "Facebook", href: BRAND.socialLinks.facebook },
                { Icon: Youtube, label: "YouTube", href: BRAND.socialLinks.youtube },
              ].map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-[#2d5a3d] transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>

            <div className="border-l-2 border-[#c8a96e] pl-4 space-y-2 text-sm text-white/50">
              <p>{t("footer.addressLine1")}</p>
              <p>{t("footer.addressLine2")}</p>
              <a
                href={`mailto:${BRAND.supportEmail}`}
                className="block hover:text-[#c8a96e] transition-colors"
              >
                {BRAND.supportEmail}
              </a>
              <a
                href={`tel:${BRAND.supportPhone}`}
                className="block hover:text-[#c8a96e] transition-colors"
              >
                {BRAND.supportPhone}
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([heading, items]) => (
            <div key={heading}>
              <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-5">
                {heading}
              </p>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-[15px] text-white/60 hover:text-white transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <p>{t("footer.copyright")}</p>
          <div className="flex gap-6">
            <Link
              href="/privacy-policy"
              className="hover:text-white/70 transition-colors"
            >
              {t("footer.privacy")}
            </Link>
            <Link href="/terms" className="hover:text-white/70 transition-colors">
              {t("footer.terms")}
            </Link>
            <Link
              href="/privacy-policy"
              className="hover:text-white/70 transition-colors"
            >
              {t("footer.cookies")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
