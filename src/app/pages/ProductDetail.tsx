'use client';

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import { useTranslation } from "@/hooks/useTranslation";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  Star,
  ShoppingBag,
  Heart,
  ArrowRight,
  ChevronRight,
  Thermometer,
  Clock,
  Droplets,
  StickyNote,
  Leaf,
  Truck,
  RotateCcw,
  Share2,
  Facebook,
  Twitter,
  MessageCircle,
  Copy,
  Linkedin,
  Instagram,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { BRAND } from "@/config/brand";

// ─── Brew guide by tea type ───────────────────────────────────────────────────
const brewGuideByType: Record<
  string,
  { temp: string; time: string; ratio: string; notes: string }
> = {
  green: {
    temp: "80°C",
    time: "2 min",
    ratio: "1:60",
    notes:
      "Avoid boiling water — it scorches delicate leaves and adds bitterness",
  },
  black: {
    temp: "95°C",
    time: "3–4 min",
    ratio: "1:50",
    notes: "Wonderful with a splash of milk or a drizzle of local honey",
  },
  oolong: {
    temp: "90°C",
    time: "3 min",
    ratio: "1:50",
    notes: "Re-steep 3–5 times; flavour deepens and evolves with each brew",
  },
  herbal: {
    temp: "98°C",
    time: "5 min",
    ratio: "1:60",
    notes: "Caffeine-free and perfect for evening relaxation rituals",
  },
  white: {
    temp: "75°C",
    time: "2–3 min",
    ratio: "1:70",
    notes: "Lower temperature preserves the delicate floral and honey notes",
  },
};

const weightMultipliers: Record<string, number> = {
  "25g": 0.5,
  "50g": 1.0,
  "100g": 1.85,
};

