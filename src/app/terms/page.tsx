import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import WhatsAppFloatingButton from '@/components/storefront/WhatsAppFloatingButton';
import { getActiveCategories, getSettings } from '@/lib/data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions | STH Gadgets Pakistan',
  description:
    'Read the terms of service and order policies governing the use of STH Gadgets e-commerce store.',
  alternates: { canonical: 'https://www.sthgadgets.store/terms' },
};

export default async function TermsPage() {
  const [settings, categories] = await Promise.all([getSettings(), getActiveCategories()]);

  return (
    <>
      <Navbar categories={categories} settings={settings} />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl sm:text-4xl font-black text-silver-bright mb-4">
          Terms & Conditions
        </h1>
        <div className="space-y-6 text-sm text-silver-dim leading-relaxed">
          <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-white">General Terms</h2>
            <p>
              By accessing or placing an order at STH Gadgets (sthgadgets.store), you agree to comply with our store policies, delivery guidelines, and replacement procedures.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-white">Pricing & Availability</h2>
            <p>
              All prices listed on STH Gadgets are in Pakistani Rupees (PKR / Rs.). Prices and stock availability are updated dynamically to reflect official rates.
            </p>
          </div>
        </div>
      </main>
      <Footer settings={settings} />
      <WhatsAppFloatingButton whatsappNumber={settings?.whatsapp_number ?? null} />
    </>
  );
}
