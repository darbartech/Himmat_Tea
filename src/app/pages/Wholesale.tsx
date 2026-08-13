'use client';

import { useState } from "react";
import Link from "next/link";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import {
  ArrowRight,
  Check,
  Coffee,
  ShoppingBag,
  Building2,
  Store,
  Tag,
  Package,
  Users,
  Globe,
  Leaf,
  Star,
  Clock,
  ChevronDown,
  BadgeCheck,
  Truck,
  Headphones,
  Sparkles,
} from "lucide-react";

const stats = [
  { value: "50+", label: "Active Partners" },
  { value: "12", label: "Countries Served" },
  { value: "30%", label: "Max Discount Off RRP" },
  { value: "48h", label: "Enquiry Response" },
];

const partnerTypes = [
  { icon: Coffee, label: "Cafés & Coffee Shops" },
  { icon: Building2, label: "Hotels & Resorts" },
  { icon: ShoppingBag, label: "Retailers & Gift Shops" },
  { icon: Store, label: "Restaurants & Bars" },
];

const benefits = [
  {
    icon: Tag,
    title: "Tiered Pricing",
    desc: "Up to 30% off RRP with volume-based tiers that grow with your business.",
  },
  {
    icon: Package,
    title: "Custom Packaging",
    desc: "Private label and white-label options — our teas, your brand identity.",
  },
  {
    icon: Headphones,
    title: "Dedicated Manager",
    desc: "A real account manager you can call directly, not a helpdesk ticket queue.",
  },
  {
    icon: Sparkles,
    title: "Seasonal Early Access",
    desc: "Exclusive access to limited lots before they're available to the public.",
  },
  {
    icon: Leaf,
    title: "Free Sample Kit",
    desc: "Five curated teas shipped to you with every approved partnership application.",
  },
  {
    icon: Truck,
    title: "Flexible MOQ",
    desc: "Minimum orders designed for growing businesses, not just large chains.",
  },
];

const steps = [
  {
    number: "01",
    title: "Submit Your Enquiry",
    desc: "Fill in the form below. We review every application personally — no bots, no automated rejections.",
  },
  {
    number: "02",
    title: "Receive Your Sample Kit",
    desc: "Approved partners receive a complimentary kit of five signature teas within 5 business days.",
  },
  {
    number: "03",
    title: "Place Your First Order",
    desc: "Your account manager walks you through pricing, logistics, and custom packaging options.",
  },
];

const pricingRows = [
  {
    category: "Loose Leaf Tea",
    moq: "500 g",
    discount: "20% off RRP",
    badge: "bg-[#f0f9f4] text-[#2d5a3d]",
  },
  {
    category: "Packaged Tea (retail-ready)",
    moq: "24 units",
    discount: "25% off RRP",
    badge: "bg-[#f0f9f4] text-[#2d5a3d]",
  },
  {
    category: "Tea Gift Sets",
    moq: "12 units",
    discount: "30% off RRP",
    badge: "bg-[#2d5a3d]/10 text-[#2d5a3d] font-bold",
  },
  {
    category: "Unpolished Dals",
    moq: "10 kg",
    discount: "15% off RRP",
    badge: "bg-[#fdf6ec] text-[#b8862f]",
  },
  {
    category: "Dal Gift Sets",
    moq: "8 units",
    discount: "25% off RRP",
    badge: "bg-[#b8862f]/10 text-[#b8862f] font-bold",
  },
];

