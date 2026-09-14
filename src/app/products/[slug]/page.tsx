import { notFound } from 'next/navigation';
import TopTicker from '@/components/storefront/TopTicker';
import Footer from '@/components/storefront/Footer';
import WhatsAppFloatingButton from '@/components/storefront/WhatsAppFloatingButton';
import ProductDetailClient from '@/components/storefront/ProductDetailClient';
import { getProductBySlug, getSettings } from '@/lib/data';
import type { Metadata } from 'next';

export const revalidate = 30;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.short_description || product.description?.slice(0, 150),
    openGraph: {
      title: product.name,
      description: product.short_description,
      images: product.product_images?.map((i) => i.image_url) || [],
    },
  };
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const [product, settings] = await Promise.all([
    getProductBySlug(params.slug),
    getSettings(),
  ]);

  if (!product) notFound();

  return (
    <>
      {/* Top Moving Text Banner */}
      <TopTicker settings={settings} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ProductDetailClient product={product} settings={settings} />
      </main>
      <Footer settings={settings} />
      <WhatsAppFloatingButton whatsappNumber={settings?.whatsapp_number ?? null} />
    </>
  );
}
