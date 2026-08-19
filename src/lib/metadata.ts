import { Metadata } from 'next';
import { BRAND } from '@/config/brand';

interface BuildMetadataArgs {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: 'website' | 'article';
}

const FALLBACK_IMAGE = '/og-image.jpg';

export function buildMetadata({ title, description, path, image, type = 'website' }: BuildMetadataArgs): Metadata {
  const url = `https://${BRAND.domain}${path}`;
  const resolvedImage = image || FALLBACK_IMAGE;

  return {
    title: `${title} - ${BRAND.companyName}`,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: BRAND.companyName,
      images: [{ url: resolvedImage, width: 1200, height: 630, alt: title }],
      locale: 'en_US',
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [resolvedImage],
    },
  };
}

export function notFoundMetadata(label: string): Metadata {
  return {
    title: `${label} Not Found - ${BRAND.companyName}`,
    description: `The ${label.toLowerCase()} you are looking for could not be found.`,
  };
}
