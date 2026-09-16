'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { Category, Settings } from '@/types/database';
import { useCart } from '@/context/CartContext';

import ThemeToggle from '@/components/theme/ThemeToggle';

interface NavbarProps {
  categories: Category[];
  settings?: Settings | null;
}

export default function Navbar({ categories, settings }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  const { totalItems, openCart } = useCart();
  const router = useRouter();

  const phone = settings?.whatsapp_number || '+923489593671';
  const cleanPhone = phone.replace(/[^\d]/g, '');

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/products?q=${encodeURIComponent(query.trim())}`);
      setMobileSearchOpen(false);
      setMobileMenuOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-[#080D15]/95 backdrop-blur-md text-[#C9D2DB]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Brand Section */}
        <Link href="/" className="flex shrink-0 items-center gap-3.5 group">
          <div className="relative h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-full border-2 border-[#00C4CC] bg-black p-0.5 shadow-[0_0_16px_rgba(0,196,204,0.45)] transition group-hover:scale-105">
            <Image
              src={settings?.logo_url || '/images/logo.png'}
              alt={settings?.business_name || 'STH Gadgets'}
              fill
              className="object-cover rounded-full"
              priority
            />
          </div>
          <div>
            <span className="block font-display text-xl sm:text-2xl font-black tracking-wider text-white group-hover:text-[#00C4CC] transition uppercase">
              {settings?.business_name || 'STH GADGETS'}
            </span>
            <span className="hidden sm:block text-xs font-semibold text-[#00C4CC] tracking-wide">
              Mobile Accessories & Gadgets — Official Rates
            </span>
          </div>
        </Link>

        {/* Search Bar (Desktop) */}
        <form onSubmit={handleSearch} className="hidden max-w-md flex-1 items-center lg:flex">
          <div className="relative w-full">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fast chargers, power banks, earbuds..."
              className="w-full rounded-xl border border-slate-800 bg-[#0C1420] py-2 pl-4 pr-10 text-xs text-white placeholder:text-slate-500 focus:border-[#00C4CC] focus:outline-none focus:ring-1 focus:ring-[#00C4CC] shadow-inner transition"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-[#00C4CC]"
              aria-label="Search"
            >
              🔍
            </button>
          </div>
        </form>

        {/* Right Actions: Cart & Theme Toggle (Desktop & Mobile) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle Button */}
          {mounted && <ThemeToggle />}

          {/* Mobile Search Toggle */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-[#0C1420] text-slate-300 lg:hidden hover:border-[#00C4CC] hover:text-[#00C4CC]"
            aria-label="Search"
          >
            🔍
          </button>

          {/* Cart Button with Count Badge */}
          <button
            type="button"
            onClick={openCart}
            className="relative flex items-center gap-2 rounded-xl border border-slate-800 bg-[#0C1420] px-3 py-2 text-xs font-bold text-white hover:border-[#00C4CC] hover:text-[#00C4CC] transition shadow-sm"
            aria-label="Shopping Cart"
          >
            <span className="text-base">🛒</span>
            <span className="hidden sm:inline">Cart</span>
            {mounted && totalItems > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00C4CC] text-[10px] font-black text-slate-950 shadow-[0_0_8px_rgba(0,196,204,0.6)]">
                {totalItems}
              </span>
            )}
          </button>

          {/* All Products Catalog Button (Desktop & Tablet) */}
          <Link
            href="/products"
            className="hidden sm:flex items-center gap-2 rounded-xl border border-[#00C4CC]/50 bg-[#00C4CC]/10 hover:bg-[#00C4CC] px-3.5 py-2 font-display text-xs font-bold text-[#00C4CC] hover:text-black shadow-[0_0_12px_rgba(0,196,204,0.2)] transition hover:scale-[1.02]"
          >
            <span>🛍️</span>
            <span>All Products</span>
          </Link>

          {/* Hamburger Menu Toggle for Mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-[#0C1420] text-slate-300 md:hidden hover:border-[#00C4CC]"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Expandable Search Input (Mobile) */}
      {mobileSearchOpen && (
        <div className="border-t border-slate-800 bg-[#0C1420] p-3 lg:hidden animate-fadeIn">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-[#00C4CC] focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="rounded-xl bg-[#00C4CC] px-4 py-2 text-xs font-bold text-slate-950"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* Mobile Slide-Over Drawer Navigation */}
      {mounted && mobileMenuOpen && (
        <div className="border-t border-slate-800 bg-[#080D15] p-5 md:hidden animate-fadeIn space-y-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#00C4CC]">
            Navigation Menu
          </div>
          <nav className="flex flex-col gap-2.5 font-display text-sm">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl border border-slate-800 bg-[#0C1420] px-4 py-2.5 font-semibold text-white hover:text-[#00C4CC]"
            >
              🏠 Home
            </Link>
            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl border border-slate-800 bg-[#0C1420] px-4 py-2.5 font-semibold text-white hover:text-[#00C4CC]"
            >
              🛍️ All Products
            </Link>
            <Link
              href="/products?sort=discount"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl border border-slate-800 bg-[#0C1420] px-4 py-2.5 font-semibold text-amber-400 hover:text-amber-300"
            >
              🔥 Hot Deals
            </Link>
            <Link
              href="/products?sort=newest"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl border border-slate-800 bg-[#0C1420] px-4 py-2.5 font-semibold text-cyan-400 hover:text-cyan-300"
            >
              ✨ New Arrivals
            </Link>

            {/* Mobile Categories list */}
            <div className="pt-2">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Categories
              </span>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/products?category=${c.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-2 text-xs text-slate-300 hover:text-[#00C4CC]"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