function StarRating({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const cls = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${cls} ${
            i <= Math.round(rating)
              ? "fill-[#c8a96e] text-[#c8a96e]"
              : "fill-[#e8e4de] text-[#e8e4de]"
          }`}
        />
      ))}
    </div>
  );
}

// Define product type matching Prisma schema
interface ProductVariant {
  id: number;
  [key: string]: unknown;
}
interface ProductBatch {
  id: number;
  [key: string]: unknown;
}
interface ProductReview {
  id?: number;
  rating: number;
  name?: string;
  initials?: string;
  date?: string;
  comment?: string;
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
  isBestseller?: boolean;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useRouter();
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { formatPrice } = useCurrency();

  const [activeImage, setActiveImage] = useState(0);
  const [selectedWeight, setSelectedWeight] = useState("50g");
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const [shareAnalytics, setShareAnalytics] = useState<Record<string, number>>({});

  const { data: allProducts = [], isLoading: loading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get<Product[] | { data?: Product[] }>('/products');
      const arr = (response as { data?: Product[] }).data ?? (response as Product[]);
      return arr;
    }
  });

  const productId = parseInt(id as string);
  const product = allProducts.find((p: Product) => p.id === productId) || null;
  const relatedProducts = allProducts.filter((p: Product) => p.id !== productId).slice(0, 3);

  // Track share clicks for analytics
  function trackShare(platform: string) {
    setShareAnalytics(prev => ({
      ...prev,
      [platform]: (prev[platform] || 0) + 1
    }));
    console.log(`Share tracked: ${platform}`, {
      productId: id,
      productName: product?.name,
      platform,
      timestamp: new Date().toISOString()
    });
  }

  async function handleShare(platform: string) {
    trackShare(platform);
    const currentProductUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareText = `Check out ${product?.name} from ${BRAND.companyName}!`;
    let shareUrl = "";

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentProductUrl)}`;
        if (typeof window !== 'undefined') {
          window.open(shareUrl, "_blank", "noopener,noreferrer");
        }
        break;

      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(currentProductUrl)}`;
        if (typeof window !== 'undefined') {
          window.open(shareUrl, "_blank", "width=600,height=400,noopener,noreferrer");
        }
        break;

      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentProductUrl)}`;
        if (typeof window !== 'undefined') {
          window.open(shareUrl, "_blank", "width=600,height=400,noopener,noreferrer");
        }
        break;

      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText + " " + currentProductUrl)}`;
        if (typeof window !== 'undefined') {
          window.open(shareUrl, "_blank", "noopener,noreferrer");
        }
        break;

      case "copy":
        if (typeof navigator !== 'undefined' && typeof navigator.clipboard !== 'undefined') {
          await navigator.clipboard.writeText(currentProductUrl);
          setCopied(true);
          toast.success("Link copied to clipboard!");
          setTimeout(() => setCopied(false), 2000);
        }
        break;

      case "native":
        if (typeof navigator !== 'undefined' && navigator.share && product) {
          try {
            await navigator.share({
              title: product.name,
              text: shareText,
              url: currentProductUrl,
            });
          } catch (err) {
            console.log("Share cancelled", err);
          }
        }
        break;
    }
  }

  function handleAddToCart() {
    if (!product) return;
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: product.id.toString(),
        productId: product.id,
        name: product.name,
        price: Math.round(product.price * weightMultipliers[selectedWeight]),
        image: product.imageUrl,
        weight: selectedWeight,
      });
    }
    toast.success(`${product.name} added to cart!`);
  }

  function handleWishlistClick() {
    if (!product) return;
    const productData = {
      id: product.id.toString(),
      name: product.name,
      price: product.price,
      image: product.imageUrl,
      origin: product.category,
    };
    if (isInWishlist(product.id.toString())) {
      removeFromWishlist(product.id.toString());
      toast.success(`${product.name} removed from wishlist!`);
    } else {
      addToWishlist(productData);
      toast.success(`${product.name} added to wishlist!`);
    }
  }

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="min-h-screen bg-[#f9f7f4]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <Navigation />
        <main className="pt-[180px] pb-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center py-20">
            <p className="text-6xl mb-6">⏳</p>
            <h1
              className="text-3xl font-semibold text-[#1c1917] mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Loading Product...
            </h1>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ─── 404 state ──────────────────────────────────────────────────────────────
  if (!product) {
    return (
      <div
        className="min-h-screen bg-[#f9f7f4]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <Navigation />
        <main className="pt-[180px] pb-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center py-20">
            <p className="text-6xl mb-6">🛍️</p>
            <h1
              className="text-3xl font-semibold text-[#1c1917] mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Product Not Found
            </h1>
            <p className="text-[#78746e] mb-8">
              We couldn&apos;t find the product you&apos;re looking for.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-7 py-3 bg-[#2d5a3d] text-white rounded-xl font-medium hover:bg-[#234832] transition-colors"
            >
              ← Back to Products
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const adjustedPrice = Math.round(product.price * weightMultipliers[selectedWeight]);
  const shareDescription = product.description.substring(0, 150) + (product.description.length > 150 ? "..." : "");
  const images = [product.imageUrl];
  
  // Calculate average rating from reviews
  const averageRating = product.reviews.length > 0 
    ? product.reviews.reduce((sum: number, review: ProductReview) => sum + review.rating, 0) / product.reviews.length 
    : 4.8;
  
  const brewGuide = brewGuideByType[product.category] ?? brewGuideByType["green"];

  return (
    <div
      className="min-h-screen bg-[#f9f7f4]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <Navigation />
      <main className="pt-[130px] pb-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* ─── Breadcrumb ─── */}
          <nav className="flex items-center gap-1.5 text-sm text-[#78746e] mb-6">
            <Link href="/" className="hover:text-[#2d5a3d] transition-colors">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <Link
              href="/products"
              className="hover:text-[#2d5a3d] transition-colors"
            >
              Products
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[#1c1917] font-medium truncate">
              {product.name}
            </span>
          </nav>

          {/* ─── Product Layout ─── */}
          <div className="grid lg:grid-cols-2 gap-10 mb-20 items-start">
            {/* LEFT — Gallery */}
            <div className="sticky top-[130px] self-start space-y-3">
              <div className="aspect-square rounded-2xl overflow-hidden bg-[#f0ede8]">
                <img
                  src={images[activeImage]}
                  alt={product.name}
                  className="w-full h-full object-cover transition-all duration-300"
                />
              </div>
              {/* Thumbnails (only if we have multiple) */}
              {images.length > 1 && (
                <div className="grid grid-cols-3 gap-2">
                  {images.slice(1).map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i + 1)}
                      className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        activeImage === i + 1
                          ? "border-[#2d5a3d] shadow-md"
                          : "border-transparent hover:border-[#c8a96e]"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} view ${i + 2}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT — Details */}
            <div className="sticky top-[130px] self-start">
              {/* Badges */}
              <div className="flex items-center flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-[#c8a96e]/20 text-[#c8a96e] text-xs font-semibold rounded-full uppercase tracking-wide small-caps">
                  {product.category}
                </span>
                {product.status !== "In Stock" && (
                  <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
                    {product.status}
                  </span>
                )}
              </div>

              <h1
                className="text-[clamp(1.8rem,3vw,2.8rem)] leading-[1.1] font-semibold text-[#1c1917] mb-5"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[rgba(28,25,23,0.08)]">
                <StarRating rating={averageRating} size="md" />
                <span className="font-semibold text-[#1c1917]">{averageRating.toFixed(1)}</span>
                <a
                  href="#reviews"
                  className="text-[#78746e] text-sm hover:text-[#2d5a3d] transition-colors"
                >
                  ({product.reviews.length} reviews)
                </a>
              </div>

              {/* Price */}
              <p className="text-4xl font-bold text-[#2d5a3d] mb-5">
                {formatPrice(adjustedPrice)}
              </p>

              {/* Weight selector */}
              <div className="mb-4">
                <p className="text-sm font-semibold text-[#1c1917] mb-3">
                  Weight
                </p>
                <div className="flex gap-3">
                  {Object.entries(weightMultipliers).map(([w, mult]) => (
                    <button
                      key={w}
                      onClick={() => setSelectedWeight(w)}
                      className={`px-5 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                        selectedWeight === w
                          ? "border-[#2d5a3d] bg-[#2d5a3d] text-white shadow-sm"
                          : "border-[rgba(28,25,23,0.1)] bg-white text-[#1c1917] hover:border-[#2d5a3d]"
                      }`}
                    >
                      {w}
                      {w !== "50g" && (
                        <span className="ml-1.5 text-xs opacity-70">
                          {formatPrice(Math.round(product.price * mult))}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity stepper */}
              <div className="mb-4">
                <p className="text-sm font-semibold text-[#1c1917] mb-3">
                  Quantity
                </p>
                <div className="flex items-center border-2 border-[rgba(28,25,23,0.1)] rounded-xl overflow-hidden w-fit">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-12 h-12 flex items-center justify-center text-xl text-[#78746e] hover:bg-[#f0ede8] transition-colors"
                  >
                    −
                  </button>
                  <span className="w-12 text-center font-semibold text-[#1c1917] text-lg select-none">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-12 h-12 flex items-center justify-center text-xl text-[#78746e] hover:bg-[#f0ede8] transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add to Cart + Wishlist */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-3.5 bg-[#2d5a3d] text-white font-semibold rounded-xl hover:bg-[#234832] transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="h-5 w-5" />
                  Add to Cart
                </button>
                <button
                  onClick={handleWishlistClick}
                  title={isInWishlist(product.id.toString()) ? "Remove from Wishlist" : "Add to Wishlist"}
                  className={`p-3.5 border-2 rounded-xl transition-all ${
                    isInWishlist(product.id.toString())
                      ? "border-[#c8a96e] bg-[#c8a96e]/10 text-[#c8a96e]"
                      : "border-[rgba(28,25,23,0.12)] text-[#78746e] hover:border-[#c8a96e] hover:text-[#c8a96e]"
                  }`}
                >
                  <Heart className="h-5 w-5" fill={isInWishlist(product.id.toString()) ? "currentColor" : "none"} />
                </button>
              </div>

              {/* Share Buttons */}
              <div className="mb-4">
                <p className="text-sm font-semibold text-[#1c1917] mb-3">Share this product</p>
                <div className="flex flex-wrap gap-2">
                  {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                    <button
                      onClick={() => handleShare("native")}
                      className="flex items-center gap-2 px-3 py-2.5 bg-[#2d5a3d] text-white rounded-xl hover:bg-[#234832] transition-colors"
                      aria-label="Share via native share dialog"
                      title="Share"
                    >
                      <Share2 className="h-5 w-5" />
                      <span className="text-sm font-medium hidden sm:inline">Share</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleShare("facebook")}
                    className="p-2.5 bg-[#1877f2] text-white rounded-xl hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1877f2]"
                    aria-label="Share on Facebook"
                    title="Share on Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleShare("twitter")}
                    className="p-2.5 bg-black text-white rounded-xl hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                    aria-label="Share on X (Twitter)"
                    title="Share on X (Twitter)"
                  >
                    <Twitter className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleShare("whatsapp")}
                    className="p-2.5 bg-[#25d366] text-white rounded-xl hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#25d366]"
                    aria-label="Share on WhatsApp"
                    title="Share on WhatsApp"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleShare("linkedin")}
                    className="p-2.5 bg-[#0077b5] text-white rounded-xl hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0077b5]"
                    aria-label="Share on LinkedIn"
                    title="Share on LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleShare("copy")}
                    className={`p-2.5 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${copied ? "bg-[#2d5a3d] text-white focus:ring-[#2d5a3d]" : "bg-[#78746e] text-white hover:opacity-90 focus:ring-[#78746e]"}`}
                    aria-label="Copy product link"
                    title={copied ? "Copied!" : "Copy Link"}
                  >
                    {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-5 border-t border-[rgba(28,25,23,0.08)]">
                <span className="flex items-center gap-1.5 text-xs text-[#78746e]">
                  <Leaf className="h-3.5 w-3.5 text-[#2d5a3d]" />
                  Organic Certified
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[#78746e]">
                  <Truck className="h-3.5 w-3.5 text-[#2d5a3d]" />
                  Free over Rs. 3,000
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[#78746e]">
                  <RotateCcw className="h-3.5 w-3.5 text-[#2d5a3d]" />
                  7-Day Returns
                </span>
              </div>

              {/* Divider + short description */}
              <div className="mt-5 pt-5 border-t border-[rgba(28,25,23,0.08)]">
                <p className="text-[#78746e] text-sm leading-relaxed">
                  {product.description}
                </p>
              </div>
            </div>
          </div>

          {/* ─── Tabs Section ─── */}
          <div id="reviews" className="mb-20">
            <Tabs defaultValue="description">
              <TabsList className="w-full justify-start rounded-none border-b border-[rgba(28,25,23,0.1)] bg-transparent h-auto p-0 mb-8">
                <TabsTrigger
                  value="description"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2d5a3d] data-[state=active]:text-[#2d5a3d] data-[state=active]:shadow-none bg-transparent px-6 py-4 text-sm font-medium text-[#78746e] hover:text-[#1c1917] transition-colors"
                >
                  Description
                </TabsTrigger>
                <TabsTrigger
                  value="brew"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2d5a3d] data-[state=active]:text-[#2d5a3d] data-[state=active]:shadow-none bg-transparent px-6 py-4 text-sm font-medium text-[#78746e] hover:text-[#1c1917] transition-colors"
                >
                  Brew Guide
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2d5a3d] data-[state=active]:text-[#2d5a3d] data-[state=active]:shadow-none bg-transparent px-6 py-4 text-sm font-medium text-[#78746e] hover:text-[#1c1917] transition-colors"
                >
                  Reviews ({product.reviews.length})
                </TabsTrigger>
              </TabsList>

              {/* ─── Description ─── */}
              <TabsContent value="description">
                <div className="max-w-2xl space-y-4">
                  <p className="text-[#1c1917] leading-relaxed text-[15px]">
                    {product.description}
                  </p>
                  <p className="text-[#78746e] leading-relaxed text-[15px]">
                    At {BRAND.companyName}, every batch is sourced directly from
                    smallholder farms through fair-trade agreements. Our team
                    visits each partner before harvest to verify quality,
                    sustainability standards, and processing methods — so you can taste
                    the difference a direct relationship makes.
                  </p>
                  <p className="text-[#78746e] leading-relaxed text-[15px]">
                    Packaged within days of arrival in our Kathmandu facility,
                    each order is sealed in food-grade, resealable pouches to
                    lock in peak freshness. We recommend storing in a cool, dry
                    place away from direct sunlight to preserve aroma and
                    flavour for up to 18 months.
                  </p>
                </div>
              </TabsContent>

              {/* ─── Brew Guide ─── */}
              <TabsContent value="brew">
                <div className="max-w-2xl">
                  <p className="text-[#78746e] mb-6 text-sm">
                    Follow these guidelines for a perfect cup every time.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {[
                      {
                        Icon: Thermometer,
                        label: "Temperature",
                        value: brewGuide.temp,
                        bg: "bg-red-50",
                        color: "text-red-500",
                      },
                      {
                        Icon: Clock,
                        label: "Steep Time",
                        value: brewGuide.time,
                        bg: "bg-blue-50",
                        color: "text-blue-500",
                      },
                      {
                        Icon: Droplets,
                        label: "Leaf : Water",
                        value: brewGuide.ratio,
                        bg: "bg-[#2d5a3d]/10",
                        color: "text-[#2d5a3d]",
                      },
                      {
                        Icon: StickyNote,
                        label: "Notes",
                        value: "Pro Tip",
                        bg: "bg-[#c8a96e]/10",
                        color: "text-[#c8a96e]",
                        isNote: true,
                      },
                    ].map(({ Icon, label, value, bg, color, isNote }) => (
                      <div
                        key={label}
                        className="bg-white rounded-2xl p-5 border border-[rgba(28,25,23,0.06)] text-center flex flex-col items-center"
                      >
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${bg}`}
                        >
                          <Icon className={`h-6 w-6 ${color}`} />
                        </div>
                        <p className="text-lg font-bold text-[#1c1917] mb-1 leading-tight">
                          {isNote
                            ? brewGuide.notes.split(" ").slice(0, 2).join(" ") + "…"
                            : value}
                        </p>
                        <p className="text-xs text-[#78746e] font-medium uppercase tracking-wide">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="p-5 bg-[#2d5a3d]/5 rounded-2xl border border-[#2d5a3d]/10">
                    <p className="text-sm text-[#2d5a3d] font-semibold mb-1">
                      Pro Tip
                    </p>
                    <p className="text-sm text-[#78746e] leading-relaxed">
                      {brewGuide.notes}. Always use filtered or spring water for
                      the cleanest flavour.
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* ─── Reviews ─── */}
              <TabsContent value="reviews">
                <div className="max-w-2xl space-y-5">
                  {/* Summary */}
                  <div className="flex items-center gap-5 p-5 bg-white rounded-2xl border border-[rgba(28,25,23,0.06)]">
                    <div>
                      <span className="text-5xl font-bold text-[#1c1917]">
                        {averageRating.toFixed(1)}
                      </span>
                      <span className="text-xl text-[#78746e]">/5</span>
                    </div>
                    <div>
                      <StarRating rating={averageRating} size="md" />
                      <p className="text-sm text-[#78746e] mt-1">
                        {product.reviews.length} verified reviews
                      </p>
                    </div>
                  </div>

                  {/* Individual reviews */}
                  {product.reviews.length > 0 ? (
                    product.reviews.map((review: ProductReview, i: number) => (
                      <div
                        key={i}
                        className="bg-white rounded-2xl p-6 border border-[rgba(28,25,23,0.06)]"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-[#2d5a3d] flex items-center justify-center text-white text-sm font-semibold shrink-0">
                            {review.initials || "U"}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-[#1c1917] text-sm">
                              {review.name || "Anonymous User"}
                            </p>
                            <p className="text-xs text-[#78746e]">
                              {review.date || "Recently"}
                            </p>
                          </div>
                          <StarRating rating={review.rating} />
                        </div>
                        <p className="text-[#78746e] text-sm leading-relaxed">
                          {review.comment || "Great tea!"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-[#78746e]">No reviews yet. Be the first to review this product!</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* ─── You May Also Like ─── */}
          {relatedProducts.length > 0 && (
            <div>
              <h2
                className="text-2xl font-semibold text-[#1c1917] mb-8"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                You May Also Like
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {relatedProducts.map((relatedProduct: Product) => (
                  <Link
                    key={relatedProduct.id}
                    href={`/products/${relatedProduct.id}`}
                    className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] overflow-hidden group hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={relatedProduct.imageUrl}
                        alt={relatedProduct.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-[#c8a96e] font-semibold uppercase tracking-wide mb-1">
                        {relatedProduct.category}
                      </p>
                      <h3
                        className="font-semibold text-[#1c1917] group-hover:text-[#2d5a3d] transition-colors mb-2"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                      >
                        {relatedProduct.name}
                      </h3>
                      <p className="text-[#2d5a3d] font-bold">
                        {formatPrice(relatedProduct.price)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
