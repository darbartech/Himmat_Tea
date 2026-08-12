import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/app/components/ui/sonner';
import { TranslationProvider } from '@/context/TranslationContext';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { StoreProvider } from '@/context/StoreContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { BRAND } from '@/config/brand';
import ReactQueryProvider from '@/providers/ReactQueryProvider';
import NextAuthProvider from '@/providers/NextAuthProvider';

export const metadata: Metadata = {
  title: BRAND.companyName,
  description: `${BRAND.tagline} Premium food products including ${BRAND.productLines.map(pl => pl.name).join(' and ')}, sourced directly from Himalayan farms.`,
  openGraph: {
    title: BRAND.companyName,
    description: `${BRAND.tagline} Premium food products including ${BRAND.productLines.map(pl => pl.name).join(' and ')}, sourced directly from Himalayan farms.`,
    url: `https://${BRAND.domain}`,
    siteName: BRAND.companyName,
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: BRAND.companyName,
    description: `${BRAND.tagline} Premium food products including ${BRAND.productLines.map(pl => pl.name).join(' and ')}, sourced directly from Himalayan farms.`
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
          </NextAuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
