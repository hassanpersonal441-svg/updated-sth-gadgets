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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sthgadgets.store';

export async function generateMetadata({ params }: { params: any }): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || params?.slug;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const productUrl = `${siteUrl}/products/${product.slug}`;
  const images = product.product_images?.map((i) => i.image_url) || ['/images/logo.png'];
  const desc = product.short_description || product.description?.slice(0, 160) || `Buy ${product.name} at official rates on STH Gadgets Pakistan.`;

  return {
    title: `${product.name} | STH Gadgets`,
    description: desc,
    alternates: {
      canonical: productUrl,
    },
    openGraph: {
      title: `${product.name} | STH Gadgets`,
      description: desc,
      url: productUrl,
      siteName: 'STH Gadgets',
      type: 'article',
      images: images.map((img) => ({
        url: img,
        alt: product.name,
      })),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} | STH Gadgets`,
      description: desc,
      images: [images[0] || '/images/logo.png'],
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

  const productImages = product.product_images?.map((i) => i.image_url) || ['/images/logo.png'];

  // Schema.org Product JSON-LD Structured Data
  const productSchema = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: productImages,
    description: product.short_description || product.description || product.name,
    sku: product.sku || product.id,
    mpn: product.id,
    brand: {
      '@type': 'Brand',
      name: 'STH Gadgets',
    },
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/products/${product.slug}`,
      priceCurrency: 'PKR',
      price: product.price,
      priceValidUntil: '2027-12-31',
      itemCondition: 'https://schema.org/NewCondition',
      availability:
        product.stock_status === 'out_of_stock'
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'STH Gadgets',
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
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
