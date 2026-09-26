'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import type { Category, Product, Settings } from '@/types/database';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/components/theme/ThemeProvider';
import ThemeToggle from '@/components/theme/ThemeToggle';

interface NavbarProps {
  categories: Category[];
  settings?: Settings | null;
}

export default function Navbar({ categories, settings }: NavbarProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
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
    <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors duration-200 ${
      isLight
        ? 'border-slate-200 bg-white/95 text-slate-800 shadow-sm'
        : 'border-slate-800/90 bg-[#080D15]/95 text-[#C9D2DB]'
    }`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 sm:gap-6 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand Section Left */}
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <div className="relative h-12 w-12 sm:h-13 sm:w-13 overflow-hidden rounded-full border-2 border-[#00C4CC]/80 shadow-[0_0_16px_rgba(0,196,204,0.4)] transition group-hover:scale-105">
            <Image
              src={settings?.logo_url || '/images/logo.png'}
              alt={settings?.business_name || 'STH Gadgets'}
              fill
              className="object-cover rounded-full"
              priority
            />
          </div>
          <div>
            <span className={`block font-display text-xl sm:text-2xl font-black tracking-wider uppercase transition ${
              isLight ? 'text-slate-900 group-hover:text-[#008B94]' : 'text-silver-bright group-hover:text-[#00C4CC]'
            }`}>
              {settings?.business_name || 'STH GADGETS'}
            </span>
            <span className="hidden sm:block text-[11px] sm:text-xs font-semibold text-[#00C4CC] tracking-wide">
              Mobile Accessories &amp; Official Rates
            </span>
          </div>
        </Link>

        {/* Centered Search Bar (Desktop) */}
        <div ref={searchContainerRef} className="relative hidden md:block flex-1 max-w-lg lg:max-w-xl xl:max-w-2xl mx-2">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-silver-dim">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (query.trim() && searchResults.length > 0) setShowDropdown(true);
              }}
              placeholder="Search fast chargers, power banks, earbuds, speakers..."
              className={`w-full rounded-full border py-2.5 pl-10 pr-9 text-xs sm:text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#00C4CC]/30 ${
                isLight
                  ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#008B94]'
                  : 'border-slate-800 bg-[#0C1420] text-white placeholder:text-slate-500 focus:border-[#00C4CC]'
              }`}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setShowDropdown(false);
                }}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 hover:text-slate-600 transition"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </form>

          {/* Autocomplete Suggestions Dropdown (Desktop) */}
          {showDropdown && (
            <div className={`absolute left-0 right-0 top-full mt-2 z-50 overflow-hidden rounded-2xl border p-2 shadow-2xl animate-fadeIn ${
              isLight ? 'border-slate-200 bg-white text-slate-800' : 'border-slate-800 bg-[#0C1420] text-white'
            }`}>
              {isSearching ? (
                <div className="p-3 text-center text-xs text-slate-400">
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
                        className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition group border ${
                          isLight
                            ? 'border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-800'
                            : 'border-transparent hover:border-slate-800 hover:bg-[#080D15] text-white'
                        }`}
                      >
                        <div className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border p-0.5 ${
                          isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-black/40'
                        }`}>
                          <Image src={img} alt={prod.name} fill className="object-contain" sizes="40px" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`truncate text-xs font-bold transition ${
                            isLight ? 'text-slate-900 group-hover:text-[#008B94]' : 'text-white group-hover:text-[#00C4CC]'
                          }`}>
                            {prod.name}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span className="font-mono font-bold text-[#00C4CC]">
                              PKR {prod.price.toLocaleString('en-PK')}
                            </span>
                            {prod.category?.name && (
                              <span className={`rounded px-1.5 py-0.2 text-[9px] ${
                                isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-800/60 text-slate-300'
                              }`}>
                                {prod.category.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 group-hover:text-[#00C4CC]">→</span>
                      </button>
                    );
                  })}
                  <button
                    onClick={handleSearchSubmit}
                    className={`w-full rounded-xl border p-2.5 text-center text-xs font-bold transition mt-1 ${
                      isLight
                        ? 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-[#00C4CC] hover:text-black'
                        : 'border-slate-800 bg-[#080D15] text-[#00C4CC] hover:bg-[#00C4CC] hover:text-black'
                    }`}
                  >
                    View All Results for &quot;{query}&quot;
                  </button>
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-slate-400">
                  No products found for &quot;{query}&quot;
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Actions Cluster */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* All Products Catalog Button */}
          <Link
            href="/products"
            className="hidden sm:flex items-center gap-1.5 rounded-full border border-[#00C4CC]/50 bg-[#00C4CC]/10 hover:bg-[#00C4CC] px-3.5 py-1.5 font-display text-xs font-bold text-[#00C4CC] hover:text-black shadow-[0_0_12px_rgba(0,196,204,0.2)] transition hover:scale-105 active:scale-95"
          >
            <span>🛍️</span>
            <span>All Products</span>
          </Link>

          {/* Theme Toggle Button */}
          {mounted && <ThemeToggle />}

          {/* Shopping Cart Button */}
          <button
            type="button"
            onClick={openCart}
            className={`relative flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-bold transition hover:scale-105 active:scale-95 shadow-sm ${
              isLight
                ? 'border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100 hover:border-slate-400'
                : 'border-[#00C4CC]/50 bg-[#0C1420] text-[#00C4CC] hover:bg-[#00C4CC]/10'
            }`}
            aria-label="Shopping Cart"
          >
            <span>🛒</span>
            <span className="hidden sm:inline">Cart</span>
            {mounted && totalItems > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#00C4CC] px-1 text-[11px] font-black text-black shadow-[0_0_8px_rgba(0,196,204,0.6)]">
                {totalItems}
              </span>
            )}
          </button>

          {/* Hamburger Menu Toggle for Mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`flex h-9 w-9 items-center justify-center rounded-full border md:hidden transition hover:scale-105 active:scale-95 ${
              isLight
                ? 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                : 'border-slate-800 bg-[#0C1420] text-slate-300 hover:border-[#00C4CC]'
            }`}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Search Bar (Always visible on mobile, matching LiveStorefront) */}
      <div className={`block md:hidden border-t px-4 py-2.5 ${
        isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800/80 bg-[#080D15]'
      }`}>
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim() && searchResults.length > 0) setShowDropdown(true);
            }}
            placeholder="Search fast chargers, power banks, earbuds..."
            className={`w-full rounded-full border py-2 pl-9 pr-8 text-xs font-medium focus:outline-none ${
              isLight
                ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#008B94]'
                : 'border-slate-800 bg-[#0C1420] text-white placeholder:text-slate-500 focus:border-[#00C4CC]'
            }`}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setShowDropdown(false);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600 transition"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </form>

        {/* Mobile Autocomplete Dropdown */}
        {showDropdown && query.trim() && searchResults.length > 0 && (
          <div className={`mt-2 space-y-1 rounded-xl border p-2 shadow-xl ${
            isLight ? 'border-slate-200 bg-white text-slate-800' : 'border-slate-800 bg-[#0C1420] text-white'
          }`}>
            {searchResults.map((prod) => (
              <button
                key={prod.id}
                onClick={() => handleSelectProduct(prod.slug)}
                className={`flex w-full items-center justify-between rounded-lg p-2 text-xs transition ${
                  isLight ? 'text-slate-800 hover:bg-slate-100' : 'text-white hover:bg-[#080D15]'
                }`}
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

      {/* Mobile Slide-Over Drawer Navigation */}
      {mounted && mobileMenuOpen && (
        <div className={`border-t p-5 md:hidden animate-fadeIn space-y-4 ${
          isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-[#080D15]'
        }`}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#00C4CC]">
            Navigation Menu
          </div>
          <nav className="flex flex-col gap-2.5 font-display text-sm">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-xl border px-4 py-2.5 font-semibold transition ${
                isLight
                  ? 'border-slate-200 bg-slate-50 text-slate-800 hover:text-[#008B94] hover:bg-slate-100'
                  : 'border-slate-800 bg-[#0C1420] text-white hover:text-[#00C4CC]'
              }`}
            >
              🏠 Home
            </Link>
            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-xl border px-4 py-2.5 font-semibold transition ${
                isLight
                  ? 'border-slate-200 bg-slate-50 text-slate-800 hover:text-[#008B94] hover:bg-slate-100'
                  : 'border-slate-800 bg-[#0C1420] text-white hover:text-[#00C4CC]'
              }`}
            >
              🛍️ All Products
            </Link>
            <Link
              href="/products?sort=discount"
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-xl border px-4 py-2.5 font-semibold transition ${
                isLight
                  ? 'border-amber-200 bg-amber-50/60 text-amber-700 hover:text-amber-800 hover:bg-amber-100/60'
                  : 'border-slate-800 bg-[#0C1420] text-amber-400 hover:text-amber-300'
              }`}
            >
              🔥 Hot Deals
            </Link>
            <Link
              href="/products?sort=newest"
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-xl border px-4 py-2.5 font-semibold transition ${
                isLight
                  ? 'border-cyan-200 bg-cyan-50/60 text-cyan-800 hover:text-cyan-900 hover:bg-cyan-100/60'
                  : 'border-slate-800 bg-[#0C1420] text-cyan-400 hover:text-cyan-300'
              }`}
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
                    className={`rounded-lg border p-2 text-xs transition ${
                      isLight
                        ? 'border-slate-200 bg-slate-50 text-slate-700 hover:text-[#008B94] hover:bg-slate-100'
                        : 'border-slate-800/80 bg-slate-900/60 text-slate-300 hover:text-[#00C4CC]'
                    }`}
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
