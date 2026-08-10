'use client';

import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface ProductLine {
  id: number;
  name: string;
  slug: string;
  description: string;
  heroImage?: string | null;
  [key: string]: any;
}

export default function ProductLinesShowcase({ productLines }: { productLines: ProductLine[] }) {
  const activeProductLines = productLines;

  return (
    <section className="py-20 bg-[#faf8f5]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div
              aria-hidden
              style={{
                width: "28px",
                height: "2px",
                borderRadius: "2px",
                background:
                  "linear-gradient(to right, #c8a96e, rgba(200,169,110,0.25))",
              }}
            />
            <span
              className="text-[#c8a96e] font-semibold"
              style={{
                fontSize: "11px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              Our Product Lines
            </span>
          </div>
          <h2
            className="text-[#1a1917] font-bold tracking-tight mb-4"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(2rem, 3.2vw, 2.8rem)",
            }}
          >
            Discover our range of premium products
          </h2>
          <p className="text-[#5c5a57] max-w-2xl mx-auto" style={{ fontSize: "1.0625rem", lineHeight: "1.8" }}>
            From Himalayan teas to wholesome dals, we bring you pure, traceable products
            directly from trusted farmers.
          </p>
        </div>

        {/* Product lines grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {activeProductLines.map((line) => (
            <Link
              key={line.id}
              href={`/${line.slug}`}
              className="group relative rounded-2xl overflow-hidden border border-[rgba(26,25,23,0.08)] hover:shadow-xl transition-all duration-300"
            >
              <div className="aspect-[4/3] relative overflow-hidden">
                <img
                  src={
                    line.heroImage || (
                      line.slug === "himmat-tea"
                        ? "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=600&fit=crop"
                        : "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop"
                    )
                  }
                  alt={line.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1917]/70 via-transparent to-transparent" />
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <h3
                  className="text-white font-bold mb-3"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "1.875rem",
                  }}
                >
                  {line.name}
                </h3>
                <p className="text-white/90 mb-6" style={{ fontSize: "1rem", lineHeight: "1.7" }}>
                  {line.description}
                </p>
                <div className="flex items-center gap-2 text-white font-semibold">
                  Shop Now
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
