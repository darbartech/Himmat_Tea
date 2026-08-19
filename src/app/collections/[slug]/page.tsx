import { Metadata } from 'next';
import CollectionDetail from '@/app/pages/CollectionDetail';
import { prisma } from '@/lib/prisma';
import { buildMetadata, notFoundMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  const collection = await prisma.collection.findUnique({
    where: { slug },
    select: { title: true, description: true, image: true, isActive: true },
  });

  if (!collection || collection.isActive === false) return notFoundMetadata('Collection');

  return buildMetadata({
    title: collection.title,
    description: collection.description,
    path: `/collections/${slug}`,
    image: collection.image,
  });
}

export default function CollectionDetailPage() {
  return <CollectionDetail />;
}
