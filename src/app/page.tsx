import type { Metadata } from 'next';
import TopTicker from '@/components/storefront/TopTicker';
import LiveStorefront from '@/components/storefront/LiveStorefront';
import Footer from '@/components/storefront/Footer';
import WhatsAppFloatingButton from '@/components/storefront/WhatsAppFloatingButton';
import { getSettings, getActiveCategories, getAllActiveProducts } from '@/lib/data';
import Link from 'next/link';
import BrandVoice from '@/components/brand/BrandVoice';

export const revalidate = 60;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sthgadgets.store';

export const metadata: Metadata = {
  title: 'STH Gadgets | Premium Mobile Accessories & Tech Gadgets in Pakistan',
  description:
    'Shop premium mobile accessories and tech gadgets at STH Gadgets Pakistan. Best prices on power banks, fast chargers, USB-C cables, wireless earbuds, Bluetooth speakers & more. Order via WhatsApp.',
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: 'STH Gadgets | Premium Mobile Accessories & Tech Gadgets in Pakistan',
    description:
      'Shop premium mobile accessories and tech gadgets at STH Gadgets Pakistan. Best prices on power banks, chargers, cables, earbuds and more.',
    url: siteUrl,
    type: 'website',
  },
};

export default async function HomePage() {
  const [settings, categories, products] = await Promise.all([
    getSettings(),
    getActiveCategories(),
    getAllActiveProducts(),
  ]);

  const businessName = settings?.business_name || 'STH Gadgets';

  return (
    <>
      {/* Brand voice — invisible, home-page-only, admin-controlled */}
      <BrandVoice enabled={settings?.brand_voice_enabled !== false} />

      {/* Top Moving Text Banner */}
      <TopTicker settings={settings} />

      {/* Main Storefront: Header + Search + Coupons + Controls + Categories + Products */}
      <main>
        <LiveStorefront
          initialProducts={products}
          categories={categories}
          settings={settings}
        />
      </main>

      {/*
        SEO-ONLY: Static server-rendered content visible to Googlebot.
        Hidden from users visually (sr-only) but fully crawlable.
        This prevents the "Soft 404" caused by Google seeing an empty JS shell.
      */}
      <section aria-hidden="false" className="sr-only">
        <h1>{businessName} – Mobile Accessories &amp; Gadgets Store in Pakistan</h1>
        <p>
          Welcome to {businessName}, Pakistan&apos;s trusted online store for premium mobile
          accessories and tech gadgets. We offer the best prices on power banks, fast chargers,
          USB-C cables, wireless earbuds, Bluetooth headphones, speakers, and more. Order easily
          via WhatsApp with fast delivery across Pakistan.
        </p>
        {categories.length > 0 && (
          <nav aria-label="Product categories">
            <h2>Browse by Category</h2>
            <ul>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link href={`/products?category=${cat.slug}`}>{cat.name}</Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        {products.length > 0 && (
          <div>
            <h2>Featured Products</h2>
            <ul>
              {products.slice(0, 20).map((p) => (
                <li key={p.id}>
                  <Link href={`/products/${p.slug}`}>
                    <strong>{p.name}</strong>
                    {p.short_description && <span> – {p.short_description}</span>}
                    <span> – Price: Rs. {p.price.toLocaleString('en-PK')}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <Footer settings={settings} />
      <WhatsAppFloatingButton whatsappNumber={settings?.whatsapp_number ?? null} />
    </>
  );
}
