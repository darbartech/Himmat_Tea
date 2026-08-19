import { Metadata } from 'next';
import BrewingGuides from '@/app/pages/BrewingGuides';
import { buildMetadata } from '@/lib/metadata';
import { BRAND } from '@/config/brand';

export const metadata: Metadata = buildMetadata({
  title: `Brewing Guides`,
  description: `Master the perfect cup with step-by-step brewing guides from ${BRAND.companyName} — temperatures, steep times, and ratios for every tea type.`,
  path: '/brewing-guides',
});

export default function BrewingGuidesPage() {
  return <BrewingGuides />;
}
