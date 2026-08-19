import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/app/components/ui/sonner';
import { TranslationProvider } from '@/context/TranslationContext';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { StoreProvider } from '@/context/StoreContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { BRAND } from '@/config/brand';
import ReactQueryProvider from '@/providers/ReactQueryProvider';
import NextAuthProvider from '@/providers/NextAuthProvider';

export const metadata: Metadata = {
  title: BRAND.companyName,
  description: `${BRAND.tagline} Premium food products including ${BRAND.productLines.map(pl => pl.name).join(' and ')}, sourced directly from Himalayan farms.`,
  metadataBase: new URL(`https://${BRAND.domain}`),
  openGraph: {
    title: BRAND.companyName,
    description: `${BRAND.tagline} Premium food products including ${BRAND.productLines.map(pl => pl.name).join(' and ')}, sourced directly from Himalayan farms.`,
    url: `https://${BRAND.domain}`,
    siteName: BRAND.companyName,
    images: [{
      url: '/og-image.jpg',
      width: 1200,
      height: 630,
      alt: BRAND.companyName
    }],
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: BRAND.companyName,
    description: `${BRAND.tagline} Premium food products including ${BRAND.productLines.map(pl => pl.name).join(' and ')}, sourced directly from Himalayan farms.`,
    images: ['/og-image.jpg']
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <ReactQueryProvider>
          <NextAuthProvider>
            <CurrencyProvider>
              <SettingsProvider>
                <TranslationProvider>
                  <StoreProvider>
                    <CartProvider>
                      <WishlistProvider>
                        <AuthProvider>
                          {children}
                          <Toaster />
                        </AuthProvider>
                      </WishlistProvider>
                    </CartProvider>
                  </StoreProvider>
                </TranslationProvider>
              </SettingsProvider>
            </CurrencyProvider>
          </NextAuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