const testimonials = [
  {
    quote:
      "Himmat Tea has transformed our menu. Customers regularly ask where the tea comes from — and that's a story we're proud to tell.",
    name: "Sanjay Thapa",
    role: "Owner",
    business: "Café Mandala",
    location: "Kathmandu",
    initial: "S",
    rating: 5,
  },
  {
    quote:
      "We've worked with many Himalayan tea suppliers. None match Himmat's consistency, traceability, or care in packaging. It practically sells itself.",
    name: "Yuki Tanaka",
    role: "Head Buyer",
    business: "TeaBar",
    location: "Tokyo",
    initial: "Y",
    rating: 5,
  },
  {
    quote:
      "Himmat's wholesale support has made it effortless to introduce Nepalese tea to a London audience. Our regulars are hooked.",
    name: "Charlotte Webb",
    role: "Director",
    business: "The London Tea Room",
    location: "London",
    initial: "C",
    rating: 5,
  },
];

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-[rgba(28,25,23,0.12)] bg-[#f9f7f4] text-[#1c1917] placeholder:text-[#b0aba4] text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/25 focus:border-[#2d5a3d] transition-all";

export default function Wholesale() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState({
    business: "",
    contact: "",
    type: "",
    country: "",
    email: "",
    phone: "",
    volume: "",
    productLines: [] as string[],
    message: "",
  });

  const set =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div
      className="min-h-screen bg-[#f9f7f4]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <Navigation />

      {/* ═══════════════════════════════════════════
          HERO  —  cream white, Collections-style
      ═══════════════════════════════════════════ */}
      <section className="bg-[#f9f7f4] pt-[180px] pb-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Centered page header — identical pattern to Collections */}
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
              Wholesale Partnerships
            </p>
            <h1
              className="text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] font-semibold text-[#1c1917] mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Partner With Godgifted
            </h1>
            <p className="text-xl text-[#78746e] max-w-2xl mx-auto mb-10">
              Supply exceptional Himalayan teas and dals to your customers. We work with
              cafés, hotels, retailers, and restaurants across 12 countries.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="#enquiry-form"
                className="inline-flex items-center gap-2 bg-[#2d5a3d] text-white font-semibold rounded-lg hover:bg-[#244a33] transition-colors"
                style={{
                  padding: "13px 28px",
                  fontSize: "0.9rem",
                  boxShadow: "0 4px 16px rgba(45,90,61,0.18)",
                }}
              >
                Apply for Partnership
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 border border-[rgba(28,25,23,0.18)] text-[#1c1917] font-semibold rounded-lg hover:bg-[#f0ede8] transition-colors"
                style={{ padding: "13px 28px", fontSize: "0.9rem" }}
              >
                Browse Our Products
              </Link>
            </div>
          </div>

          {/* Stats strip — light border treatment */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[rgba(28,25,23,0.08)] rounded-2xl overflow-hidden">
            {stats.map((s) => (
              <div key={s.label} className="bg-white px-8 py-7 text-center">
                <div
                  className="text-[#1c1917] font-bold leading-none mb-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "clamp(1.8rem, 2.8vw, 2.25rem)",
                  }}
                >
                  {s.value}
                </div>
                <div
                  className="text-[#78746e] font-medium"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Hero banner image */}
          <div className="mt-8 rounded-2xl overflow-hidden h-[260px] lg:h-[340px]">
            <img
              src="https://images.unsplash.com/photo-1520201163981-8cc95007dd2a?w=1400&h=500&fit=crop"
              alt="Café wholesale partner"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          PARTNER TYPES  —  light strip
      ═══════════════════════════════════════════ */}
      <section className="bg-white border-b border-[rgba(28,25,23,0.06)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
            <span className="text-xs uppercase tracking-widest text-[#78746e] font-semibold mr-2 hidden sm:inline">
              We supply:
            </span>
            {partnerTypes.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#f9f7f4] border border-[rgba(28,25,23,0.08)] text-[#1c1917] text-sm font-medium"
              >
                <Icon className="h-4 w-4 text-[#2d5a3d]" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          BENEFITS GRID
      ═══════════════════════════════════════════ */}
      <section className="py-24 bg-[#f9f7f4]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="grid lg:grid-cols-[1fr_1.8fr] gap-12 items-end mb-16">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px w-7 bg-[#c8a96e]" />
                <span
                  className="text-[#c8a96e] font-semibold"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                  }}
                >
                  The Godgifted Advantage
                </span>
              </div>
              <h2
                className="font-bold text-[#1c1917] leading-[1.1] tracking-tight"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                }}
              >
                Everything You Need
                <br />
                <span className="text-[#2d5a3d]">to Succeed</span>
              </h2>
            </div>
            <p
              className="text-[#78746e] leading-relaxed"
              style={{ fontSize: "1.0625rem" }}
            >
              Beyond great tea and dals, we give you the tools, pricing, and personal
              support to build a programme your customers will return for,
              again and again.
            </p>
          </div>

          {/* 6-card grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map((b, i) => {
              const Icon = b.icon;
              return (
                <div
                  key={i}
                  className="group bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-7 hover:border-[#2d5a3d]/20 hover:shadow-lg hover:shadow-[#2d5a3d]/05 transition-all duration-300"
                >
                  {/* Icon badge */}
                  <div className="w-11 h-11 rounded-xl bg-[#f0f9f4] flex items-center justify-center mb-5 group-hover:bg-[#2d5a3d] transition-colors duration-300">
                    <Icon className="h-5 w-5 text-[#2d5a3d] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3
                    className="font-semibold text-[#1c1917] mb-2 leading-snug"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "1.0625rem",
                    }}
                  >
                    {b.title}
                  </h3>
                  <p className="text-[#78746e] leading-relaxed text-sm">
                    {b.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          HOW IT WORKS  —  dark green bg
      ═══════════════════════════════════════════ */}
      <section className="bg-[#1a3328] py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="h-px w-7 bg-[#c8a96e]" />
              <span
                className="text-[#c8a96e] font-semibold"
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                }}
              >
                Getting Started
              </span>
              <div className="h-px w-7 bg-[#c8a96e]" />
            </div>
            <h2
              className="font-bold text-white leading-[1.1]"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
              }}
            >
              How the Partnership Works
            </h2>
          </div>

          {/* 3 steps */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-10">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                {/* Connector line (desktop) */}
                {i < steps.length - 1 && (
                  <div
                    className="hidden md:block absolute top-8 left-full w-full h-px opacity-20 -translate-y-px z-0"
                    style={{
                      background:
                        "linear-gradient(to right, #c8a96e, transparent)",
                      width: "calc(100% - 2rem)",
                    }}
                  />
                )}
                {/* Card */}
                <div className="relative z-10 bg-white/05 border border-white/10 rounded-2xl p-7 h-full">
                  {/* Step number */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-full border-2 border-[#c8a96e] flex items-center justify-center shrink-0">
                      <span
                        className="text-[#c8a96e] font-bold"
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: "0.9375rem",
                        }}
                      >
                        {step.number}
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                  <h3
                    className="font-semibold text-white mb-3 leading-snug"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "1.125rem",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-white/55 leading-relaxed text-sm">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Time to start CTA */}
          <div className="text-center mt-12">
            <a
              href="#enquiry-form"
              className="inline-flex items-center gap-2 text-[#c8a96e] font-semibold hover:gap-3 transition-all text-sm"
            >
              Start your application
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          PRICING TABLE
      ═══════════════════════════════════════════ */}
      <section className="py-24 bg-[#f9f7f4]">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="h-px w-7 bg-[#c8a96e]" />
              <span
                className="text-[#c8a96e] font-semibold"
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                }}
              >
                Wholesale Pricing
              </span>
              <div className="h-px w-7 bg-[#c8a96e]" />
            </div>
            <h2
              className="font-bold text-[#1c1917] leading-[1.1] mb-4"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
              }}
            >
              Minimum Orders & Discounts
            </h2>
            <p className="text-[#78746e] max-w-xl mx-auto text-[0.9375rem]">
              Volume-based pricing that rewards your growth. All prices quoted
              ex-works Kathmandu.
            </p>
          </div>

          {/* Table card */}
          <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] overflow-hidden shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-3 bg-[#1a3328] px-6 py-4">
              {["Product Category", "Min. Order Qty", "Wholesale Discount"].map(
                (h) => (
                  <div
                    key={h}
                    className="text-white/60 font-semibold"
                    style={{
                      fontSize: "11px",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </div>
                ),
              )}
            </div>

            {/* Table rows */}
            {pricingRows.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 px-6 py-5 items-center ${
                  i > 0 ? "border-t border-[rgba(28,25,23,0.06)]" : ""
                } ${i === pricingRows.length - 1 ? "bg-[#f9f7f4]" : ""}`}
              >
                <div className="font-semibold text-[#1c1917] flex items-center gap-2">
                  {i === pricingRows.length - 1 && (
                    <BadgeCheck className="h-4 w-4 text-[#2d5a3d]" />
                  )}
                  {row.category}
                </div>
                <div className="text-[#78746e]">{row.moq}</div>
                <div>
                  <span
                    className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-semibold ${row.badge}`}
                  >
                    {row.discount}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-[#78746e] mt-4">
            Custom pricing available for orders exceeding 50 kg/month —{" "}
            <a
              href="#enquiry-form"
              className="text-[#2d5a3d] font-medium hover:underline"
            >
              mention it in your enquiry.
            </a>
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          TESTIMONIALS
      ═══════════════════════════════════════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-14">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px w-7 bg-[#c8a96e]" />
                <span
                  className="text-[#c8a96e] font-semibold"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                  }}
                >
                  Partners Say
                </span>
              </div>
              <h2
                className="font-bold text-[#1c1917] leading-[1.1]"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                }}
              >
                Trusted by Businesses
                <br />
                <span className="text-[#2d5a3d]">Across the World</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#78746e]">
              <Star className="h-4 w-4 text-[#c8a96e] fill-[#c8a96e]" />
              <span className="font-semibold text-[#1c1917]">4.9/5</span>
              <span>average partner satisfaction</span>
            </div>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((item, i) => (
              <div
                key={i}
                className="bg-[#f9f7f4] rounded-2xl border border-[rgba(28,25,23,0.06)] p-7 flex flex-col hover:border-[#2d5a3d]/15 hover:shadow-md transition-all duration-300"
              >
                {/* Stars */}
                <div className="flex gap-0.5 mb-5">
                  {Array.from({ length: item.rating }).map((_, j) => (
                    <Star
                      key={j}
                      className="h-3.5 w-3.5 fill-[#c8a96e] text-[#c8a96e]"
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-[#1c1917] leading-relaxed text-[0.9375rem] flex-1 mb-6">
                  &quot;{item.quote}&quot;
                </p>

                {/* Attribution */}
                <div className="flex items-center gap-3 pt-5 border-t border-[rgba(28,25,23,0.07)]">
                  <div className="w-9 h-9 rounded-full bg-[#2d5a3d] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {item.initial}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1c1917] text-sm leading-tight">
                      {item.name}
                    </p>
                    <p className="text-[#78746e] text-xs mt-0.5">
                      {item.role} · {item.business}, {item.location}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          ENQUIRY FORM  —  split layout
      ═══════════════════════════════════════════ */}
      <section id="enquiry-form" className="py-24 bg-[#f9f7f4]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="bg-white rounded-3xl overflow-hidden border border-[rgba(28,25,23,0.06)] shadow-sm">
            <div className="grid lg:grid-cols-[2fr_3fr]">
              {/* ── Left: summary panel ── */}
              <div
                className="relative p-10 lg:p-14 flex flex-col justify-between"
                style={{ background: "#1a3328" }}
              >
                {/* Subtle pattern */}
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 80% 20%, #c8a96e 0%, transparent 50%), radial-gradient(circle at 20% 80%, #2d5a3d 0%, transparent 50%)",
                  }}
                />

                <div className="relative z-10">
                  {/* Eyebrow */}
                  <div className="flex items-center gap-3 mb-8">
                    <div className="h-px w-7 bg-[#c8a96e]" />
                    <span
                      className="text-[#c8a96e] font-semibold"
                      style={{
                        fontSize: "11px",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                      }}
                    >
                      Apply Now
                    </span>
                  </div>

                  <h2
                    className="font-bold text-white leading-[1.1] mb-4"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "clamp(1.6rem, 2.5vw, 2.1rem)",
                    }}
                  >
                    Start Your Wholesale Partnership
                  </h2>
                  <p className="text-white/55 leading-relaxed text-sm mb-10">
                    Fill out the form and we&apos;ll get back to you within 48 hours
                    with pricing, samples, and next steps.
                  </p>

                  {/* What you get list */}
                  <ul className="space-y-4 mb-10">
                    {[
                      "Personal response within 48 hours",
                      "Free sample kit on approval",
                      "Custom pricing quote",
                      "Dedicated account manager",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#c8a96e]/15 border border-[#c8a96e]/30 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="h-3 w-3 text-[#c8a96e]" />
                        </div>
                        <span className="text-white/65 text-sm leading-relaxed">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom contact */}
                <div className="relative z-10 pt-8 border-t border-white/10">
                  <p className="text-white/35 text-xs uppercase tracking-widest font-medium mb-2">
                    Prefer to talk?
                  </p>
                  <a
                    href="mailto:wholesale@godgifted.com"
                    className="text-[#c8a96e] text-sm font-semibold hover:text-[#d4b876] transition-colors"
                  >
                    wholesale@godgifted.com
                  </a>
                  <p className="text-white/35 text-sm mt-1">+977 1 234 567</p>
                </div>
              </div>

              {/* ── Right: form ── */}
              <div className="p-10 lg:p-14">
                {submitted ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <div className="w-20 h-20 rounded-full bg-[#f0f9f4] border-2 border-[#2d5a3d]/20 flex items-center justify-center mx-auto mb-6">
                      <Check
                        className="h-9 w-9 text-[#2d5a3d]"
                        strokeWidth={2.5}
                      />
                    </div>
                    <h3
                      className="font-bold text-[#1c1917] mb-3"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "1.75rem",
                      }}
                    >
                      Enquiry Received!
                    </h3>
                    <p className="text-[#78746e] leading-relaxed max-w-sm text-[0.9375rem]">
                      Thank you for your interest. Our partnerships team will
                      review your application and respond within 48 business
                      hours.
                    </p>
                    <div className="mt-8 px-6 py-4 bg-[#f0f9f4] rounded-xl text-sm text-[#2d5a3d] font-medium">
                      Check your inbox — we&apos;ve sent a confirmation email.
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setSubmitting(true);
                      setSubmitError("");

                      try {
                        const response = await fetch('/api/partnership', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify(form),
                        });

                        const data = await response.json().catch(() => ({}));

                        if (!response.ok) {
                          throw new Error(data?.error || 'Unable to submit your partnership enquiry. Please try again.');
                        }

                        setSubmitted(true);
                      } catch (error) {
                        setSubmitError(error instanceof Error ? error.message : 'Unable to submit your partnership enquiry. Please try again.');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    className="space-y-5"
                  >
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-[#1c1917] uppercase tracking-wider mb-2">
                          Business Name{" "}
                          <span className="text-[#c8a96e]">*</span>
                        </label>
                        <input
                          value={form.business}
                          onChange={set("business")}
                          placeholder="Your business name"
                          className={inputClass}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#1c1917] uppercase tracking-wider mb-2">
                          Contact Name <span className="text-[#c8a96e]">*</span>
                        </label>
                        <input
                          value={form.contact}
                          onChange={set("contact")}
                          placeholder="Your full name"
                          className={inputClass}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-[#1c1917] uppercase tracking-wider mb-2">
                          Business Type{" "}
                          <span className="text-[#c8a96e]">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={form.type}
                            onChange={set("type")}
                            className={inputClass + " appearance-none pr-10"}
                            required
                          >
                            <option value="" disabled>
                              Select type…
                            </option>
                            <option>Café</option>
                            <option>Restaurant</option>
                            <option>Retailer</option>
                            <option>Hotel / Resort</option>
                            <option>Online Store</option>
                            <option>Distributor</option>
                            <option>Other</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e] pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#1c1917] uppercase tracking-wider mb-2">
                          Country <span className="text-[#c8a96e]">*</span>
                        </label>
                        <input
                          value={form.country}
                          onChange={set("country")}
                          placeholder="e.g. United Kingdom"
                          className={inputClass}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-[#1c1917] uppercase tracking-wider mb-2">
                          Email <span className="text-[#c8a96e]">*</span>
                        </label>
                        <input
                          value={form.email}
                          onChange={set("email")}
                          type="email"
                          placeholder="you@business.com"
                          className={inputClass}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#1c1917] uppercase tracking-wider mb-2">
                          Phone
                        </label>
                        <input
                          value={form.phone}
                          onChange={set("phone")}
                          type="tel"
                          placeholder="+1 555 000 0000"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1c1917] uppercase tracking-wider mb-2">
                        Estimated Monthly Volume
                      </label>
                      <div className="relative">
                        <select
                          value={form.volume}
                          onChange={set("volume")}
                          className={inputClass + " appearance-none pr-10"}
                        >
                          <option value="" disabled>
                            Select volume…
                          </option>
                          <option>Under 1 kg</option>
                          <option>1–5 kg</option>
                          <option>5–20 kg</option>
                          <option>20–50 kg</option>
                          <option>50 kg+</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e] pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1c1917] uppercase tracking-wider mb-2">
                        Product Lines Interested In <span className="text-[#c8a96e]">*</span>
                      </label>
                      <div className="flex flex-wrap gap-4 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.productLines.includes("himmat-tea")}
                            onChange={(e) => {
                              setForm((prev) => ({
                                ...prev,
                                productLines: e.target.checked
                                  ? [...prev.productLines, "himmat-tea"]
                                  : prev.productLines.filter((l) => l !== "himmat-tea"),
                              }));
                            }}
                            className="w-4 h-4 accent-[#2d5a3d]"
                          />
                          <span className="text-sm">Himmat Tea</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.productLines.includes("godgifted-dal")}
                            onChange={(e) => {
                              setForm((prev) => ({
                                ...prev,
                                productLines: e.target.checked
                                  ? [...prev.productLines, "godgifted-dal"]
                                  : prev.productLines.filter((l) => l !== "godgifted-dal"),
                              }));
                            }}
                            className="w-4 h-4 accent-[#b8862f]"
                          />
                          <span className="text-sm">Godgifted Dal</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1c1917] uppercase tracking-wider mb-2">
                        Tell Us About Your Business
                      </label>
                      <textarea
                        value={form.message}
                        onChange={set("message")}
                        placeholder="Which products interest you? Any custom packaging needs? Tell us anything that helps us prepare a tailored quote."
                        rows={4}
                        className={inputClass + " resize-none"}
                      />
                    </div>

                    {submitError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {submitError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full flex items-center justify-center gap-2.5 bg-[#2d5a3d] text-white font-semibold rounded-xl hover:bg-[#244a33] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70"
                      style={{
                        padding: "15px 28px",
                        fontSize: "0.9rem",
                        boxShadow: "0 4px 16px rgba(45,90,61,0.22)",
                      }}
                    >
                      {submitting ? 'Sending enquiry...' : 'Send Wholesale Enquiry'}
                      {!submitting && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
                    </button>

                    <p className="text-center text-xs text-[#78746e] mt-2">
                      We respond to every enquiry personally within 48 hours.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
