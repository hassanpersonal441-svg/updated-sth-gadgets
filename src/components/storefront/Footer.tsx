import Image from 'next/image';
import Link from 'next/link';
import type { Settings } from '@/types/database';

export default function Footer({ settings }: { settings: Settings | null }) {
  const cleanPhone = (settings?.whatsapp_number || '923489593671').replace(/[^0-9]/g, '');

  return (
    <footer className="border-t border-slate-800/80 bg-[#060A10] text-[#C9D2DB] pb-16 lg:pb-0">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        {/* Col 1: Store Brand & About */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-[#00C4CC] p-0.5 shadow-[0_0_10px_rgba(0,196,204,0.3)]">
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
              <span className="block text-[10px] font-semibold text-slate-400">
                Official Rates & Original Tech
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
            Pakistan’s trusted source for 100% original mobile accessories, fast chargers, power banks, wireless earbuds, smart watches, and premium cables.
          </p>
        </div>

        {/* Col 2: Quick Links */}
        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#00C4CC]">
            Quick Links
          </h4>
          <ul className="mt-3 space-y-2 text-xs text-slate-300">
            <li>
              <Link href="/products" className="hover:text-[#00C4CC] transition">
                All Products & Catalog
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-[#00C4CC] transition">
                About STH Gadgets
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-[#00C4CC] transition">
                Contact Customer Support
              </Link>
            </li>
            <li>
              <Link href="/products?sort=discount" className="hover:text-[#00C4CC] transition">
                Hot Deals & Promotions
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Customer Support & Contact Info */}
        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#00C4CC]">
            Contact & Support
          </h4>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <span className="text-[#00C4CC]">📍</span>
              <span className="text-slate-300 font-medium">{settings?.address || 'Lahore, Pakistan'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#00C4CC]">📞</span>
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-300 hover:text-[#00C4CC] font-mono font-medium transition"
              >
                {settings?.whatsapp_number || '+92 348 9593671'}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#00C4CC]">✉️</span>
              <a href={`mailto:${settings?.email || 'support@sthgadgets.com'}`} className="text-slate-300 hover:text-[#00C4CC] transition">
                {settings?.email || 'support@sthgadgets.com'}
              </a>
            </div>
          </div>
        </div>

        {/* Col 4: Store Policy & Guarantee */}
        <div>
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[#00C4CC]">
            Store Policies
          </h4>
          <ul className="mt-3 space-y-2 text-xs text-slate-300">
            <li>
              <Link href="/shipping-policy" className="hover:text-[#00C4CC] transition">
                Shipping & Delivery Policy
              </Link>
            </li>
            <li>
              <Link href="/return-policy" className="hover:text-[#00C4CC] transition">
                Return & Replacement Guarantee
              </Link>
            </li>
            <li>
              <Link href="/privacy-policy" className="hover:text-[#00C4CC] transition">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-[#00C4CC] transition">
                Terms & Conditions
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Copyright Bar */}
      <div className="border-t border-slate-800/80 bg-[#04070C] px-4 py-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} STH Gadgets. All rights reserved.</span>
          <span className="text-[11px] text-slate-600">
            Official Rates • Guaranteed Original Accessories
          </span>
        </div>
      </div>
    </footer>
  );
}
