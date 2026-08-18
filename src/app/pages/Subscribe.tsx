'use client';

import Link from "next/link";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import { ArrowRight, Package, Sparkles, Star } from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";

const howItWorks = [
  {
    step: "01",
    icon: Star,
    title: "Choose Your Plan",
    description:
      "Select the plan that matches your tea habit — from curious newcomer to devoted enthusiast. Switch or cancel anytime.",
  },
  {
    step: "02",
    icon: Sparkles,
    title: "We Curate Your Box",
    description:
      "Our tea experts handpick a selection from our latest harvests and seasonal offerings, paired with tasting notes.",
  },
  {
    step: "03",
    icon: Package,
    title: "Delivered to You",
    description:
      "Your box ships on the 1st of each month directly to your door, beautifully packaged and ready to brew.",
  },
];

const subFaqs = [
  {
    q: "Can I cancel at any time?",
    a: "Yes. Cancel anytime from your account dashboard with no fees. Cancellations made before your next billing date take effect immediately.",
  },
  {
    q: "Can I change my plan?",
    a: "Absolutely. Upgrade or downgrade between plans at any time. Changes take effect from your next billing cycle.",
  },
  {
    q: "Can I skip a delivery?",
    a: "Yes. Log in to your account and skip your next delivery — just do so at least 48 hours before your scheduled dispatch.",
  },
  {
    q: "Can I gift a subscription?",
    a: "Yes! Gift subscriptions are available for 1, 3, or 6 months. Contact us at hello@himmattea.com and we'll set everything up.",
  },
];

export default function Subscribe() {
  const { t } = useTranslation();

  return (
    <div
      className="min-h-screen bg-[#f9f7f4]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <Navigation />
      <main className="pt-[180px] pb-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Page Header */}
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
              Never Run Out
            </p>
            <h1
              className="text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] font-semibold text-[#1c1917] mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Tea Subscription Plans
            </h1>
            <p className="text-[#444] leading-relaxed text-lg">
              A new selection of Himalayan teas delivered to your door every
              month. Each box is thoughtfully curated, seasonally inspired, and
              crafted with our highest-grade leaves.
            </p>
          </div>

          {/* Contact CTA (replaces pricing plans) */}
          <div className="max-w-2xl mx-auto mb-24">
            <div className="bg-white rounded-3xl border border-[rgba(28,25,23,0.06)] p-8 lg:p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#2d5a3d]/10 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-8 w-8 text-[#2d5a3d]" />
              </div>
              <h2
                className="text-2xl lg:text-3xl font-semibold text-[#1c1917] mb-4"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Subscriptions Launching Soon
              </h2>
              <p className="text-[#78746e] leading-relaxed mb-8 max-w-lg mx-auto">
                We're putting the finishing touches on our curated tea subscription
                program. Want to be first in line when we open doors? Reach out and
                our team will walk you through the plan options, pricing, and
                early-bird offers.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-3 bg-[#2d5a3d] text-white font-medium rounded-xl hover:bg-[#234832] transition-colors"
              >
                Contact Us to Learn More
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* How It Works */}
          <div className="mb-24">
            <div className="text-center mb-12">
              <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-3">
                The Process
              </p>
              <h2
                className="text-2xl lg:text-3xl font-semibold text-[#1c1917]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                How It Works
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {howItWorks.map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#2d5a3d]/10 flex items-center justify-center mx-auto mb-5">
                    <item.icon className="h-7 w-7 text-[#2d5a3d]" />
                  </div>
                  <p className="text-xs text-[#c8a96e] font-semibold tracking-widest mb-2">
                    {item.step}
                  </p>
                  <h3
                    className="text-lg font-semibold text-[#1c1917] mb-3"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-[#78746e] leading-relaxed text-sm">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2
                className="text-2xl font-semibold text-[#1c1917]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Subscription FAQ
              </h2>
            </div>
            <div className="space-y-4">
              {subFaqs.map((item) => (
                <div
                  key={item.q}
                  className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-6"
                >
                  <p className="font-semibold text-[#1c1917] mb-2">{item.q}</p>
                  <p className="text-[#78746e] leading-relaxed text-sm">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-center mt-8 text-sm text-[#78746e]">
              More questions?{" "}
              <Link
                href="/faq"
                className="text-[#2d5a3d] hover:underline font-medium"
              >
                Visit our full FAQ
              </Link>{" "}
              or{" "}
              <Link
                href="/contact"
                className="text-[#2d5a3d] hover:underline font-medium"
              >
                contact us
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
