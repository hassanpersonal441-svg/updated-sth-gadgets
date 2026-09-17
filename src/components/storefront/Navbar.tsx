'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import type { Category, Product, Settings } from '@/types/database';
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
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const { totalItems, openCart } = useCart();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live autocomplete search effect
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          setSearchResults(data.products.slice(0, 6));
          setShowDropdown(true);
        }
      } catch {
        // ignore fetch error
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      setShowDropdown(false);
      setMobileSearchOpen(false);
      setMobileMenuOpen(false);
      router.push(`/products?q=${encodeURIComponent(query.trim())}`);
    }
  }

  function handleSelectProduct(slug: string) {
    setShowDropdown(false);
    setMobileSearchOpen(false);
    setMobileMenuOpen(false);
    setQuery('');
    router.push(`/products/${slug}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-[#080D15]/95 backdrop-blur-md text-[#C9D2DB]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Brand Section */}
        <Link href="/" className="flex shrink-0 items-center gap-3.5 group">
          <div className="relative h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-xl border border-[#00C4CC]/60 bg-black/70 p-0.5 shadow-[0_0_16px_rgba(0,196,204,0.45)] transition group-hover:scale-105">
            <Image
              src={settings?.logo_url || '/images/logo.png'}
              alt={settings?.business_name || 'STH Gadgets'}
              fill
              className="object-contain"
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
        <div ref={searchContainerRef} className="relative hidden max-w-md flex-1 lg:block">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (query.trim() && searchResults.length > 0) setShowDropdown(true);
              }}
              placeholder="Search fast chargers, power banks, earbuds..."
              className="w-full rounded-xl border border-slate-800 bg-[#0C1420] py-2.5 pl-4 pr-10 text-xs text-white placeholder:text-slate-500 focus:border-[#00C4CC] focus:outline-none focus:ring-1 focus:ring-[#00C4CC] shadow-inner transition font-medium"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-[#00C4CC] transition"
              aria-label="Search"
            >
              🔍
            </button>
          </form>

          {/* Autocomplete Suggestions Dropdown (Desktop) */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-2 z-50 overflow-hidden rounded-2xl border border-slate-800 bg-[#0C1420] p-2 shadow-2xl animate-fadeIn">
              {isSearching ? (
                <div className="p-3 text-center text-xs text-silver-dim">
                  <span>⚡ Searching items...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#00C4CC]">
                    Matching Products ({searchResults.length})
                  </div>
                  {searchResults.map((prod) => {
                    const img =
                      prod.product_images?.find((i) => i.is_primary)?.image_url ||
                      prod.product_images?.[0]?.image_url ||
                      '/images/logo.png';

                    return (
                      <button
                        key={prod.id}
                        onClick={() => handleSelectProduct(prod.slug)}
                        className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-[#080D15] transition group border border-transparent hover:border-slate-800"
                      >
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-black/40 p-0.5">
                          <Image src={img} alt={prod.name} fill className="object-contain" sizes="40px" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-xs font-bold text-white group-hover:text-[#00C4CC] transition">
                            {prod.name}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-silver-dim mt-0.5">
                            <span className="font-mono font-bold text-[#00C4CC]">
                              PKR {prod.price.toLocaleString('en-PK')}
                            </span>
                            {prod.category?.name && (
                              <span className="rounded bg-slate-800/60 px-1.5 py-0.2 text-[9px]">
                                {prod.category.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-slate-500 group-hover:text-[#00C4CC]">→</span>
                      </button>
                    );
                  })}
                  <button
                    onClick={handleSearchSubmit}
                    className="w-full rounded-xl border border-slate-800 bg-[#080D15] p-2.5 text-center text-xs font-bold text-[#00C4CC] hover:bg-[#00C4CC] hover:text-black transition mt-1"
                  >
                    View All Results for &quot;{query}&quot;
                  </button>
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-silver-dim">
                  No products found for &quot;{query}&quot;
                </div>
              )}
            </div>
          )}
        </div>

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
        <div className="relative border-t border-slate-800 bg-[#0C1420] p-3 lg:hidden animate-fadeIn">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
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
              className="rounded-xl bg-[#00C4CC] px-4 py-2 text-xs font-bold text-slate-950 shrink-0"
            >
              Search
            </button>
          </form>

          {/* Mobile Autocomplete Dropdown */}
          {query.trim() && searchResults.length > 0 && (
            <div className="mt-2 space-y-1 rounded-xl border border-slate-800 bg-[#080D15] p-2">
              {searchResults.map((prod) => (
                <button
                  key={prod.id}
                  onClick={() => handleSelectProduct(prod.slug)}
                  className="flex w-full items-center justify-between rounded-lg p-2 text-xs text-white hover:bg-[#0C1420]"
                >
                  <span className="truncate font-bold">{prod.name}</span>
                  <span className="font-mono text-[#00C4CC] shrink-0 ml-2">
                    PKR {prod.price.toLocaleString('en-PK')}
                  </span>
                </button>
              ))}
            </div>
          )}
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
