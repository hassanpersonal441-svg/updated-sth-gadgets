import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import ClientCartOverlays from '@/components/cart/ClientCartOverlays';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <body className="font-body bg-base text-silver antialiased" suppressHydrationWarning>
        <CartProvider>
          {children}
          <ClientCartOverlays />
        </CartProvider>
      </body>
    </html>
  );
}
