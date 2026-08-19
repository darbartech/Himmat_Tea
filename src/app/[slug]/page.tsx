import { Metadata } from 'next';
import { use } from 'react';
import { prisma } from '@/lib/prisma';
import { buildMetadata, notFoundMetadata } from '@/lib/metadata';
import ProductLine from '@/app/pages/ProductLine';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  const productLine = await prisma.productLine.findUnique({
    where: { slug },
    select: { name: true, description: true, heroImage: true, isActive: true },
  });

  if (!productLine || productLine.isActive === false) return notFoundMetadata('Page');

  return buildMetadata({
    title: productLine.name,
    description: productLine.description,
    path: `/${slug}`,
    image: productLine.heroImage,
  });
}

export default function ProductLinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <ProductLine slug={slug} />;
}
