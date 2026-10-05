import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import WhatsAppFloatingButton from '@/components/storefront/WhatsAppFloatingButton';
import { getActiveCategories, getSettings } from '@/lib/data';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | STH Gadgets Pakistan',
  description:
    'Learn how STH Gadgets collects, protects, and handles customer order data securely.',
  alternates: { canonical: 'https://www.sthgadgets.store/privacy-policy' },
};

export default async function PrivacyPolicyPage() {
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
            <span>Privacy</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-white">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            How we protect and handle your information with strict confidentiality.
          </p>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <div className="rounded-3xl border border-slate-800 bg-[#0B121E] p-6 space-y-2.5 shadow-sm">
            <h2 className="font-display text-base font-bold text-[#00C4CC] uppercase tracking-wider flex items-center gap-2">
              <span>🔒</span> 1. Information We Collect
            </h2>
            <p className="text-slate-400">
              When placing an order via our website or WhatsApp, we only collect necessary delivery details including your Full Name, WhatsApp Mobile Number, City, and Delivery Address.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-[#0B121E] p-6 space-y-2.5 shadow-sm">
            <h2 className="font-display text-base font-bold text-[#00C4CC] uppercase tracking-wider flex items-center gap-2">
              <span>🛡️</span> 2. Data Protection &amp; Confidentiality
            </h2>
            <p className="text-slate-400">
              Your personal details are used strictly for order fulfillment, courier booking, and customer service inquiries. We never sell, lease, or share your data with third-party advertisers.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-[#0B121E] p-6 space-y-2.5 shadow-sm">
            <h2 className="font-display text-base font-bold text-[#00C4CC] uppercase tracking-wider flex items-center gap-2">
              <span>📱</span> 3. WhatsApp Communications
            </h2>
            <p className="text-slate-400">
              We only message you to confirm order bookings, provide live courier tracking numbers, or respond to your customer support requests.
            </p>
          </div>
        </div>
      </main>
      <Footer settings={settings} />
      <WhatsAppFloatingButton whatsappNumber={settings?.whatsapp_number ?? null} />
    </>
  );
}
