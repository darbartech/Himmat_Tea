'use client';

import Link from "next/link";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import { useTranslation } from "@/hooks/useTranslation";
import { ArrowRight, Leaf, Handshake, Sparkles } from "lucide-react";
import { BRAND } from "@/config/brand";

const milestones = [
  {
    year: "2018",
    title: "Founded in Kathmandu",
    desc: "Started with a mission to connect Himalayan farmers directly with global buyers.",
  },
  {
    year: "2020",
    title: "First Export to Japan",
    desc: "First-flush Ilam green teas arrived in Tokyo; well-received by specialty buyers.",
  },
  {
    year: "2022",
    title: "Certified Organic",
    desc: "All partner farms earned full organic certification.",
  },
  {
    year: "2024",
    title: "Expanded Product Lines",
    desc: "Launched Godgifted Dal — direct-trade pulses and grains.",
  },
];

const team = [
  {
    name: "Raj Sharma",
    role: "Founder & CEO",
    initials: "RS",
    color: "#2d5a3d",
    bio: "Grew up in the tea gardens of Ilam; 15 years building direct farmer relationships.",
  },
  {
    name: "Priya Gurung",
    role: "Head of Sourcing",
    initials: "PG",
    color: "#c8a96e",
    bio: "Travels Nepal year-round sourcing teas, dals, and grains from partner farms.",
  },
  {
    name: "Aarav Pradhan",
    role: "Head of Operations",
    initials: "AP",
    color: "#78746e",
    bio: "Oversees warehousing, QC, and fulfillment from our Kathmandu facility.",
  },
];

export default function About() {
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
          <div className="text-center mb-20">
            <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
              Our Story
            </p>
            <h1
              className="text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] font-semibold text-[#1c1917] mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              From the Hills of Nepal to Your Table
            </h1>
            <p className="text-xl text-[#78746e] max-w-2xl mx-auto">
              A story of craft, community, and the world's most extraordinary
              natural products.
            </p>
          </div>

          {/* Hero Section */}
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
            <div className="rounded-3xl overflow-hidden aspect-[4/5] lg:aspect-auto lg:h-[560px]">
              <img
                src="https://images.unsplash.com/photo-1455853828816-0c301a011711?w=800&h=700&fit=crop"
                alt={t('about.farmImageAlt')}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-lg text-[#444] leading-relaxed mb-6">
                {BRAND.companyName} started in Kathmandu in 2018 with one goal: connect Himalayan farmers directly with the world, without a middleman in between.
              </p>
              <Link
                href="/sourcing"
                className="inline-flex items-center gap-2 text-[#2d5a3d] font-medium hover:underline"
              >
                See how we vet every farm
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Values Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-24">
            {[
              {
                icon: <Handshake className="h-6 w-6" />,
                title: "Direct Trade",
                desc: "Fair compensation and transparent partnerships with every farm.",
              },
              {
                icon: <Leaf className="h-6 w-6" />,
                title: "Organic & Sustainable",
                desc: "Chemical-free cultivation — for the earth and your family.",
              },
              {
                icon: <Sparkles className="h-6 w-6" />,
                title: "Freshness First",
                desc: "Packed within days of harvest to lock in flavor.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-6 lg:p-8"
              >
                <div className="w-12 h-12 rounded-xl bg-[#f0ede8] flex items-center justify-center text-[#2d5a3d] mb-5">
                  {item.icon}
                </div>
                <h3
                  className="text-xl font-semibold text-[#1c1917] mb-3"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {item.title}
                </h3>
                <p className="text-[#78746e] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Our Journey Timeline */}
          <div className="mb-24">
            <div className="text-center mb-14">
              <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
                Milestones
              </p>
              <h2
                className="text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.1] font-semibold text-[#1c1917]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Our Journey
              </h2>
            </div>
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[rgba(28,25,23,0.08)] hidden lg:block" />
              <div className="space-y-12">
                {milestones.map((m, i) => (
                  <div
                    key={i}
                    className={`flex flex-col lg:flex-row items-center gap-8 ${i % 2 === 1 ? "lg:flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`flex-1 ${i % 2 === 1 ? "lg:text-left" : "lg:text-right"}`}
                    >
                      <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-6 lg:p-8">
                        <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-2">
                          {m.year}
                        </p>
                        <h3
                          className="text-xl font-semibold text-[#1c1917] mb-3"
                          style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                          {m.title}
                        </h3>
                        <p className="text-[#78746e] leading-relaxed">
                          {m.desc}
                        </p>
                      </div>
                    </div>
                    {/* Center dot */}
                    <div className="relative z-10 hidden lg:flex w-10 h-10 rounded-full bg-[#2d5a3d] items-center justify-center flex-shrink-0">
                      <div className="w-3 h-3 rounded-full bg-[#c8a96e]" />
                    </div>
                    <div className="flex-1 hidden lg:block" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Meet the Team */}
          <div className="mb-24">
            <div className="text-center mb-14">
              <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
                The People Behind the Products
              </p>
              <h2
                className="text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.1] font-semibold text-[#1c1917]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Meet the Team
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {team.map((member, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-6 lg:p-8 text-center"
                >
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-semibold mx-auto mb-5"
                    style={{
                      backgroundColor: member.color,
                      fontFamily: "'Playfair Display', serif",
                    }}
                  >
                    {member.initials}
                  </div>
                  <h3
                    className="text-xl font-semibold text-[#1c1917] mb-1"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {member.name}
                  </h3>
                  <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
                    {member.role}
                  </p>
                  <p className="text-[#78746e] leading-relaxed text-sm">
                    {member.bio}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-[#2d5a3d] rounded-3xl p-10 lg:p-16 text-center">
            <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
              Explore Our Products
            </p>
            <h2
              className="text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.1] font-semibold text-white mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Discover Our Product Lines
            </h2>
            <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">
              Two lines, one commitment: quality from farm to cup.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/himmat-tea"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#c8a96e] text-[#1c1917] font-semibold rounded-xl hover:bg-[#b8995e] transition-colors"
              >
                Shop Himmat Tea
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/godgifted-dal"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20"
              >
                Shop Godgifted Dal
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
