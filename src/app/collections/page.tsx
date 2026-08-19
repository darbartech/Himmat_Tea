import { Metadata } from 'next';
import Collections from '@/app/pages/Collections';
import { buildMetadata } from '@/lib/metadata';
import { BRAND } from '@/config/brand';

export const metadata: Metadata = buildMetadata({
  title: `Collections`,
  description: `Curated collections of premium ${BRAND.productLines.map(pl => pl.name).join(' and ')} from ${BRAND.companyName}.`,
  path: '/collections',
});

export default function CollectionsPage() {
  return <Collections />;
}
