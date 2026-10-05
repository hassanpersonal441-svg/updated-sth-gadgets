import Image from 'next/image';
import Link from 'next/link';
import type { Settings } from '@/types/database';

export default function Footer({ settings }: { settings: Settings | null }) {
  const cleanPhone = (settings?.whatsapp_number || '923489593671').replace(/[^0-9]/g, '');

  return (
    <footer className="border-t border-slate-800/80 bg-[#05080E] text-[#CBD5E1] pb-16 lg:pb-0 transition-colors content-visibility-auto">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        {/* Col 1: Store Brand & About */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-[#00C4CC] shadow-[0_0_12px_rgba(0,196,204,0.4)]">
              <Image
                src={settings?.logo_url || '/images/logo.png'}
                alt={settings?.business_name || 'STH Gadgets'}
                fill
                className="object-cover rounded-full"
              />
            </div>
            <div>
              <span className="block font-display text-base font-black tracking-wider uppercase text-white">
                STH <span className="text-[#00C4CC]">Gadgets</span>
              </span>
              <span className="block text-[10.5px] font-semibold text-slate-400">
                Official Rates &amp; Original Tech
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-200 dark:text-white leading-relaxed max-w-xs font-normal">
            Pakistan’s trusted source for 100% original mobile accessories, fast chargers, power banks, wireless earbuds, smart watches, and premium heavy-duty cables.
          </p>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 pt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>100% Official Guarantee</span>
          </div>
        </div>

        {/* Col 2: Quick Links */}
        <div>
          <h4 className="font-display text-xs font-black uppercase tracking-wider text-[#00C4CC]">
            Quick Links
          </h4>
          <ul className="mt-3.5 space-y-2 text-xs text-slate-300">
            <li>
              <Link href="/products" className="hover:text-[#00C4CC] transition duration-150">
                All Products &amp; Catalog
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-[#00C4CC] transition duration-150">
                Customer Support Helpline
              </Link>
            </li>
            <li>
              <Link href="/products?sort=discount" className="hover:text-[#00C4CC] transition duration-150">
                Hot Deals &amp; Discounts
              </Link>
            </li>
            <li>
              <Link href="/products?sort=newest" className="hover:text-[#00C4CC] transition duration-150">
                New Arrivals
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Customer Support & Contact Info */}
        <div>
          <h4 className="font-display text-xs font-black uppercase tracking-wider text-[#00C4CC]">
            Contact &amp; Support
          </h4>
          <div className="mt-3.5 space-y-2.5 text-xs text-slate-300">
            <div className="flex items-start gap-2.5">
              <span className="text-base text-[#00C4CC]">📍</span>
              <span className="text-slate-300 font-medium">
                {settings?.address || 'Lahore, Punjab, Pakistan'}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-base text-[#00C4CC]">📞</span>
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-300 hover:text-[#00C4CC] font-mono font-bold transition"
              >
                {settings?.whatsapp_number || '+92 348 9593671'}
              </a>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-base text-[#00C4CC]">✉️</span>
              <a
                href={`mailto:${settings?.email || 'support@sthgadgets.store'}`}
                className="text-slate-300 hover:text-[#00C4CC] transition"
              >
                {settings?.email || 'support@sthgadgets.store'}
              </a>
            </div>
          </div>
        </div>

        {/* Col 4: Store Policy & Guarantee */}
        <div>
          <h4 className="font-display text-xs font-black uppercase tracking-wider text-[#00C4CC]">
            Store Policies
          </h4>
          <ul className="mt-3.5 space-y-2 text-xs text-slate-300">
            <li>
              <Link href="/shipping-policy" className="hover:text-[#00C4CC] transition duration-150">
                Shipping &amp; Delivery Policy
              </Link>
            </li>
            <li>
              <Link href="/return-policy" className="hover:text-[#00C4CC] transition duration-150">
                Return &amp; Replacement Guarantee
              </Link>
            </li>
            <li>
              <Link href="/privacy-policy" className="hover:text-[#00C4CC] transition duration-150">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-[#00C4CC] transition duration-150">
                Terms &amp; Conditions
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Copyright Bar */}
      <div className="border-t border-slate-800/80 bg-[#03060A] px-4 py-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} STH Gadgets. All rights reserved.</span>
          <span className="text-[11px] text-slate-500">
            Official Best Rates • Guaranteed 100% Genuine Tech
          </span>
        </div>
      </div>
    </footer>
  );
}
