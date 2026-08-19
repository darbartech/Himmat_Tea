'use client';

import { useState } from "react";
import Link from "next/link";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import { useTranslation } from "@/hooks/useTranslation";
import {
  ArrowRight,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Tag,
  Lock,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { toast } from "sonner";

export default function Cart() {
  const { t } = useTranslation();
  const { cart, updateQuantity, removeFromCart, cartTotal } = useCart();
  const [promo, setPromo] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const { formatPrice } = useCurrency();

  const shippingFree = cartTotal >= 3000;

  function applyPromo() {
    if (promo.trim() === "") return;
    setPromoApplied(true);
    toast.success("Promo code applied!");
  }

  return (
    <div
      className="min-h-screen bg-[#f9f7f4]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <Navigation />
      <main className="pt-[180px] pb-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* ── Page Header ── */}
          <div className="mb-10">
            <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-semibold mb-3">
              Shopping
            </p>
            <h1
              className="text-[clamp(2rem,4vw,3rem)] leading-[1.1] font-semibold text-[#1c1917]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Your Cart
            </h1>
          </div>

          {cart.length === 0 ? (
            /* ── Empty State ── */
            <div className="text-center py-24 bg-white rounded-2xl border border-[rgba(28,25,23,0.06)]">
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 rounded-full bg-[#f0ede8] flex items-center justify-center">
                  <ShoppingBag className="h-10 w-10 text-[#78746e]" />
                </div>
              </div>
              <h3
                className="text-2xl font-semibold text-[#1c1917] mb-3"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Your cart is empty
              </h3>
              <p className="text-[#78746e] mb-8 max-w-sm mx-auto leading-relaxed">
                Looks like you haven't added any teas yet. Discover our curated
                collection.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#2d5a3d] text-white font-semibold rounded-xl hover:bg-[#234832] transition-colors"
              >
                Browse Our Teas
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-10">
              {/* ── Cart Items ── */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-[#78746e]">
                    {cart.length} {cart.length === 1 ? "item" : "items"}
                  </p>
                  <Link
                    href="/products"
                    className="text-sm text-[#2d5a3d] hover:underline font-medium"
                  >
                    ← Continue Shopping
                  </Link>
                </div>

                {cart.map((item) => (
                  <div
                    key={item.id + item.weight}
                    className="bg-white p-5 rounded-2xl border border-[rgba(28,25,23,0.06)] flex items-center gap-5"
                  >
                    {/* Product image or initial fallback */}
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-xl shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-[#2d5a3d] rounded-xl flex items-center justify-center shrink-0">
                        <span className="text-white font-serif text-xl">
                          {item.name[0]}
                        </span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-semibold text-[#1c1917] text-base mb-1 truncate"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                      >
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs bg-[#f0ede8] text-[#78746e] px-2.5 py-0.5 rounded-full font-medium">
                          {item.weight}
                        </span>
                        <span className="text-xs text-[#78746e]">
                          {formatPrice(item.price)} each
                        </span>
                      </div>
                      <p className="text-lg font-bold text-[#2d5a3d]">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>

                    {/* Quantity controls + remove */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center border border-[rgba(28,25,23,0.1)] rounded-xl overflow-hidden">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          className="w-9 h-9 flex items-center justify-center hover:bg-[#f0ede8] transition-colors"
                        >
                          <Minus className="h-3.5 w-3.5 text-[#78746e]" />
                        </button>
                        <span className="w-9 text-center font-semibold text-[#1c1917] text-sm select-none">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          className="w-9 h-9 flex items-center justify-center hover:bg-[#f0ede8] transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5 text-[#78746e]" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 rounded-lg text-[#78746e] hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Order Summary ── */}
              <div className="lg:col-span-1">
                <div className="bg-white p-7 rounded-2xl border border-[rgba(28,25,23,0.06)] sticky top-32">
                  <h3
                    className="text-xl font-semibold text-[#1c1917] mb-6"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Order Summary
                  </h3>

                  {/* Item breakdown */}
                  <div className="space-y-3 mb-5">
                    {cart.map((item) => (
                      <div
                        key={item.id + item.weight}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-[#78746e] truncate max-w-[160px]">
                          {item.name} × {item.quantity}
                        </span>
                        <span className="text-[#1c1917] font-medium shrink-0">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="h-px bg-[rgba(28,25,23,0.08)] mb-5" />

                  {/* Promo code */}
                  <div className="mb-5">
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-[#1c1917] mb-2">
                      <Tag className="h-3.5 w-3.5" />
                      Promo Code
                    </label>
                    {promoApplied ? (
                      <div className="flex items-center gap-2 text-sm text-[#2d5a3d] bg-[#2d5a3d]/10 px-4 py-2.5 rounded-xl">
                        <span>✓</span>
                        <span className="font-medium">{t('cart.promoApplied')}</span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={t('auth.verifyResetPage.eyebrow')}
                          value={promo}
                          onChange={(e) => setPromo(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                          className="flex-1 px-4 py-2.5 border border-[rgba(28,25,23,0.1)] rounded-xl text-sm focus:outline-none focus:border-[#2d5a3d] transition-colors"
                        />
                        <button
                          onClick={applyPromo}
                          className="px-4 py-2.5 bg-[#1c1917] text-white text-sm font-medium rounded-xl hover:bg-[#333] transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-[rgba(28,25,23,0.08)] mb-4" />

                  {/* Totals */}
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm text-[#78746e]">
                      <span>{t('dashboard.invoice.subtotal')}</span>
                      <span>{formatPrice(cartTotal)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-sm text-[#78746e]">
                        <span>{t('cart.shipping')}</span>
                        <span className="text-[#2d5a3d] font-semibold">
                          Free
                        </span>
                      </div>
                      {!shippingFree && (
                        <p className="text-xs text-[#78746e] italic">
                          Free on orders over Rs.&nbsp;3,000
                        </p>
                      )}
                    </div>
                    <div className="h-px bg-[rgba(28,25,23,0.08)]" />
                    <div className="flex justify-between text-lg font-bold text-[#1c1917]">
                      <span>{t('dashboard.invoice.total')}</span>
                      <span>{formatPrice(cartTotal)}</span>
                    </div>
                  </div>

                  <Link
                    href="/checkout"
                    className="w-full py-4 bg-[#2d5a3d] text-white font-semibold rounded-xl hover:bg-[#234832] transition-colors flex items-center justify-center gap-2 text-base"
                  >
                    Proceed to Checkout
                    <ArrowRight className="h-5 w-5" />
                  </Link>

                  {/* Security badge */}
                  <p className="flex items-center justify-center gap-1.5 text-xs text-[#78746e] mt-4">
                    <Lock className="h-3.5 w-3.5" />
                    Secure Checkout
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
