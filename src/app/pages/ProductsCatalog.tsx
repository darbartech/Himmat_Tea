'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import { useTranslation } from "@/hooks/useTranslation";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCurrency } from "@/context/CurrencyContext";
import { Search, ShoppingBag, Star, ArrowRight, Heart } from "lucide-react";
import { notify } from "@/lib/notify";
import { BRAND } from "@/config/brand";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface ProductLine {
  id: number | string;
  name: string;
  slug: string;
  isActive?: boolean;
  color?: string;
  [key: string]: unknown;
}
interface ProductVariant {
  id: number;
  [key: string]: unknown;
}
interface ProductBatch {
  id: number;
  [key: string]: unknown;
}
interface ProductReview {
  rating: number;
  [key: string]: unknown;
}
interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  description: string;
  imageUrl: string;
  sku?: string;
  reorderPoint?: number;
  hasVariants: boolean;
  variantOptions?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  productVariants: ProductVariant[];
  batches: ProductBatch[];
  reviews: ProductReview[];
  productLine?: string;
  productLineId?: number | string;
  isBestseller?: boolean;
}

const filterTabs = (productLines: ProductLine[]) => [
  { key: "all", label: "All Products" },
  ...productLines.filter(pl => pl.isActive).map(pl => ({ key: pl.slug, label: pl.name })),
];

