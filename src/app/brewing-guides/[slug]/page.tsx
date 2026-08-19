import { Metadata } from 'next';
import BrewingGuideDetail from '@/app/pages/BrewingGuideDetail';
import { prisma } from '@/lib/prisma';
import { buildMetadata, notFoundMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  const guide = await prisma.brewingGuide.findUnique({
    where: { slug },
    select: { title: true, description: true, image: true, isActive: true },
  });

  if (!guide || guide.isActive === false) return notFoundMetadata('Brewing Guide');

  return buildMetadata({
    title: guide.title,
    description: guide.description,
    path: `/brewing-guides/${slug}`,
    image: guide.image,
  });
}

export default function BrewingGuideDetailPage() {
  return <BrewingGuideDetail />;
}
