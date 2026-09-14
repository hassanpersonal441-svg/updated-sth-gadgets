import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
  display: 'swap',
});
const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'STH Gadgets — Premium Mobile Accessories',
    template: '%s | STH Gadgets',
  },
  description:
    'STH Gadgets — power banks, wireless earbuds, chargers, cables, covers, speakers and smart watches. Order directly on WhatsApp.',
  openGraph: {
    title: 'STH Gadgets — Premium Mobile Accessories',
    description: 'Power banks, earbuds, chargers, cables, covers, speakers and smart watches.',
    siteName: 'STH Gadgets',
    type: 'website',
    images: ['/images/logo.png'],
  },
  icons: { icon: '/images/logo.png' },
};

import dynamic from 'next/dynamic';
import { CartProvider } from '@/context/CartContext';

const CartDrawer = dynamic(() => import('@/components/cart/CartDrawer'), { ssr: false });
const CheckoutModal = dynamic(() => import('@/components/cart/CheckoutModal'), { ssr: false });
const FloatingCartButton = dynamic(() => import('@/components/cart/FloatingCartButton'), { ssr: false });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-body bg-base text-silver antialiased">
        <CartProvider>
          {children}
          <CartDrawer />
          <CheckoutModal />
          <FloatingCartButton />
        </CartProvider>
      </body>
    </html>
  );
}
