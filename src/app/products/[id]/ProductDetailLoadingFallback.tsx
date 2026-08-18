'use client';

import { useTranslation } from '@/context/TranslationContext';

// useTranslation() is a client-only hook (its context module is marked
// 'use client'). It cannot be called directly inside page.tsx, because that
// file also exports generateMetadata() and needs to stay a Server Component
// so it can query Prisma for real product data. This tiny wrapper is the
// Client Component boundary that lets the Suspense fallback still show
// translated loading text.
export default function ProductDetailLoadingFallback() {
  const { t } = useTranslation();
  return <div>{t('productDetail.loading')}</div>;
}
