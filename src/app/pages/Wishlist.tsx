'use client';

import Link from "next/link";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import { useWishlist } from "@/context/WishlistContext";
import { Heart, ShoppingBag, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";

export default function Wishlist() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();

  function handleAddToCart(product: typeof wishlist[0]) {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      weight: "50g",
    });
    toast.success(`${product.name} added to cart!`);
  }

  return (
    <div
      className="min-h-screen bg-[#f9f7f4]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <Navigation />
      <main className="pt-[180px] pb-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-12">
            <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-semibold mb-4">
              My Wishlist
            </p>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1
                  className="text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] font-semibold text-[#1c1917] mb-3"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Your Saved Teas
                </h1>
                <p className="text-[#78746e] text-lg">
                  {wishlist.length} {wishlist.length === 1 ? "item" : "items"} in your wishlist
                </p>
              </div>
            </div>
          </div>

          {/* Wishlist Items */}
          {wishlist.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl border border-[rgba(28,25,23,0.06)]">
              <p className="text-6xl mb-5">🤍</p>
              <h3
                className="text-2xl font-semibold text-[#1c1917] mb-3"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Your wishlist is empty
              </h3>
              <p className="text-[#78746e] mb-8 max-w-md mx-auto">
                Start exploring our tea collection and save your favorites to your wishlist!
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#2d5a3d] text-white rounded-xl font-semibold hover:bg-[#234832] transition-colors"
              >
                Explore Teas
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlist.map((product) => (
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
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="p-5">
                    <p className="text-xs text-[#c8a96e] font-semibold uppercase tracking-wide mb-1">
                      {product.origin}
                    </p>
                    <Link href={`/products/${product.id}`}>
                      <h3
                        className="text-[15px] font-semibold text-[#1c1917] mb-2.5 group-hover:text-[#2d5a3d] transition-colors leading-snug"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                      >
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-xl font-bold text-[#2d5a3d] mb-4">
                      {formatPrice(product.price)}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="flex-1 py-2.5 bg-[#2d5a3d] text-white text-sm font-medium rounded-xl hover:bg-[#234832] transition-colors flex items-center justify-center gap-2"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Add to Cart
                      </button>
                      <button
                        onClick={() => {
                          removeFromWishlist(product.id);
                          toast.success(`${product.name} removed from wishlist!`);
                        }}
                        className="p-2.5 border-2 border-[rgba(28,25,23,0.12)] rounded-xl text-[#78746e] hover:border-red-400 hover:text-red-500 transition-all"
                        title="Remove from Wishlist"
                      >
                        <Heart className="h-5 w-5" fill="none" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