const tagStyles: Record<string, string> = {
  Bestseller: "bg-[#2d5a3d] text-white",
  Seasonal: "bg-[#c8a96e] text-[#1c1917]",
  New: "bg-[#1c1917] text-white",
  Reserve: "bg-[#78746e] text-white",
  Premium: "bg-[#c8a96e] text-[#1c1917]",
  Popular: "bg-[#2d5a3d] text-white",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= Math.round(rating)
              ? "fill-[#c8a96e] text-[#c8a96e]"
              : "text-[#e8e4de] fill-[#e8e4de]"
          }`}
        />
      ))}
    </div>
  );
}

const ITEMS_PER_PAGE = 8;

export default function ProductsCatalog() {
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { formatPrice } = useCurrency();
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("featured");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: allProducts = [], isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get<Product[] | { data?: Product[] }>('/products');
      const arr = (response as { data?: Product[] }).data ?? (response as Product[]);
      return arr;
    }
  });

  const { data: productLines = [], isLoading: productLinesLoading } = useQuery({
    queryKey: ['product-lines'],
    queryFn: async () => {
      const response = await api.get<ProductLine[] | { data?: ProductLine[] }>('/product-lines');
      const arr = (response as { data?: ProductLine[] }).data ?? (response as ProductLine[]);
      return arr;
    }
  });

  function handleWishlistClick(product: Product, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const productData = {
      id: product.id.toString(),
      name: product.name,
      price: product.price,
      image: product.imageUrl,
      origin: product.category,
    };
    if (isInWishlist(product.id.toString())) {
      removeFromWishlist(product.id.toString());
      notify.success(`${product.name} removed from wishlist!`);
    } else {
      addToWishlist(productData);
      notify.success(`${product.name} added to wishlist!`);
    }
  }

  const filtered = useMemo(() => {
    let list = allProducts.filter((p: Product) => {
      const productLineForProduct = productLines.find((pl: ProductLine) => pl.id === p.productLineId);
      const matchFilter = filter === "all" || 
        productLineForProduct?.slug === filter || 
        p.productLine === productLines.find((pl: ProductLine) => pl.slug === filter)?.name;
      const matchSearch =
        search.trim() === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });

    if (sort === "price-asc")
      list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "price-desc")
      list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "rating") {
      list = [...list].sort((a, b) => {
        const aRating = a.reviews.length > 0 ? a.reviews.reduce((sum: number, r: ProductReview) => sum + r.rating, 0) / a.reviews.length : 0;
        const bRating = b.reviews.length > 0 ? b.reviews.reduce((sum: number, r: ProductReview) => sum + r.rating, 0) / b.reviews.length : 0;
        return bRating - aRating;
      });
    }

    return list;
  }, [filter, sort, search, allProducts, productLines]);

  const paginated = filtered.slice(0, page * ITEMS_PER_PAGE);
  const hasMore = filtered.length > paginated.length;

  function handleAddToCart(product: Product) {
    addToCart({
      id: product.id.toString(),
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.imageUrl,
      weight: "50g",
    });
    notify.success("Added to cart!");
  }

  const getAverageRating = (product: Product) => {
    const reviews = product.reviews || [];
    return reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 4.5;
  };

  return (
    <div
      className="min-h-screen bg-[#f9f7f4]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <Navigation />
      <main className="pt-[180px] pb-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* ── Page Header ── */}
          <div className="mb-12">
            <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-semibold mb-4">
              Our Collection
            </p>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1
                  className="text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] font-semibold text-[#1c1917] mb-3"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Explore Our Products
                </h1>
                <p className="text-[#78746e] text-lg max-w-xl">
                  {BRAND.tagline} Handpicked products from trusted partners across
                  the Himalayas and beyond.
                </p>
              </div>
              <p className="text-sm text-[#78746e] shrink-0">
                Showing{" "}
                <span className="font-semibold text-[#1c1917]">
                  {filtered.length}
                </span>{" "}
                {filtered.length === 1 ? "product" : "products"}
              </p>
            </div>
          </div>

          {/* ── Filters Row ── */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-10">
            {/* Type filter tabs */}
            <div className="flex flex-wrap gap-2">
              {filterTabs(productLines).map((tab) => {
                const pl = productLines.find((p: ProductLine) => p.slug === tab.key);
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setFilter(tab.key);
                      setPage(1);
                    }}
                    className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                      filter === tab.key
                        ? "text-white shadow-sm"
                        : "bg-white text-[#1c1917] border border-[rgba(28,25,23,0.08)] hover:bg-[#f0ede8]"
                    }`}
                    style={filter === tab.key && pl ? { backgroundColor: pl.color || "#2d5a3d" } : undefined}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search + Sort */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e]" />
                <input
                  type="text"
                  placeholder={t('products.searchPlaceholder')}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-[rgba(28,25,23,0.08)] text-sm focus:outline-none focus:border-[#2d5a3d] transition-colors"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-4 py-2.5 bg-white rounded-xl border border-[rgba(28,25,23,0.08)] text-sm focus:outline-none focus:border-[#2d5a3d] cursor-pointer"
              >
                <option value="featured">{t('products.sort.featured')}</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
                <option value="rating">{t('products.sort.topRated')}</option>
              </select>
            </div>
          </div>

          {/* ── Product Grid ── */}
          {paginated.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl border border-[rgba(28,25,23,0.06)]">
              <p className="text-5xl mb-5">🛍️</p>
              <h3
                className="text-xl font-semibold text-[#1c1917] mb-2"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                No products found for this filter
              </h3>
              <p className="text-[#78746e] mb-7">
                Try adjusting your filters or search term.
              </p>
              <button
                onClick={() => {
                  setFilter("all");
                  setSearch("");
                }}
                className="px-7 py-2.5 bg-[#2d5a3d] text-white rounded-xl text-sm font-medium hover:bg-[#234832] transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {paginated.map((product: Product) => {
                const rating = getAverageRating(product);
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] overflow-hidden group hover:shadow-lg transition-shadow duration-300"
                  >
                    {/* Image */}
                    <Link
                      href={`/products/${product.id}`}
                      className="block relative overflow-hidden"
                    >
                      <div className="aspect-square">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      {/* Wishlist button */}
                      <button
                        onClick={(e) => handleWishlistClick(product, e)}
                        className={`absolute top-3 right-3 p-2 rounded-full bg-white shadow-md transition-all ${
                          isInWishlist(product.id.toString())
                            ? "text-[#c8a96e] hover:bg-[#c8a96e]/10"
                            : "text-[#78746e] hover:text-[#c8a96e]"
                        }`}
                        title={isInWishlist(product.id.toString()) ? "Remove from Wishlist" : "Add to Wishlist"}
                      >
                        <Heart className="h-5 w-5" fill={isInWishlist(product.id.toString()) ? "currentColor" : "none"} />
                      </button>
                    </Link>

                    {/* Info */}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs text-[#c8a96e] font-semibold uppercase tracking-wide">
                          {product.category}
                        </p>
                        {product.isBestseller && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#2d5a3d] text-white">
                            Bestseller
                          </span>
                        )}
                      </div>
                      <Link href={`/products/${product.id}`}>
                        <h3
                          className="text-[15px] font-semibold text-[#1c1917] mb-2.5 group-hover:text-[#2d5a3d] transition-colors leading-snug"
                          style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                          {product.name}
                        </h3>
                      </Link>

                      <div className="flex items-center gap-2 mb-3">
                        <StarRating rating={rating} />
                        <span className="text-xs text-[#78746e]">
                          {rating.toFixed(1)} ({(product.reviews || []).length})
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xl font-bold text-[#2d5a3d]">
                          {formatPrice(product.price)}
                        </p>
                        <p className="text-xs text-[#78746e] bg-[#f0ede8] px-2.5 py-0.5 rounded-full">
                          50g
                        </p>
                      </div>

                      <button
                        onClick={() => handleAddToCart(product)}
                        className="w-full py-2.5 bg-[#2d5a3d] text-white text-sm font-medium rounded-xl hover:bg-[#234832] transition-colors flex items-center justify-center gap-2"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Add to Cart
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="mt-12 text-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-10 py-3.5 border-2 border-[#2d5a3d] text-[#2d5a3d] font-semibold rounded-xl hover:bg-[#2d5a3d] hover:text-white transition-all"
              >
                Load More Products
              </button>
            </div>
          )}

          {/* ── Wholesale CTA Banner ── */}
          <div className="mt-20 bg-[#2d5a3d] rounded-2xl p-10 lg:p-14 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div>
              <p className="text-[#c8a96e] text-xs uppercase tracking-widest font-semibold mb-2">
                For Businesses
              </p>
              <h2
                className="text-2xl lg:text-3xl font-semibold text-white mb-3"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Looking for bulk orders?
              </h2>
              <p className="text-white/70 max-w-md leading-relaxed">
                Partner with {BRAND.companyName} for bulk orders, custom blends, and
                exclusive pricing for restaurants, hotels, and retailers.
              </p>
            </div>
            <Link
              href="/wholesale"
              className="shrink-0 inline-flex items-center gap-2 px-8 py-4 bg-[#c8a96e] text-[#1c1917] font-semibold rounded-xl hover:bg-[#b8945a] transition-colors whitespace-nowrap"
            >
              Explore Wholesale
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
