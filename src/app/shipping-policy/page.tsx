import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import WhatsAppFloatingButton from '@/components/storefront/WhatsAppFloatingButton';
import { getActiveCategories, getSettings } from '@/lib/data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipping Policy | STH Gadgets Pakistan',
  description:
    'Read STH Gadgets shipping & delivery policy for fast nationwide Cash on Delivery orders across Pakistan.',
  alternates: { canonical: 'https://www.sthgadgets.store/shipping-policy' },
};

export default async function ShippingPolicyPage() {
  const [settings, categories] = await Promise.all([getSettings(), getActiveCategories()]);

  return (
    <>
      <Navbar categories={categories} settings={settings} />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl sm:text-4xl font-black text-silver-bright mb-4">
          Shipping & Delivery Policy
        </h1>
        <div className="space-y-6 text-sm text-silver-dim leading-relaxed">
          <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-white">1. Nationwide Cash on Delivery (COD)</h2>
            <p>
              STH Gadgets delivers products all across Pakistan using trusted courier services (Leopards, TCS, M&P, CallCourier, Trax). Cash on Delivery is available for all major cities and towns.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-white">2. Delivery Timelines</h2>
            <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm">
              <li><strong className="text-white">Major Cities (Lahore, Karachi, Islamabad, Rawalpindi):</strong> 2 to 3 Working Days</li>
              <li><strong className="text-white">Other Cities & Remote Areas:</strong> 3 to 5 Working Days</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-white">3. Shipping Charges</h2>
            <p>
              Standard shipping fee is PKR 200 per order. Free Shipping is automatically unlocked for orders exceeding PKR 5,000!
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-white">4. Order Verification</h2>
            <p>
              Before dispatch, our team confirms order details and delivery address via WhatsApp or Phone call. Once verified, a tracking ID is shared with you.
            </p>
          </div>
        </div>
      </main>
      <Footer settings={settings} />
      <WhatsAppFloatingButton whatsappNumber={settings?.whatsapp_number ?? null} />
    </>
  );
}
