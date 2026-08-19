'use client';

import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { BRAND } from '@/config/brand';
import Navigation from '@/app/components/Navigation';
import Footer from '@/app/components/Footer';
import { useStore } from '@/context/StoreContext';
import ProductCard from '@/app/components/ProductCard';

type PlCategory = {
  id: string;
  name: string;
  description: string;
  image: string;
};

function toTitleCase(s: string) {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function normalizeCategory(cat: any): PlCategory | null {
  if (!cat) return null;
  const id = String(cat.id ?? cat.name ?? '').trim();
  const name = String(cat.name ?? toTitleCase(id)).trim();
  if (!id || !name) return null;
  return {
    id,
    name,
    description: String(cat.description ?? '').trim(),
    image: String(cat.image ?? '').trim(),
  };
}

export default function ProductLine({ slug }: { slug: string }) {
  const { products, productLines } = useStore();
  const productLine = productLines.find(pl => pl.slug === slug);

  if (!productLine) {
    notFound();
  }

  const lineColor = productLine.color || '#2d5a3d';

  const rawCats: any[] = Array.isArray(productLine.categories)
    ? productLine.categories
    : [];
  const adminCategories: PlCategory[] = rawCats
    .map(normalizeCategory)
    .filter(Boolean) as PlCategory[];

  const allLineProducts = products.filter(
    (p) => p.productLineId === productLine.id && (p.isActive !== false)
  );

  const categoriesMap = new Map<string, PlCategory>();
  adminCategories.forEach(c => categoriesMap.set(c.id, c));
  allLineProducts.forEach(p => {
    const key = (p.category || '').trim();
    if (!key) return;
    if (!categoriesMap.has(key)) {
      categoriesMap.set(key, {
        id: key,
        name: toTitleCase(key),
        description: '',
        image: '',
      });
    }
  });
  const orderedCategories: PlCategory[] = [
    ...adminCategories,
    ...Array.from(categoriesMap.values()).filter(
      c => !adminCategories.some(a => a.id === c.id)
    ),
  ];

  const productsByCategory = new Map<string, typeof allLineProducts>();
  allLineProducts.forEach(p => {
    const key = (p.category || 'uncategorized').trim();
    const arr = productsByCategory.get(key) || [];
    arr.push(p);
    productsByCategory.set(key, arr);
  });

  const heroHeadline = productLine.heroHeadline || productLine.name;

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Navigation />

      <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-32 pb-2">
          <div className="flex items-center gap-2 text-sm text-[#5c5a57]">
            <Link href="/" className="hover:underline" style={{ color: lineColor }}>
              {BRAND.companyName}
            </Link>
            <span>/</span>
            <span className="font-semibold" style={{ color: lineColor }}>
              {productLine.name}
            </span>
          </div>
        </div>

        <section
          className="relative py-10 lg:py-16"
          style={{ background: `linear-gradient(to bottom right, ${lineColor}08, transparent)` }}
        >
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
                      background: `linear-gradient(to right, #c8a96e, rgba(200,169,110,0.25))`,
                    }}
                  />
                  <span
                    className="font-semibold"
                    style={{
                      fontSize: "11px",
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: "#c8a96e",
                    }}
                  >
                    {productLine.name}
                  </span>
                </div>

                <h1
                  className="text-[#1a1917] font-bold tracking-tight mb-6"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "clamp(2.5rem, 4vw, 3.5rem)",
                    lineHeight: "1.1",
                  }}
                >
                  {heroHeadline}
                </h1>

                <p className="text-[#5c5a57] mb-8 max-w-lg" style={{ fontSize: "1.125rem", lineHeight: "1.8" }}>
                  {productLine.description}
                </p>

                <Link
                  href="/products"
                  className="group inline-flex items-center gap-2.5 rounded-lg text-white font-semibold hover:opacity-90 transition-all duration-200"
                  style={{
                    backgroundColor: lineColor,
                    fontSize: "0.875rem",
                    padding: "14px 28px",
                    boxShadow: `0 4px 18px ${lineColor}38`,
                  }}
                >
                  Shop {productLine.name}
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                    strokeWidth={2.5}
                  />
                </Link>
              </div>
              {productLine.heroImage && (
                <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-[rgba(26,25,23,0.08)] shadow-2xl">
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

        {orderedCategories.length > 0 && (
          <section className="py-20 bg-[#faf8f5]">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2
                  className="text-[#1a1917] font-bold tracking-tight mb-4"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "clamp(1.75rem, 2.8vw, 2.5rem)",
                  }}
                >
                  Explore our {productLine.name.toLowerCase()} categories
                </h2>
                <p className="text-[#5c5a57] max-w-2xl mx-auto" style={{ fontSize: "1.0625rem", lineHeight: "1.8" }}>
                  From everyday favourites to speciality selections, find the perfect pick for every occasion.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {orderedCategories.map((cat) => {
                  const count = (productsByCategory.get(cat.id) || []).length;
                  const catImage = cat.image || productLine.heroImage || '';
                  return (
                    <Link
                      key={cat.id}
                      href={`/products?category=${encodeURIComponent(cat.id)}`}
                      className="group relative rounded-xl overflow-hidden border border-[rgba(26,25,23,0.08)] hover:shadow-lg transition-all duration-300"
                    >
                      <div className="aspect-[4/3] relative overflow-hidden bg-[#f0ede8]">
                        {catImage ? (
                          <img
                            src={catImage}
                            alt={cat.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${lineColor}14` }}>
                            <span style={{ color: lineColor, fontFamily: "'Playfair Display', serif", fontSize: "2rem" }}>
                              {cat.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1917]/70 via-transparent to-transparent" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <h3 className="text-white font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                          {cat.name}
                        </h3>
                        <p className="text-white/90 text-sm">
                          {cat.description || (count > 0 ? `${count} product${count === 1 ? '' : 's'}` : 'Browse our selection')}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {orderedCategories.map((cat) => {
          const catProducts = productsByCategory.get(cat.id) || [];
          if (catProducts.length === 0) return null;
          return (
            <section key={cat.id} className="py-20">
              <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
                  <div>
                    <div
                      className="flex items-center gap-3 mb-3"
                    >
                      <div
                        aria-hidden
                        style={{
                          width: "24px",
                          height: "2px",
                          borderRadius: "2px",
                          background: `linear-gradient(to right, ${lineColor}, ${lineColor}40)`,
                        }}
                      />
                      <span
                        className="font-semibold"
                        style={{
                          fontSize: "10.5px",
                          letterSpacing: "0.20em",
                          textTransform: "uppercase",
                          color: lineColor,
                        }}
                      >
                        Category
                      </span>
                    </div>
                    <h2
                      className="text-[#1a1917] font-bold"
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "clamp(1.75rem, 2.6vw, 2.25rem)",
                      }}
                    >
                      {cat.name}
                    </h2>
                    {cat.description && (
                      <p className="text-[#5c5a57] mt-2 max-w-2xl" style={{ fontSize: "1rem", lineHeight: "1.7" }}>
                        {cat.description}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/products?category=${encodeURIComponent(cat.id)}`}
                    className="group inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                    style={{ color: lineColor }}
                  >
                    View all {catProducts.length}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {catProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        {orderedCategories.length === 0 && allLineProducts.length > 0 && (
          <section className="py-16">
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
                {allLineProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </section>
        )}

        {allLineProducts.length === 0 && (
          <section className="py-20">
            <div className="max-w-2xl mx-auto px-6 text-center">
              <div
                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ backgroundColor: `${lineColor}10` }}
              >
                <span style={{ color: lineColor, fontFamily: "'Playfair Display', serif", fontSize: "2rem" }}>
                  {productLine.name.charAt(0)}
                </span>
              </div>
              <h2
                className="text-[#1a1917] font-bold mb-3"
                style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem" }}
              >
                Products coming soon
              </h2>
              <p className="text-[#5c5a57]" style={{ lineHeight: "1.8" }}>
                We're curating a beautiful {productLine.name.toLowerCase()} collection. Check back soon, or explore our full range in the meantime.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 mt-8 rounded-lg font-semibold text-white transition-all"
                style={{ backgroundColor: lineColor, padding: "12px 26px", fontSize: "0.875rem" }}
              >
                Browse All Products
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        )}

        {productLine.ctaTitle && (
          <section
            className="py-20"
            style={{ background: `${lineColor}08` }}
          >
            <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
              <h2
                className="text-[#1a1917] font-bold tracking-tight mb-4"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(1.75rem, 2.8vw, 2.5rem)",
                }}
              >
                {productLine.ctaTitle}
              </h2>
              {productLine.ctaDescription && (
                <p className="text-[#5c5a57] mb-8 max-w-2xl mx-auto" style={{ fontSize: "1.0625rem", lineHeight: "1.8" }}>
                  {productLine.ctaDescription}
                </p>
              )}
              {productLine.ctaLinkText && productLine.ctaLink && (
                <Link
                  href={productLine.ctaLink}
                  className="group inline-flex items-center gap-2.5 rounded-lg font-semibold transition-all duration-200 text-[#1a1917] hover:opacity-90"
                  style={{
                    backgroundColor: '#c8a96e',
                    fontSize: "0.875rem",
                    padding: "14px 28px",
                  }}
                >
                  {productLine.ctaLinkText}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              )}
            </div>
          </section>
        )}
      </div>

      <Footer />
    </div>
  );
}
