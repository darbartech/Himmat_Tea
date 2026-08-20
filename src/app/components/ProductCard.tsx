'use client';

import { ShoppingBag, Star } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import type { Product } from "@/context/StoreContext";
import { Badge } from "@/app/components/ui/badge";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();

  const averageRating = product.reviews && product.reviews.length > 0
    ? (product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length).toFixed(1)
    : "4.8";
  const reviewCount = product.reviews?.length || 0;
  const isOutOfStock = typeof product.stock === "number" && product.stock <= 0;
  const isLowStock = typeof product.stock === "number" && product.stock > 0 && product.stock <= 5;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (isOutOfStock) {
      toast.error(t('products.outOfStock', { name: product.name }));
      return;
    }
    addToCart({
      id: product.id.toString(),
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.imageUrl,
      stock: product.stock,
    });
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden group border border-[rgba(28,25,23,0.08)] hover:shadow-[0_10px_40px_rgba(45,90,61,0.12)] hover:border-[#2d5a3d]/25 transition-all duration-400">
      <Link
        href={`/products/${product.id}`}
        className="relative overflow-hidden bg-[#f8f6f2] block aspect-[4/3] md:aspect-[1/1]"
      >
        <img
          src={product.imageUrl}
          alt={product.name}
          className={`w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105 ${isOutOfStock ? "opacity-60 grayscale" : ""}`}
        />
        {product.isBestseller && (
          <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold bg-[#2d5a3d] text-white shadow-sm">
            Bestseller
          </span>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
            <Badge variant="destructive" size="lg" className="shadow-lg uppercase tracking-wider">
              Out of Stock
            </Badge>
          </div>
        )}
        {!isOutOfStock && isLowStock && (
          <Badge variant="warning" size="sm" className="absolute top-3 right-3 shadow-sm">
            Only {product.stock} left
          </Badge>
        )}
      </Link>

      <div className="p-3.5 md:p-4">
        <div className="flex items-center gap-1 mb-1.5">
          <Star className="h-3 w-3 fill-[#c8a96e] text-[#c8a96e]" />
          <span className="text-xs font-medium text-[#1c1917]">
            {averageRating}
          </span>
          {reviewCount > 0 && (
            <span className="text-xs text-[#78746e]">
              ({reviewCount})
            </span>
          )}
        </div>

        <Link href={`/products/${product.id}`} className="block">
          <h3
            className="text-sm md:text-[15px] font-semibold text-[#1c1917] leading-tight group-hover:text-[#2d5a3d] transition-colors"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {product.name}
          </h3>
        </Link>
        <p className="text-xs text-[#78746e] mt-0.5">
          {product.category}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-bold text-[#2d5a3d]">
            {formatPrice(product.price)}
          </span>
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`cursor-pointer p-2 rounded-lg transition-colors ${
              isOutOfStock
                ? "bg-[#e8e4de] text-[#78746e] cursor-not-allowed"
                : "bg-[#2d5a3d] text-white hover:bg-[#234832]"
            }`}
            aria-disabled={isOutOfStock}
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
