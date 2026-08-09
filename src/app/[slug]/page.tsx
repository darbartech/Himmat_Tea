'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { BRAND } from '@/config/brand';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import { useStore } from '@/context/StoreContext';
import ProductCard from '@/app/components/ProductCard';

export default function ProductLinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { products, productLines } = useStore();
  const productLine = productLines.find(pl => pl.slug === slug);
  
  if (!productLine) {
    notFound();
  }

  const productLineProducts = products.filter(
    (p) => p.productLineId === productLine.id
  );

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Navigation />

      {/* Hero */}
      <section className="pt-32 pb-16" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-6">
                <div
                  aria-hidden
                  style={{
                    width: "28px",
                    height: "2px",
                    borderRadius: "2px",
                    background: `linear-gradient(to right, ${productLine.color}, ${productLine.color}40)`,
                  }}
                />
                <span
                  className="font-semibold"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: productLine.color,
                  }}
                >
                  {BRAND.companyName}
                </span>
              </div>

              <h1
                className="text-[#1a1917] font-bold tracking-tight mb-4"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(2.5rem, 4vw, 3.5rem)",
                }}
              >
                {productLine.name}
              </h1>

              <p className="text-[#5c5a57] mb-8" style={{ fontSize: "1.125rem", lineHeight: "1.8" }}>
                {productLine.description}
              </p>

              <Link
                href="/products"
                className="inline-flex items-center gap-2.5 rounded-lg text-white font-semibold transition-all duration-200"
                style={{
                  backgroundColor: productLine.color,
                  fontSize: "0.875rem",
                  padding: "14px 28px",
                  boxShadow: `0 4px 18px ${productLine.color}38`,
                }}
              >
                Browse All Products
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {productLine.heroImage && (
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-[rgba(26,25,23,0.08)]">
                <img
                  src={productLine.heroImage}
                  alt={productLine.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Products grid */}
      {productLineProducts.length > 0 && (
        <section className="py-16" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <h2
              className="text-[#1a1917] font-bold mb-10"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.875rem",
              }}
            >
              Featured Products
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {productLineProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
