'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ShoppingBag } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, useCarousel } from './ui/carousel';
import { useCart } from '@/context/CartContext';

interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  isBestseller?: boolean;
  category?: string;
  [key: string]: any;
}

function CustomNavigation() {
  const { scrollPrev, scrollNext, canScrollPrev, canScrollNext } = useCarousel();

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        className={`group relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
          canScrollPrev
            ? 'border-[#2d5a3d] text-[#2d5a3d] hover:bg-[#2d5a3d] hover:text-white hover:-translate-x-1 cursor-pointer'
            : 'border-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        <ArrowLeft className="w-5 h-5 transition-transform group-hover:scale-110" />
        <span className="sr-only">Previous slide</span>
      </button>
      <button
        onClick={scrollNext}
        disabled={!canScrollNext}
        className={`group relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
          canScrollNext
            ? 'border-[#2d5a3d] text-[#2d5a3d] hover:bg-[#2d5a3d] hover:text-white hover:translate-x-1 cursor-pointer'
            : 'border-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        <ArrowRight className="w-5 h-5 transition-transform group-hover:scale-110" />
        <span className="sr-only">Next slide</span>
      </button>
    </div>
  );
}

function SliderContent({ products }: { products: Product[] }) {
  const { addToCart } = useCart();

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 md:mb-10">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#c8a96e] font-medium mb-2 md:mb-3">
            Our Products
          </p>
          <h2
            className="text-[clamp(1.5rem,3vw,2.5rem)] font-semibold leading-[1.15] text-[#1c1917]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Discover Our Range
          </h2>
        </div>
        <div className="hidden md:block">
          <CustomNavigation />
        </div>
      </div>

      <CarouselContent>
        {(products || []).map((product) => (
          <CarouselItem key={product.id} className="md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
            <div className="p-1">
              <div className="bg-white rounded-2xl overflow-hidden border border-[rgba(28,25,23,0.08)] shadow-md hover:shadow-[0_20px_40px_rgba(45,90,61,0.15)] hover:border-[#2d5a3d]/25 transition-all duration-400 group">
                {/* Image Container */}
                <div className="relative overflow-hidden bg-[#faf8f5] block aspect-[4/3]">
                  <Link href={`/products/${product.id}`} className="block w-full h-full">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-110"
                    />
                    {/* Gradient Overlay on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1c1917]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                  </Link>
                  
                  {/* Badges */}
                  {product.isBestseller && (
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide bg-[#2d5a3d] text-white shadow-lg">
                      BESTSELLER
                    </span>
                  )}

                  {/* Quick Add Button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      addToCart({
                        id: product.id.toString(),
                        productId: product.id,
                        name: product.name,
                        price: product.price,
                        image: product.imageUrl,
                      });
                    }}
                    className="absolute bottom-3 right-3 flex items-center justify-center w-10 h-10 rounded-full bg-white text-[#2d5a3d] shadow-lg hover:bg-[#2d5a3d] hover:text-white transition-all duration-300 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
                  >
                    <ShoppingBag className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 md:p-5">
                  <Link href={`/products/${product.id}`} className="block">
                    <h3
                      className="text-sm md:text-base font-semibold text-[#1c1917] leading-snug group-hover:text-[#2d5a3d] transition-colors"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {product.name}
                    </h3>
                  </Link>
                  <p className="text-xs text-[#78746e] mt-1.5">{product.category}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-base font-bold text-[#2d5a3d]" style={{ fontFamily: "'Playfair Display', serif" }}>
                      Rs.{product.price.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="md:hidden flex justify-center mt-6">
        <CustomNavigation />
      </div>
    </>
  );
}

export default function ProductSlider({ products }: { products: Product[] }) {
  return (
    <section className="py-12 md:py-16 lg:py-20 bg-[#faf8f5]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <Carousel
          opts={{
            align: 'start',
            loop: true,
          }}
          className="w-full"
        >
          <SliderContent products={products} />
        </Carousel>
      </div>
    </section>
  );
}
