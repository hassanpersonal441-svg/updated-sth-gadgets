import Image from 'next/image';
import Link from 'next/link';
import type { Settings } from '@/types/database';

export default function Footer({ settings }: { settings: Settings | null }) {
  const cleanPhone = (settings?.whatsapp_number || '923489593671').replace(/[^0-9]/g, '');

  return (
    <footer className="border-t border-base-border bg-base-raised">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <Image
              src={settings?.logo_url || '/images/logo.png'}
              alt={settings?.business_name || 'STH Gadgets'}
              width={36}
              height={36}
              className="rounded-full border border-[#00C4CC]/40"
            />
            <span className="font-display text-lg font-semibold text-silver-bright">
              {settings?.business_name || 'STH Gadgets'}
            </span>
          </div>
          <p className="mt-3 max-w-xs text-xs sm:text-sm text-silver-dim leading-relaxed">
            Premium mobile accessories delivered fast across Pakistan — power banks, earbuds, fast chargers, and cables with Cash on Delivery.
          </p>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-silver-bright">Shop Categories</h4>
          <ul className="mt-3 space-y-2 text-xs sm:text-sm text-silver-dim">
            <li><Link href="/products?category=power-banks" className="hover:text-electric-bright transition">Power Banks</Link></li>
            <li><Link href="/products?category=wireless-earbuds" className="hover:text-electric-bright transition">Wireless Earbuds</Link></li>
            <li><Link href="/products?category=type-c-cables" className="hover:text-electric-bright transition">Fast Chargers & Cables</Link></li>
            <li><Link href="/products" className="hover:text-electric-bright transition">All Gadgets</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-silver-bright">WhatsApp Orders</h4>
          <div className="mt-3 space-y-2.5 text-xs sm:text-sm text-silver-dim">
            <p>Fast order verification & live dispatch tracking on WhatsApp.</p>
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] hover:bg-[#20BD5A] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
            >
              <span>Chat on WhatsApp</span>
              <span>→</span>
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-silver-bright">Our Guarantee</h4>
          <ul className="mt-3 space-y-2 text-xs sm:text-sm text-silver-dim">
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Cash on Delivery Nationwide</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>7-Day Checking Warranty</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>100% Original Products</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Fast 2–4 Day Dispatch</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-base-border py-4 text-center text-xs text-silver-dim">
        © {new Date().getFullYear()} {settings?.business_name || 'STH Gadgets'}. All rights reserved.
      </div>
    </footer>
  );
}
