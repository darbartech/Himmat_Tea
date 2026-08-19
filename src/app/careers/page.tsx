import { Metadata } from 'next';
import Careers from '@/app/pages/Careers';
import { buildMetadata } from '@/lib/metadata';
import { BRAND } from '@/config/brand';

export const metadata: Metadata = buildMetadata({
  title: `Careers at ${BRAND.companyName}`,
  description: `Join the ${BRAND.companyName} team — open roles across sourcing, operations, and growth.`,
  path: '/careers',
});

export default function CareersPage() {
  return <Careers />;
}
