import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import WhatsAppFloatingButton from '@/components/storefront/WhatsAppFloatingButton';
import { getActiveCategories, getSettings } from '@/lib/data';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms & Conditions | STH Gadgets Pakistan',
  description:
    'Read the terms of service and order policies for STH Gadgets Pakistan.',
  alternates: { canonical: 'https://www.sthgadgets.store/terms' },
};

export default async function TermsPage() {
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
            <span>Terms</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-white">
            Terms &amp; Conditions
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Terms of ordering and service at STH Gadgets.
          </p>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <div className="rounded-3xl border border-slate-800 bg-[#0B121E] p-6 space-y-2.5 shadow-sm">
            <h2 className="font-display text-base font-bold text-[#00C4CC] uppercase tracking-wider flex items-center gap-2">
              <span>⚖️</span> 1. Product Authenticity &amp; Descriptions
            </h2>
            <p className="text-slate-400">
              We guarantee 100% genuine products directly sourced from verified original manufacturers. Specifications, photos, and features listed represent official manufacturer data.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-[#0B121E] p-6 space-y-2.5 shadow-sm">
            <h2 className="font-display text-base font-bold text-[#00C4CC] uppercase tracking-wider flex items-center gap-2">
              <span>💳</span> 2. Pricing &amp; Availability
            </h2>
            <p className="text-slate-400">
              All prices listed in PKR are direct rates. While we maintain live real-time rates, prices are subject to periodic updates based on market stock availability.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-[#0B121E] p-6 space-y-2.5 shadow-sm">
            <h2 className="font-display text-base font-bold text-[#00C4CC] uppercase tracking-wider flex items-center gap-2">
              <span>📦</span> 3. Order Verification &amp; Refusal
            </h2>
            <p className="text-slate-400">
              STH Gadgets reserves the right to verify orders by phone or WhatsApp before dispatch. In cases where contact details cannot be verified, the order may be cancelled.
            </p>
          </div>
        </div>
      </main>
      <Footer settings={settings} />
      <WhatsAppFloatingButton whatsappNumber={settings?.whatsapp_number ?? null} />
    </>
  );
}
