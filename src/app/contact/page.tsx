import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import WhatsAppFloatingButton from '@/components/storefront/WhatsAppFloatingButton';
import { getActiveCategories, getSettings } from '@/lib/data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us | STH Gadgets Pakistan',
  description:
    'Get in touch with STH Gadgets customer support for order tracking, product inquiries, and wholesale requests via WhatsApp or email.',
  alternates: { canonical: 'https://www.sthgadgets.store/contact' },
};

export default async function ContactPage() {
  const [settings, categories] = await Promise.all([getSettings(), getActiveCategories()]);
  const phone = settings?.whatsapp_number || '+92 348 9593671';
  const cleanPhone = phone.replace(/[^\d]/g, '');

  return (
    <>
      <Navbar categories={categories} settings={settings} />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl sm:text-4xl font-black text-silver-bright mb-2">
          Contact Us
        </h1>
        <p className="text-sm text-silver-dim mb-8">
          Have a question about a product, warranty, or your order? We are here to help you!
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-white">Direct Support</h2>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">💬</span>
                <div>
                  <div className="font-semibold text-white">WhatsApp Helpline</div>
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00C4CC] hover:underline font-mono"
                  >
                    {phone}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xl">✉️</span>
                <div>
                  <div className="font-semibold text-white">Email Address</div>
                  <a
                    href={`mailto:${settings?.email || 'support@sthgadgets.com'}`}
                    className="text-[#00C4CC] hover:underline font-mono"
                  >
                    {settings?.email || 'support@sthgadgets.com'}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-xl">📍</span>
                <div>
                  <div className="font-semibold text-white">Main Office Location</div>
                  <p className="text-silver-dim text-xs">
                    {settings?.address || 'Lahore, Punjab, Pakistan'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-white">Business Hours</h2>
            <div className="space-y-2 text-xs sm:text-sm text-silver-dim">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span>Monday – Saturday:</span>
                <span className="text-white font-medium">10:00 AM – 9:00 PM</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span>Sunday:</span>
                <span className="text-[#00C4CC] font-medium">WhatsApp Support Only</span>
              </div>
              <p className="text-xs text-slate-400 pt-2">
                Orders placed online via WhatsApp are processed 24/7!
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
