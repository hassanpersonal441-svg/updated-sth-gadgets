import { notFound } from 'next/navigation';
import TopTicker from '@/components/storefront/TopTicker';
import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import WhatsAppFloatingButton from '@/components/storefront/WhatsAppFloatingButton';
import ProductDetailClient from '@/components/storefront/ProductDetailClient';
import RelatedProducts from '@/components/storefront/RelatedProducts';
import { getProductBySlug, getSettings, getActiveCategories, getAllActiveProducts } from '@/lib/data';
import type { Metadata } from 'next';

// Incremental Static Regeneration (ISR): Cache statically & revalidate in background every 60s
export const revalidate = 60;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sthgadgets.store';

export async function generateMetadata({ params }: { params: any }): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || params?.slug;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const productUrl = `${siteUrl}/products/${product.slug}`;
  const images = (product.product_images && product.product_images.length > 0
    ? product.product_images.map((i) => i.image_url)
    : ['/images/logo.png']
  ).map((img) => (img.startsWith('http') ? img : `${siteUrl}${img.startsWith('/') ? '' : '/'}${img}`));

  const pageTitle = product.seo_title || `${product.name} | STH Gadgets`;
  const desc = product.meta_description || product.seo_description || product.short_description || product.description?.slice(0, 160) || `Buy ${product.name} at official rates on STH Gadgets Pakistan.`;
  const altText = product.image_alt_text || product.name;

  return {
    title: pageTitle,
    description: desc,
    keywords: product.seo_keywords
      ? (Array.isArray(product.seo_keywords) ? product.seo_keywords : product.seo_keywords.split(',').map((k: string) => k.trim()))
      : undefined,
    alternates: {
      canonical: productUrl,
    },
    openGraph: {
      title: pageTitle,
      description: desc,
      url: productUrl,
      siteName: 'STH Gadgets',
      type: 'article',
      images: images.map((img) => ({
        url: img,
        alt: altText,
      })),
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
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

  const productImages = (
    product.product_images && product.product_images.length > 0
      ? product.product_images.map((i) => i.image_url)
      : ['/images/logo.png']
  ).map((img) => (img.startsWith('http') ? img : `${siteUrl}${img.startsWith('/') ? '' : '/'}${img}`));

  const freeThreshold = settings?.free_shipping_threshold ?? 5000;
  const isFreeShipping = freeThreshold > 0 && product.price >= freeThreshold;
  const deliveryCharge = isFreeShipping ? 0 : (settings?.delivery_charges ?? 200);

  const validFromDate = product.created_at
    ? new Date(product.created_at).toISOString().split('T')[0]
    : '2024-01-01';

  // Schema.org Product JSON-LD Structured Data
  const productSchema = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.seo_title || product.name,
    image: productImages,
    description: product.seo_description || product.meta_description || product.short_description || product.description || product.name,
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
      validFrom: validFromDate,
      itemCondition: 'https://schema.org/NewCondition',
      availability:
        product.stock_status === 'out_of_stock'
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'STH Gadgets',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: deliveryCharge,
          currency: 'PKR',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'PK',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 1,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 2,
            maxValue: 4,
            unitCode: 'DAY',
          },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'PK',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
        returnShippingFeesAmount: {
          '@type': 'MonetaryAmount',
          value: 0,
          currency: 'PKR',
        },
        url: `${siteUrl}/return-policy`,
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
