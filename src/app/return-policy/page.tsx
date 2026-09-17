import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import WhatsAppFloatingButton from '@/components/storefront/WhatsAppFloatingButton';
import { getActiveCategories, getSettings } from '@/lib/data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Return & Refund Policy | STH Gadgets Pakistan',
  description:
    'Read STH Gadgets return, replacement, and warranty terms for damaged or defective items in Pakistan.',
  alternates: { canonical: 'https://www.sthgadgets.store/return-policy' },
};

export default async function ReturnPolicyPage() {
  const [settings, categories] = await Promise.all([getSettings(), getActiveCategories()]);

  return (
    <>
      <Navbar categories={categories} settings={settings} />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl sm:text-4xl font-black text-silver-bright mb-4">
          Return & Replacement Policy
        </h1>
        <div className="space-y-6 text-sm text-silver-dim leading-relaxed">
          <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-white">1. 7-Day Replacement Guarantee</h2>
            <p>
              At STH Gadgets, we stand by the quality of our products. If you receive a product that is damaged, defective, or not working as expected, you can request a replacement within 7 days of receiving the parcel.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-white">2. Eligibility Conditions</h2>
            <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm">
              <li>Item must be in original condition with complete packaging and accessories.</li>
              <li>Defect must be manufacturing or transit damage (not physical breakage caused by user misuse).</li>
              <li>Proof of purchase or WhatsApp order reference must be provided.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-white">3. How to Request a Return</h2>
            <p>
              Simply contact our customer support on WhatsApp at <strong className="text-[#00C4CC]">{settings?.whatsapp_number || '+92 348 9593671'}</strong> with a short unboxing video or photo showing the defect. Our support team will guide you through the instant replacement process.
            </p>
          </div>
        </div>
      </main>
      <Footer settings={settings} />
      <WhatsAppFloatingButton whatsappNumber={settings?.whatsapp_number ?? null} />
    </>
  );
}
