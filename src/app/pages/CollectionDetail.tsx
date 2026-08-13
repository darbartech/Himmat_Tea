'use client';

import Link from "next/link";
import { useParams } from "next/navigation";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import { useTranslation } from "@/hooks/useTranslation";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";

const collections: Record<
  string,
  { title: string; desc: string; badge?: string }
> = {
  seasonal: {
    title: "Seasonal Picks",
    desc: "Hand-selected teas that celebrate each season's finest harvests.",
    badge: "Spring 2026",
  },
  wellness: {
    title: "Wellness Range",
    desc: "Blends crafted for mindfulness, energy, and inner balance.",
    badge: "Bestseller",
  },
  "gift-sets": {
    title: "Gift Sets",
    desc: "Beautiful curated sets, perfectly presented for gifting.",
    badge: "Popular",
  },
  "single-origin": {
    title: "Single Origin",
    desc: "Pure teas from a single estate, unblended and terroir-forward.",
  },
  himalayan: {
    title: "Himalayan Selection",
    desc: "Exclusively sourced from Nepal's legendary tea-growing regions.",
    badge: "Exclusive",
  },
  organic: {
    title: "Certified Organic",
    desc: "Every cup is certified organic, traceable, and chemical-free.",
  },
};

const products = [
  {
    id: "premium-green-tea",
    name: "Ilam First Flush Green",
    origin: "Ilam, Nepal",
    price: 499,
    weight: "50g",
    image:
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&h=400&fit=crop",
    badge: "New Season",
  },
  {
    id: "royal-assam-black",
    name: "Himalayan Black Reserve",
    origin: "Dhankuta, Nepal",
    price: 599,
    weight: "50g",
    image:
      "https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=600&h=400&fit=crop",
    badge: "",
  },
  {
    id: "silver-needle-white",
    name: "Kanchanjangha Silver Tip",
    origin: "Taplejung, Nepal",
    price: 899,
    weight: "25g",
    image:
      "https://images.unsplash.com/photo-1464716535967-a81e2fc45b22?w=600&h=400&fit=crop",
    badge: "Rare",
  },
  {
    id: "jasmine-pearl",
    name: "Mountain Chamomile Blend",
    origin: "Ilam, Nepal",
    price: 399,
    weight: "40g",
    image:
      "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&h=400&fit=crop",
    badge: "",
  },
  {
    id: "oolong-supreme",
    name: "Organic Oolong Garden",
    origin: "Dhankuta, Nepal",
    price: 699,
    weight: "50g",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop",
    badge: "Bestseller",
  },
  {
    id: "masala-chai-spice",
    name: "Spiced Masala Chai",
    origin: "Ilam, Nepal",
    price: 449,
    weight: "75g",
    image:
      "https://images.unsplash.com/photo-1455853828816-0c301a011711?w=600&h=400&fit=crop",
    badge: "",
  },
];

export default function CollectionDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();

  const collection = slug ? collections[slug] : null;

  if (!collection) {
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
                <div className="flex items-center gap-3 mb-4">
                  <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium">
                    Collection
                  </p>
                  {collection.badge && (
                    <span className="px-3 py-1 bg-[#c8a96e] text-[#1c1917] text-xs font-semibold rounded-full uppercase tracking-widest">
                      {collection.badge}
                    </span>
                  )}
                </div>
                <h1
                  className="text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] font-semibold text-[#1c1917] mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {collection.title}
                </h1>
                <p className="text-xl text-[#78746e] max-w-xl">
                  {collection.desc}
                </p>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] overflow-hidden group relative"
              >
                <Link href={`/products/${product.id}`} className="block">
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {product.badge && (
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 bg-[#c8a96e] text-[#1c1917] text-xs font-semibold rounded-full">
                          {product.badge}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <p className="text-xs uppercase tracking-widest text-[#78746e] mb-1">
                      {product.origin}
                    </p>
                    <h3
                      className="text-xl font-semibold text-[#1c1917] mb-3"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xl font-semibold text-[#1c1917]">
                          {formatPrice(product.price)}
                        </span>
                        <span className="text-sm text-[#78746e] ml-2">
                          / {product.weight}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
                {/* Add to Cart button outside link to prevent conflict */}
                <div className="px-6 pb-6">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addToCart({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        image: product.image,
                        weight: product.weight,
                      });
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#2d5a3d] text-white text-sm font-medium rounded-xl hover:bg-[#234832] transition-colors"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>

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
