import TopTicker from '@/components/storefront/TopTicker';
import LiveStorefront from '@/components/storefront/LiveStorefront';
import Footer from '@/components/storefront/Footer';
import WhatsAppFloatingButton from '@/components/storefront/WhatsAppFloatingButton';
import { getSettings, getActiveCategories, getAllActiveProducts } from '@/lib/data';

export const revalidate = 60;

export default async function HomePage() {
  const [settings, categories, products] = await Promise.all([
    getSettings(),
    getActiveCategories(),
    getAllActiveProducts(),
  ]);

  return (
    <>
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

      <Footer settings={settings} />
      <WhatsAppFloatingButton whatsappNumber={settings?.whatsapp_number ?? null} />
    </>
  );
}
