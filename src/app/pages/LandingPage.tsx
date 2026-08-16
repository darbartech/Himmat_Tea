import Navigation from "@/app/components/Navigation";
import Hero from "@/app/components/Hero";
import ProductSlider from "@/app/components/ProductSlider";
import ProductLinesShowcase from "@/app/components/ProductLinesShowcase";
import Features from "@/app/components/Features";
import ProductsSection from "@/app/components/ProductsSection";
import Testimonials from "@/app/components/Testimonials";
import Footer from "@/app/components/Footer";
import { prisma } from "@/lib/prisma";
import { initialMockProducts } from "@/lib/mock-data";

const fallbackProductLines = [
  {
    id: 1,
    slug: "himmat-tea",
    name: "Himmat Tea",
    description: "Premium Himalayan teas and wellness blends selected for freshness, flavor, and daily ritual.",
    heroImage:
      "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=600&fit=crop",
    isActive: true,
    sortOrder: 1,
    products: [],
  },
  {
    id: 2,
    slug: "godgifted-dal",
    name: "Godgifted Dal",
    description: "Wholesome lentils and pantry staples sourced with care for everyday nutrition and taste.",
    heroImage:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    isActive: true,
    sortOrder: 2,
    products: [],
  },
];

async function getLandingPageData() {
  try {
    const [productLines, products] = await Promise.all([
      prisma.productLine.findMany({
        include: { products: true },
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.product.findMany({
        take: 8,
      }),
    ]);

    return { productLines, products };
  } catch (error) {
    console.warn("Database unavailable while rendering landing page, using fallback content.", error);

    return {
      productLines: fallbackProductLines,
      products: initialMockProducts.slice(0, 8),
    };
  }
}

export default async function LandingPage() {
  const { productLines, products } = await getLandingPageData();

  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      <Navigation />
      <Hero />
      <ProductSlider products={products} />
      <ProductLinesShowcase productLines={productLines} />
      <ProductsSection />
      <Features />
      <Testimonials />
      <Footer />
    </div>
  );
}
