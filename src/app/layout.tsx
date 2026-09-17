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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sthgadgets.store';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'STH Gadgets | Premium Mobile Accessories & Tech Gadgets in Pakistan',
    template: '%s | STH Gadgets',
  },
  description:
    'Shop premium mobile accessories and tech gadgets at STH Gadgets in Pakistan. Discover power banks, chargers, cables, earbuds, headphones, speakers and more.',
  keywords: [
    'mobile accessories Pakistan',
    'power bank Pakistan',
    'fast charger Pakistan',
    'wireless earbuds Pakistan',
    'USB C cable Pakistan',
    'Bluetooth headphones Pakistan',
    'STH Gadgets',
    'STH Gadgets Pakistan',
  ],
  authors: [{ name: 'STH Gadgets', url: siteUrl }],
  creator: 'STH Gadgets',
  publisher: 'STH Gadgets',
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'STH Gadgets',
  },
  openGraph: {
    title: 'STH Gadgets | Premium Mobile Accessories & Tech Gadgets in Pakistan',
    description:
      'Shop premium mobile accessories and tech gadgets at STH Gadgets in Pakistan. Discover power banks, chargers, cables, earbuds, headphones, speakers and more.',
    url: siteUrl,
    siteName: 'STH Gadgets',
    type: 'website',
    locale: 'en_PK',
    images: [
      {
        url: `${siteUrl}/images/logo.png`,
        width: 800,
        height: 800,
        alt: 'STH Gadgets Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'STH Gadgets | Premium Mobile Accessories & Tech Gadgets in Pakistan',
    description: 'Shop premium mobile accessories and tech gadgets at STH Gadgets in Pakistan.',
    images: [`${siteUrl}/images/logo.png`],
  },
  icons: { icon: '/images/logo.png', apple: '/images/logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLdSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'STH Gadgets',
        url: siteUrl,
        logo: `${siteUrl}/images/logo.png`,
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+923489593671',
          contactType: 'customer service',
          areaServed: 'PK',
          availableLanguage: ['en', 'ur'],
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'STH Gadgets',
        description:
          'Shop premium mobile accessories and tech gadgets at STH Gadgets in Pakistan. Discover power banks, chargers, cables, earbuds, headphones, speakers and more.',
        publisher: { '@id': `${siteUrl}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/products?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
        />
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
