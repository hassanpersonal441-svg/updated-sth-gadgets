import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import WhatsAppFloatingButton from '@/components/storefront/WhatsAppFloatingButton';
import { getActiveCategories, getSettings } from '@/lib/data';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Shipping & Delivery Policy | STH Gadgets Pakistan',
  description:
    'Read STH Gadgets shipping & delivery policy for fast nationwide Cash on Delivery orders across Pakistan.',
  alternates: { canonical: 'https://www.sthgadgets.store/shipping-policy' },
};

export default async function ShippingPolicyPage() {
  const [settings, categories] = await Promise.all([getSettings(), getActiveCategories()]);

  return (
    <>
      <Navbar categories={categories} settings={settings} />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#00C4CC] uppercase tracking-wider">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <span>/</span>
            <span>Policy</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-white">
            Shipping &amp; Delivery Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Fast, secure, and reliable nationwide Cash on Delivery shipping details.
          </p>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <div className="rounded-3xl border border-slate-800 bg-[#0B121E] p-6 space-y-2.5 shadow-sm">
            <h2 className="font-display text-base font-bold text-[#00C4CC] uppercase tracking-wider flex items-center gap-2">
              <span>🚚</span> 1. Nationwide Cash on Delivery (COD)
            </h2>
            <p className="text-slate-400">
              STH Gadgets delivers original gadgets and accessories across all cities and towns in Pakistan through our trusted courier partners (Leopards, TCS, Trax, M&amp;P, CallCourier). Pay cash directly at your doorstep when your order arrives.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-[#0B121E] p-6 space-y-2.5 shadow-sm">
            <h2 className="font-display text-base font-bold text-[#00C4CC] uppercase tracking-wider flex items-center gap-2">
              <span>⏱️</span> 2. Delivery Timelines
            </h2>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li>
                <strong className="text-white">Major Cities (Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad):</strong> 2 to 3 Working Days.
              </li>
              <li>
                <strong className="text-white">Other Cities, Towns &amp; Remote Areas:</strong> 3 to 5 Working Days.
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-[#0B121E] p-6 space-y-2.5 shadow-sm">
            <h2 className="font-display text-base font-bold text-[#00C4CC] uppercase tracking-wider flex items-center gap-2">
              <span>💵</span> 3. Shipping Charges &amp; Free Delivery
            </h2>
            <p className="text-slate-400">
              Standard flat shipping rate is PKR 200 nationwide. Orders above PKR 5,000 qualify for <strong className="text-emerald-400 font-bold">100% FREE SHIPPING</strong> automatically at checkout.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-[#0B121E] p-6 space-y-2.5 shadow-sm">
            <h2 className="font-display text-base font-bold text-[#00C4CC] uppercase tracking-wider flex items-center gap-2">
              <span>🔍</span> 4. Order Confirmation &amp; Tracking
            </h2>
            <p className="text-slate-400">
              After placing your order, our representative verifies your details via WhatsApp or Phone call. Once dispatched, a live tracking number is sent to your WhatsApp number.
            </p>
          </div>
        </div>
      </main>
      <Footer settings={settings} />
      <WhatsAppFloatingButton whatsappNumber={settings?.whatsapp_number ?? null} />
    </>
  );
}
