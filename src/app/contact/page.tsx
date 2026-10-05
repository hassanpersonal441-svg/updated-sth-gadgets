import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import WhatsAppFloatingButton from '@/components/storefront/WhatsAppFloatingButton';
import { getActiveCategories, getSettings } from '@/lib/data';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact Customer Support | STH Gadgets Pakistan',
  description:
    'Get in touch with STH Gadgets customer support for order tracking, product inquiries, and support via WhatsApp or email.',
  alternates: { canonical: 'https://www.sthgadgets.store/contact' },
};

export default async function ContactPage() {
  const [settings, categories] = await Promise.all([getSettings(), getActiveCategories()]);
  const phone = settings?.whatsapp_number || '+92 348 9593671';
  const cleanPhone = phone.replace(/[^\d]/g, '');

  return (
    <>
      <Navbar categories={categories} settings={settings} />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 space-y-8">
        <div className="space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-bold text-[#00C4CC] uppercase tracking-wider">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <span>/</span>
            <span>Support</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white">
            Contact &amp; Customer Helpline
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Have a question about a product, warranty, or your order? Our team is active 24/7 to assist you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Direct Support Channels */}
          <div className="rounded-3xl border border-slate-800 bg-[#0B121E] p-6 sm:p-8 space-y-6 shadow-sm">
            <h2 className="font-display text-base sm:text-lg font-black text-[#00C4CC] uppercase tracking-wider">
              Direct Contact Channels
            </h2>

            <div className="space-y-4 text-xs sm:text-sm">
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition group"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white text-xl shadow-md">
                  💬
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400">WhatsApp Helpline</div>
                  <div className="font-mono font-black text-sm sm:text-base text-white group-hover:text-emerald-300">
                    {phone}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    Instant Replies &amp; Order Placement
                  </span>
                </div>
              </a>

              <a
                href={`mailto:${settings?.email || 'support@sthgadgets.store'}`}
                className="flex items-center gap-4 p-3.5 rounded-2xl border border-slate-800 bg-[#060A11] hover:border-[#00C4CC]/50 transition group"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#00C4CC]/20 text-[#00C4CC] text-xl">
                  ✉️
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400">Email Inquiries</div>
                  <div className="font-mono font-bold text-xs sm:text-sm text-white group-hover:text-[#00C4CC]">
                    {settings?.email || 'support@sthgadgets.store'}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Corporate &amp; Bulk Orders
                  </span>
                </div>
              </a>

              <div className="flex items-center gap-4 p-3.5 rounded-2xl border border-slate-800 bg-[#060A11]">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#00C4CC]/20 text-[#00C4CC] text-xl">
                  📍
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400">Head Office</div>
                  <div className="font-bold text-xs sm:text-sm text-white">
                    {settings?.address || 'Lahore, Punjab, Pakistan'}
                  </div>
                  <span className="text-[10px] text-slate-400">Nationwide Warehouses</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Business Hours & Trust */}
          <div className="rounded-3xl border border-slate-800 bg-[#0B121E] p-6 sm:p-8 space-y-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="font-display text-base sm:text-lg font-black text-[#00C4CC] uppercase tracking-wider">
                Support Hours &amp; Guarantee
              </h2>
              <div className="space-y-3 text-xs sm:text-sm text-slate-300">
                <div className="flex justify-between border-b border-slate-800 pb-2.5">
                  <span className="text-slate-400">Monday – Saturday:</span>
                  <span className="text-white font-bold">10:00 AM – 9:00 PM</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2.5">
                  <span className="text-slate-400">Sunday Helpline:</span>
                  <span className="text-[#00C4CC] font-bold">Active on WhatsApp</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2.5">
                  <span className="text-slate-400">Online Order Placement:</span>
                  <span className="text-emerald-400 font-bold">24 / 7 Live</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 space-y-1">
              <span className="text-xs font-black text-[#00C4CC] uppercase tracking-wider block">
                🛡️ Official Tech Promise
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                All products carry checking warranty and guaranteed authenticity. If you receive a defective item, we replace it quickly!
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer settings={settings} />
      <WhatsAppFloatingButton whatsappNumber={settings?.whatsapp_number ?? null} />
    </>
  );
}
