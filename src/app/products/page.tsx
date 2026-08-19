import { Metadata } from 'next';
import ProductsCatalog from '@/app/pages/ProductsCatalog';
import { buildMetadata } from '@/lib/metadata';
import { BRAND } from '@/config/brand';

export const metadata: Metadata = buildMetadata({
  title: `Products`,
  description: `Explore our full range of premium ${BRAND.productLines.map(pl => pl.name).join(' and ')}, sourced directly from farms by ${BRAND.companyName}.`,
  path: '/products',
});

export default function ProductsPage() {
  return <ProductsCatalog />;
}