import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import WhatsAppFloatingButton from '@/components/storefront/WhatsAppFloatingButton';
import { getActiveCategories, getSettings } from '@/lib/data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | STH Gadgets Pakistan',
  description:
    'Read how STH Gadgets collects, protects, and uses customer data for secure order processing.',
  alternates: { canonical: 'https://www.sthgadgets.store/privacy-policy' },
};

export default async function PrivacyPolicyPage() {
  const [settings, categories] = await Promise.all([getSettings(), getActiveCategories()]);

  return (
    <>
      <Navbar categories={categories} settings={settings} />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl sm:text-4xl font-black text-silver-bright mb-4">
          Privacy Policy
        </h1>
        <div className="space-y-6 text-sm text-silver-dim leading-relaxed">
          <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-white">Data Protection</h2>
            <p>
              Your privacy is extremely important to us. STH Gadgets collects only the information necessary to fulfill your orders, including customer name, WhatsApp phone number, delivery address, and city.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-white">How We Use Your Information</h2>
            <p>
              Customer data is strictly used for order verification, shipping dispatch via courier services, order updates, and customer support. We never sell, rent, or trade your personal information to third parties.
            </p>
          </div>
        </div>
      </main>
      <Footer settings={settings} />
      <WhatsAppFloatingButton whatsappNumber={settings?.whatsapp_number ?? null} />
    </>
  );
}
