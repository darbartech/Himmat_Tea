import { Metadata } from 'next';
import ProductDetail from '@/app/pages/ProductDetail';
import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { buildMetadata, notFoundMetadata } from '@/lib/metadata';
import ProductDetailLoadingFallback from './ProductDetailLoadingFallback';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const parsedId = parseInt(id, 10);

  const product = Number.isNaN(parsedId)
    ? null
    : await prisma.product.findUnique({
        where: { id: parsedId },
        select: { name: true, description: true, imageUrl: true, isActive: true },
      });

  if (!product || product.isActive === false) return notFoundMetadata('Product');

  return buildMetadata({
    title: product.name,
    description: product.description,
    path: `/products/${id}`,
    image: product.imageUrl,
  });
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<ProductDetailLoadingFallback />}>
      <ProductDetail />
    </Suspense>
  );
}