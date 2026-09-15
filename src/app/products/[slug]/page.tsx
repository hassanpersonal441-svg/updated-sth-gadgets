import { notFound } from 'next/navigation';
import TopTicker from '@/components/storefront/TopTicker';
import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import WhatsAppFloatingButton from '@/components/storefront/WhatsAppFloatingButton';
import ProductDetailClient from '@/components/storefront/ProductDetailClient';
import RelatedProducts from '@/components/storefront/RelatedProducts';
import { getProductBySlug, getSettings, getActiveCategories, getAllActiveProducts } from '@/lib/data';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: any }): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || params?.slug;
  const product = await getProductBySlug(slug);
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

export default async function ProductDetailPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || params?.slug;
  const [product, settings, categories, allProducts] = await Promise.all([
    getProductBySlug(slug),
    getSettings(),
    getActiveCategories(),
    getAllActiveProducts(),
  ]);

  if (!product) notFound();

  // Filter related products in same category or general active products
  const categoryProducts = allProducts.filter(
    (p) => p.category_id === product.category_id && p.id !== product.id
  );
  const relatedList = categoryProducts.length >= 2 ? categoryProducts : allProducts;

  return (
    <>
      <TopTicker settings={settings} />
      <Navbar categories={categories} settings={settings} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <ProductDetailClient product={product} settings={settings} />
        <RelatedProducts
          products={relatedList}
          currentProductId={product.id}
          settings={settings}
        />
      </main>

      <Footer settings={settings} />
      <WhatsAppFloatingButton whatsappNumber={settings?.whatsapp_number ?? null} />
    </>
  );
}
