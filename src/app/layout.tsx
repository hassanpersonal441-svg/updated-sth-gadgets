import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import ClientCartOverlays from '@/components/cart/ClientCartOverlays';
import PwaRegister from '@/components/pwa/PwaRegister';
import InstallPwaModal from '@/components/pwa/InstallPwaModal';

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

export const viewport: Viewport = {
  themeColor: '#00C4CC',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'STH Gadgets — Premium Mobile Accessories',
    template: '%s | STH Gadgets',
  },
  description:
    'STH Gadgets — power banks, wireless earbuds, chargers, cables, covers, speakers and smart watches. Order directly on WhatsApp.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'STH Gadgets',
  },
  openGraph: {
    title: 'STH Gadgets — Premium Mobile Accessories',
    description: 'Power banks, earbuds, chargers, cables, covers, speakers and smart watches.',
    siteName: 'STH Gadgets',
    type: 'website',
    images: ['/images/logo.png'],
  },
  icons: { icon: '/images/logo.png', apple: '/images/logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('sth_theme');
                  if (t === 'light') {
                    document.documentElement.setAttribute('data-theme', 'light');
                  } else if (t === 'dark') {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                    document.documentElement.setAttribute('data-theme', 'light');
                  } else {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="font-body bg-base text-silver antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <PwaRegister />
          <CartProvider>
            {children}
            <ClientCartOverlays />
            <InstallPwaModal />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
