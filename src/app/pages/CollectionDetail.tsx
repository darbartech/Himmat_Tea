'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import ProductCard from "@/app/components/ProductCard";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import type { Product } from "@/context/StoreContext";

interface CollectionItem {
  id: number;
  product: Product;
}

interface Collection {
  id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  isActive: boolean;
  items: CollectionItem[];
}

export default function CollectionDetail() {
  const { slug } = useParams<{ slug: string }>();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCollection() {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch('/api/collections');
        if (!res.ok) throw new Error('Failed to load collections');
        const data = await res.json();
        const list: Collection[] = Array.isArray(data) ? data : data.data || [];
        const match = list.find((c) => c.slug === slug);
        if (cancelled) return;
        if (!match) {
          setNotFound(true);
          setCollection(null);
        } else {
          setCollection(match);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (slug) loadCollection();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div
        className="min-h-screen bg-[#f9f7f4]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <Navigation />
        <main className="pt-[180px] pb-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#2d5a3d]" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !collection) {
    return (
      <div
        className="min-h-screen bg-[#f9f7f4]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <Navigation />
        <main className="pt-[180px] pb-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
            <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
              404
            </p>
            <h1
              className="text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] font-semibold text-[#1c1917] mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Collection Not Found
            </h1>
            <p className="text-xl text-[#78746e] mb-10">
              We couldn't find a collection called "{slug}". Browse all our
              collections below.
            </p>
            <Link
              href="/collections"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#2d5a3d] text-white font-semibold rounded-xl hover:bg-[#234832] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              All Collections
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const products = collection.items.map((item) => item.product);

  return (
    <div
      className="min-h-screen bg-[#f9f7f4]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <Navigation />
      <main className="pt-[180px] pb-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Back link + Header */}
          <div className="mb-16">
            <Link
              href="/collections"
              className="inline-flex items-center gap-2 text-[#78746e] hover:text-[#2d5a3d] transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              All Collections
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
                  Collection
                </p>
                <h1
                  className="text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] font-semibold text-[#1c1917] mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {collection.title}
                </h1>
                <p className="text-xl text-[#78746e] max-w-xl">
                  {collection.description}
                </p>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {products.length === 0 ? (
            <p className="text-center text-[#78746e] mb-16">
              No products have been added to this collection yet.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Browse more CTA */}
          <div className="text-center">
            <p className="text-[#78746e] mb-4">
              Looking for something different?
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#2d5a3d] text-white font-semibold rounded-xl hover:bg-[#234832] transition-colors"
            >
              Browse All Teas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
