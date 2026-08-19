import { Metadata } from 'next';
import Blog from '@/app/pages/Blog';
import { buildMetadata } from '@/lib/metadata';
import { BRAND } from '@/config/brand';

export const metadata: Metadata = buildMetadata({
  title: `Blog`,
  description: `Stories, brewing tips, and sourcing notes from ${BRAND.companyName}.`,
  path: '/blog',
});

export default function BlogPage() {
  return <Blog />;
}
