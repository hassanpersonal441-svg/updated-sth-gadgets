import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import WhatsAppFloatingButton from '@/components/storefront/WhatsAppFloatingButton';
import { getActiveCategories, getSettings } from '@/lib/data';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Return & Replacement Policy | STH Gadgets Pakistan',
  description:
    'Read our 7-day checking warranty and hassle-free return replacement policy on all mobile accessories at STH Gadgets.',
  alternates: { canonical: 'https://www.sthgadgets.store/return-policy' },
};

export default async function ReturnPolicyPage() {
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
            Return &amp; Replacement Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Hassle-free 7-day replacement guarantee on all original accessories.
          </p>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <div className="rounded-3xl border border-slate-800 bg-[#0B121E] p-6 space-y-2.5 shadow-sm">
            <h2 className="font-display text-base font-bold text-[#00C4CC] uppercase tracking-wider flex items-center gap-2">
              <span>🛡️</span> 1. 7-Day Checking Warranty
            </h2>
            <p className="text-slate-400">
              Every gadget purchased from STH Gadgets comes with a comprehensive 7-day checking warranty from the date of package delivery. If you encounter any technical defect or malfunction, we replace the unit.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-[#0B121E] p-6 space-y-2.5 shadow-sm">
            <h2 className="font-display text-base font-bold text-[#00C4CC] uppercase tracking-wider flex items-center gap-2">
              <span>📦</span> 2. Replacement Eligibility
            </h2>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li>Item must have original box, packaging, manuals, and accessories intact.</li>
              <li>Product must not be physically broken, water damaged, or burnt.</li>
              <li>Proof of purchase (invoice or WhatsApp order number) is required.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-[#0B121E] p-6 space-y-2.5 shadow-sm">
            <h2 className="font-display text-base font-bold text-[#00C4CC] uppercase tracking-wider flex items-center gap-2">
              <span>⚡</span> 3. How to Claim Replacement
            </h2>
            <p className="text-slate-400">
              Simply message our WhatsApp Helpline at <strong className="text-white font-mono">{settings?.whatsapp_number || '+92 348 9593671'}</strong> with a short video or picture demonstrating the issue and your order ID. Our team will verify and dispatch a replacement.
            </p>
          </div>
        </div>
      </main>
      <Footer settings={settings} />
      <WhatsAppFloatingButton whatsappNumber={settings?.whatsapp_number ?? null} />
    </>
  );
}
