'use client';

import { useState } from "react";
import Link from "next/link";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import { toast } from "sonner";
import { useCurrency } from "@/context/CurrencyContext";
import { Check, Package, Sparkles, Star } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  teas: number;
  weight: string;
  features: string[];
  popular: boolean;
}

const plans: Plan[] = [
  {
    id: "taster",
    name: "Taster",
    monthlyPrice: 999,
    quarterlyPrice: 899,
    teas: 2,
    weight: "50g each",
    features: [
      "2 curated teas per month",
      "50g per tea",
      "Free domestic shipping",
      "Brewing tips included",
    ],
    popular: false,
  },
  {
    id: "explorer",
    name: "Explorer",
    monthlyPrice: 1799,
    quarterlyPrice: 1619,
    teas: 4,
    weight: "50g each",
    features: [
      "4 curated teas per month",
      "50g per tea",
      "Free domestic shipping",
      "Tasting notes card",
      "Seasonal exclusive access",
    ],
    popular: true,
  },
  {
    id: "connoisseur",
    name: "Connoisseur",
    monthlyPrice: 2999,
    quarterlyPrice: 2699,
    teas: 6,
    weight: "100g each",
    features: [
      "6 curated teas per month",
      "100g per tea",
      "Free domestic shipping",
      "Detailed tasting notes",
      "Priority new release access",
      "Personal tea curation",
    ],
    popular: false,
  },
];

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
  const [billing, setBilling] = useState<"monthly" | "quarterly">("monthly");
  const { formatPrice } = useCurrency();

  const handleSubscribe = (planName: string) => {
    toast.success("Subscription started! Check your email.");
    void planName;
  };

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

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span
              className={`text-sm font-medium transition-colors ${billing === "monthly" ? "text-[#1c1917]" : "text-[#78746e]"}`}
            >
              Monthly
            </span>
            <button
              onClick={() =>
                setBilling(billing === "monthly" ? "quarterly" : "monthly")
              }
              className={`relative w-14 h-7 rounded-full transition-colors ${
                billing === "quarterly"
                  ? "bg-[#2d5a3d]"
                  : "bg-[rgba(28,25,23,0.15)]"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  billing === "quarterly" ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium transition-colors ${billing === "quarterly" ? "text-[#1c1917]" : "text-[#78746e]"}`}
            >
              Quarterly
              <span className="ml-2 text-xs bg-[#c8a96e] text-white rounded-full px-2 py-0.5 font-medium">
                Save 10%
              </span>
            </span>
          </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
            {plans.map((plan) => {
              const price =
                billing === "monthly" ? plan.monthlyPrice : plan.quarterlyPrice;
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border p-6 lg:p-8 ${
                    plan.popular
                      ? "border-[#2d5a3d] bg-white shadow-lg shadow-[#2d5a3d]/10"
                      : "border-[rgba(28,25,23,0.06)] bg-white"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-[#2d5a3d] text-white text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {plan.popular && (
                    <div className="bg-[#2d5a3d] -mx-8 -mt-8 px-8 py-5 rounded-t-2xl mb-6">
                      <p className="text-white/70 text-xs uppercase tracking-widest font-medium mb-1">
                        {plan.name}
                      </p>
                      <p
                        className="text-white text-2xl font-semibold"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                      >
                        {plan.name} Plan
                      </p>
                    </div>
                  )}

                  {!plan.popular && (
                    <div className="mb-6">
                      <p className="text-xs uppercase tracking-widest text-[#78746e] font-medium mb-1">
                        {plan.name}
                      </p>
                      <p
                        className="text-[#1c1917] text-2xl font-semibold"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                      >
                        {plan.name} Plan
                      </p>
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="mb-6">
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-4xl font-bold text-[#1c1917]">
                        {formatPrice(price)}
                      </span>
                      <span className="text-[#78746e] mb-1.5">/mo</span>
                    </div>
                    <p className="text-xs text-[#78746e]">
                      {billing === "quarterly"
                        ? `Billed quarterly (${formatPrice(price * 3)} every 3 months)`
                        : "Billed monthly"}
                    </p>
                  </div>

                  {/* Tea Info */}
                  <div className="bg-[#f9f7f4] rounded-xl px-4 py-3 mb-6 flex gap-6">
                    <div>
                      <p className="text-xs text-[#78746e] mb-0.5">Teas</p>
                      <p className="font-semibold text-[#1c1917]">
                        {plan.teas} varieties
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#78746e] mb-0.5">Weight</p>
                      <p className="font-semibold text-[#1c1917]">
                        {plan.weight}
                      </p>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            plan.popular ? "bg-[#2d5a3d]" : "bg-[#2d5a3d]/10"
                          }`}
                        >
                          <Check
                            className={`h-3 w-3 ${plan.popular ? "text-white" : "text-[#2d5a3d]"}`}
                          />
                        </div>
                        <span className="text-sm text-[#444]">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(plan.name)}
                    className={`w-full py-3 rounded-xl font-medium transition-colors ${
                      plan.popular
                        ? "bg-[#2d5a3d] text-white hover:bg-[#234832]"
                        : "border-2 border-[#2d5a3d] text-[#2d5a3d] hover:bg-[#2d5a3d] hover:text-white"
                    }`}
                  >
                    Subscribe Now
                  </button>
                </div>
              );
            })}
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
