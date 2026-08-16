'use client';

import Link from "next/link";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import { useTranslation } from "@/hooks/useTranslation";
import {
  ArrowRight,
  CheckCircle,
  Leaf,
  FlaskConical,
  Package,
  Sprout,
} from "lucide-react";

const steps = [
  {
    number: "01",
    icon: <Sprout className="h-6 w-6" />,
    title: "Garden Selection",
    subtitle: "How we pick partner farms",
    desc: "On-site visits verify altitude, cultivation methods, and labour standards before any partnership begins.",
  },
  {
    number: "02",
    icon: <Leaf className="h-6 w-6" />,
    title: "Harvest & Processing",
    subtitle: "Timing and methods",
    desc: "Hand-plucked at peak flush by experienced farmers to capture the season's brightest flavours.",
  },
  {
    number: "03",
    icon: <FlaskConical className="h-6 w-6" />,
    title: "Quality Testing",
    subtitle: "Cupping and lab tests",
    desc: "Sensory cupping plus third-party lab tests for residues; rejected lots never ship.",
  },
  {
    number: "04",
    icon: <Package className="h-6 w-6" />,
    title: "Packaging & Shipping",
    subtitle: "Eco-friendly, nitrogen-flushed",
    desc: "Nitrogen-flushed pouches, FSC-certified cartons, carbon-offset consolidated freight.",
  },
];

const farms = [
  {
    name: "Guranse Estate",
    region: "Dhankuta, Nepal",
    altitude: "1,600 – 2,000 m",
    specialty: "First-flush black and green",
    desc: "One of Nepal's most celebrated gardens, Guranse Estate sits in the foothills of the Mahabharat Range. Its muscatel-noted blacks and delicate greens are revered by connoisseurs from Tokyo to London.",
    image:
      "https://images.unsplash.com/photo-1464716535967-a81e2fc45b22?w=600&h=400&fit=crop",
  },
  {
    name: "Kanchanjangha Tea Estate",
    region: "Taplejung, Nepal",
    altitude: "2,100 – 2,600 m",
    specialty: "High-altitude green tea",
    desc: "The highest certified-organic tea garden in Nepal, growing in the shadow of Kanchanjangha peak. The extreme elevation produces leaf with exceptional clarity and a clean, mineral sweetness.",
    image:
      "https://images.unsplash.com/photo-1455853828816-0c301a011711?w=600&h=400&fit=crop",
  },
  {
    name: "Ilam Organic Farm",
    region: "Ilam, Nepal",
    altitude: "1,200 – 1,800 m",
    specialty: "Herbal and orthodox",
    desc: "Nestled in Nepal's original tea district, this family-run cooperative blends orthodox grades with wild-harvested Himalayan herbs. The result is a range of wellness teas unlike anything else on the market.",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop",
  },
];

const certifications = [
  {
    name: "Certified Organic",
    body: "USDA / EU Organic",
    icon: "🌿",
    desc: "No synthetic pesticides, herbicides, or fertilizers, ever.",
  },
  {
    name: "Fair Trade",
    body: "FLO-CERT",
    icon: "🤝",
    desc: "Guaranteed fair prices and community premiums for farmers.",
  },
  {
    name: "Rainforest Alliance",
    body: "RA-CERT",
    icon: "🌱",
    desc: "Verified biodiversity protection and sustainable land use.",
  },
  {
    name: "B Corp Pending",
    body: "B Lab",
    icon: "⭐",
    desc: "Undergoing assessment for people, planet, and profit balance.",
  },
];

export default function Sourcing() {
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
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
              Our Sourcing
            </p>
            <h1
              className="text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] font-semibold text-[#1c1917] mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              From Garden to Cup
            </h1>
            <p className="text-xl text-[#78746e] max-w-2xl mx-auto">
              Four checkpoints stand between a Himalayan farm and your cup. Here&apos;s what each one does.
            </p>
            <p className="text-sm text-[#78746e] mt-4">
              <Link href="/about" className="underline hover:text-[#2d5a3d]">About our team →</Link>
            </p>
          </div>

          {/* Hero Image */}
          <div className="rounded-3xl overflow-hidden mb-24 h-[400px] lg:h-[500px]">
            <img
              src="https://images.unsplash.com/photo-1464716535967-a81e2fc45b22?w=1200&h=500&fit=crop"
              alt={t('sourcing.imageAlt')}
              className="w-full h-full object-cover"
            />
          </div>

          {/* The Journey */}
          <div className="mb-24">
            <div className="text-center mb-14">
              <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
                Process
              </p>
              <h2
                className="text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.1] font-semibold text-[#1c1917]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                The Journey
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-6 lg:p-8 flex gap-6"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-[#2d5a3d] flex items-center justify-center text-white">
                      {step.icon}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold text-[#c8a96e] tracking-widest">
                        {step.number}
                      </span>
                      <span className="text-xs uppercase tracking-widest text-[#78746e]">
                        {step.subtitle}
                      </span>
                    </div>
                    <h3
                      className="text-xl font-semibold text-[#1c1917] mb-3"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-[#78746e] leading-relaxed text-sm">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Farm Partners */}
          <div className="mb-24">
            <div className="text-center mb-14">
              <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
                Relationships
              </p>
              <h2
                className="text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.1] font-semibold text-[#1c1917]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Our Farmer Partners
              </h2>
              <p className="text-[#78746e] mt-4 max-w-xl mx-auto">
                These aren&apos;t just suppliers — they&apos;re the craftspeople whose
                hands and knowledge make every cup possible.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {farms.map((farm, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] overflow-hidden group"
                >
                  <div className="h-48 overflow-hidden">
                    <img
                      src={farm.image}
                      alt={farm.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-2">
                      {farm.region}
                    </p>
                    <h3
                      className="text-xl font-semibold text-[#1c1917] mb-1"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {farm.name}
                    </h3>
                    <p className="text-sm text-[#78746e] mb-1">
                      Altitude: {farm.altitude}
                    </p>
                    <p className="text-sm font-medium text-[#2d5a3d] mb-4">
                      Specialty: {farm.specialty}
                    </p>
                    <p className="text-sm text-[#78746e] leading-relaxed mb-5">
                      {farm.desc}
                    </p>
                    <Link
                      href="/products"
                      className="inline-flex items-center gap-2 text-[#2d5a3d] font-medium text-sm hover:gap-3 transition-all"
                    >
                      Shop their teas
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div className="mb-24">
            <div className="text-center mb-14">
              <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
                Standards
              </p>
              <h2
                className="text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.1] font-semibold text-[#1c1917]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Our Certifications
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {certifications.map((cert, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-6 lg:p-8 text-center"
                >
                  <div className="text-4xl mb-4">{cert.icon}</div>
                  <h3
                    className="text-lg font-semibold text-[#1c1917] mb-1"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {cert.name}
                  </h3>
                  <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-3">
                    {cert.body}
                  </p>
                  <p className="text-sm text-[#78746e] leading-relaxed">
                    {cert.desc}
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#2d5a3d]" />
                    <span className="text-xs text-[#2d5a3d] font-medium">
                      Verified
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-[#2d5a3d] rounded-3xl p-10 lg:p-16 text-center">
            <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
              Questions?
            </p>
            <h2
              className="text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] font-semibold text-white mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Have questions about our sourcing?
            </h2>
            <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">
              Our team is happy to answer anything — from the garden a tea came
              from, to the exact test results for your favourite lot.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#c8a96e] text-[#1c1917] font-semibold rounded-xl hover:bg-[#b8995e] transition-colors"
            >
              Contact Us
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
