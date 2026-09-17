import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import WhatsAppFloatingButton from '@/components/storefront/WhatsAppFloatingButton';
import { getActiveCategories, getSettings } from '@/lib/data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | STH Gadgets Pakistan',
  description:
    'Learn about STH Gadgets, Pakistan’s leading online store for 100% original mobile accessories, power banks, fast chargers, wireless earbuds, smart watches, and premium tech.',
  alternates: { canonical: 'https://www.sthgadgets.store/about' },
};

export default async function AboutPage() {
  const [settings, categories] = await Promise.all([getSettings(), getActiveCategories()]);

  return (
    <>
      <Navbar categories={categories} settings={settings} />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl sm:text-4xl font-black text-silver-bright mb-4">
          About STH Gadgets
        </h1>
        <p className="text-sm sm:text-base text-silver-dim leading-relaxed mb-6">
          Welcome to <strong className="text-[#00C4CC]">STH Gadgets</strong> — your premier destination for 100% original mobile accessories and high-performance tech gadgets across Pakistan.
        </p>

        <div className="space-y-6 text-sm text-silver-dim">
          <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-white">Our Mission</h2>
            <p className="leading-relaxed">
              Our mission is simple: to provide tech enthusiasts and everyday smartphone users in Pakistan with authentic, durable, and affordable accessories. We eliminate fake products and inflated prices by offering guaranteed official rates directly through fast Cash on Delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-5 space-y-2">
              <span className="text-2xl">⚡</span>
              <h3 className="font-display font-bold text-white">100% Genuine Products</h3>
              <p className="text-xs text-silver-dim">
                Every charger, cable, power bank, and earbud in our catalog is sourced from verified manufacturers with guaranteed quality inspection.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-5 space-y-2">
              <span className="text-2xl">🚚</span>
              <h3 className="font-display font-bold text-white">Nationwide COD</h3>
              <p className="text-xs text-silver-dim">
                We deliver fast via premium courier partners to Lahore, Karachi, Islamabad, Rawalpindi, Peshawar, Multan, and all cities across Pakistan.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-white">Why Shop With Us?</h2>
            <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-silver-dim">
              <li>Direct WhatsApp Order Support & Fast Verification</li>
              <li>Transparent Pricing with No Hidden Fees</li>
              <li>Easy Return & Replacement Assistance</li>
              <li>Exclusive Bundle Deals & Discount Coupons</li>
            </ul>
          </div>
        </div>
      </main>
      <Footer settings={settings} />
      <WhatsAppFloatingButton whatsappNumber={settings?.whatsapp_number ?? null} />
    </>
  );
}
