import { Metadata } from 'next';
import ProductDetail from '@/app/pages/ProductDetail';
import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import ProductDetailLoadingFallback from './ProductDetailLoadingFallback';

// Generate dynamic metadata for product page.
//
// Previously this looked products up in a hardcoded 8-entry mock object, so
// any real product (i.e. basically every product an admin actually added)
// got "Product Not Found - Himmat Tea" as its <title>, meta description, and
// Open Graph/Twitter preview — in Google results and in link previews on
// WhatsApp/Facebook/Twitter/etc. It also meant metadata was frozen at
// whatever was hardcoded even for the 8 matching IDs, going stale the moment
// an admin edited that product. This now fetches the real product straight
// from the database, the same source of truth <ProductDetail /> itself uses.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const parsedId = parseInt(id, 10);

  const product = Number.isNaN(parsedId)
    ? null
    : await prisma.product.findUnique({
        where: { id: parsedId },
        select: { name: true, description: true, imageUrl: true, isActive: true },
      });

  if (!product || product.isActive === false) {
    return {
      title: 'Product Not Found - Himmat Tea',
      description: 'The product you are looking for could not be found.'
    };
  }

  return {
    title: `${product.name} - Himmat Tea`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      url: `https://himmattea.com/products/${id}`, // Replace with your actual domain
      siteName: 'Himmat Tea',
      images: product.imageUrl
        ? [
            {
              url: product.imageUrl,
              width: 800,
              height: 800,
              alt: product.name
            }
          ]
        : undefined,
      locale: 'en_US',
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: product.imageUrl ? [product.imageUrl] : undefined
    }
  };
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<ProductDetailLoadingFallback />}>
      <ProductDetail />
    </Suspense>
  );
}
