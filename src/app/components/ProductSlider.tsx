'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ShoppingBag } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, useCarousel, type CarouselApi } from './ui/carousel';
import { useCart } from '@/context/CartContext';

import { useTranslation } from '@/hooks/useTranslation';
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
  const { t } = useTranslation();
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
        <span className="sr-only">{t('a11y.previousSlide')}</span>
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
        <span className="sr-only">{t('a11y.nextSlide')}</span>
      </button>
    </div>
  );
}

function SliderContent({ products }: { products: Product[] }) {
  const { addToCart } = useCart();

  return (
    <>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between mb-10">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.25em] text-[#c8a96e] font-semibold mb-3">
            Our Products
          </p>
          <h2
            className="text-[clamp(2rem,3vw,3rem)] font-semibold leading-tight text-[#1c1917]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Discover Our Range
          </h2>
          <p className="mt-4 text-sm md:text-base text-[#5f5d57] max-w-xl leading-7">
            Browse the best of our herbal teas, wellness blends, and carefully curated gift sets. Each product is designed to feel effortless, fresh, and inviting.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CustomNavigation />
        </div>
      </div>

      <CarouselContent>
        {(products || []).map((product) => (
          <CarouselItem key={product.id} className="md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
            <div className="p-2">
              <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[rgba(28,25,23,0.08)] bg-white shadow-sm transition-all duration-300 hover:shadow-xl">
                <Link href={`/products/${product.id}`} className="group block overflow-hidden">
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#f7f4ee]">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </Link>

                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="space-y-2">
                    <Link href={`/products/${product.id}`} className="block">
                      <h3
                        className="text-base font-semibold text-[#1c1917] transition-colors group-hover:text-[#2d5a3d]"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                      >
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-[#78746e] leading-relaxed">
                      {product.category}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-[#8b8a85] mt-1">
                        {product.stock > 0
                          ? product.stock <= 20
                            ? 'Limited stock'
                            : 'Available now'
                          : 'Out of stock'}
                      </div>
                    </div>
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
                      className="inline-flex h-11 min-w-[44px] items-center justify-center rounded-full bg-[#2d5a3d] px-4 text-white transition hover:bg-[#234832]"
                    >
                      <ShoppingBag className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="flex justify-center mt-6 md:hidden">
        <CustomNavigation />
      </div>
    </>
  );
}

export default function ProductSlider({ products }: { products: Product[] }) {
  const { t } = useTranslation();

  const [carouselApi, setCarouselApi] = React.useState<CarouselApi | null>(null);
  const [isPaused, setIsPaused] = React.useState(false);

  React.useEffect(() => {
    if (!carouselApi || isPaused) return;
    const interval = window.setInterval(() => {
      carouselApi.scrollNext();
    }, 3800);

    return () => window.clearInterval(interval);
  }, [carouselApi, isPaused]);

  return (
    <section
      className="py-12 md:py-16 lg:py-20 bg-[#faf8f5]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <Carousel
          opts={{
            align: 'start',
            loop: true,
            skipSnaps: false,
          }}
          setApi={setCarouselApi}
          className="w-full"
        >
          <SliderContent products={products} />
        </Carousel>
      </div>
    </section>
  );
}
