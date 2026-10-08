'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import type { Category, Product, Settings } from '@/types/database';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/components/theme/ThemeProvider';
import ThemeToggle from '@/components/theme/ThemeToggle';
import MobileSidebar from './MobileSidebar';

interface NavbarProps {
  categories: Category[];
  settings?: Settings | null;
}

export default function Navbar({ categories, settings }: NavbarProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      setShowDropdown(false);
      setMobileMenuOpen(false);
      router.push(`/products?q=${encodeURIComponent(query.trim())}`);
    }
  }

  function handleSelectProduct(slug: string) {
    setShowDropdown(false);
    setMobileMenuOpen(false);
    setQuery('');
    router.push(`/products/${slug}`);
  }

  return (
    <>
      <MobileSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        categories={categories}
        settings={settings}
      />

      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-all duration-300 ${
          isLight
            ? 'border-slate-200/90 bg-white/90 text-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
            : 'border-slate-800/80 bg-[#060A11]/90 text-[#CBD5E1] shadow-[0_4px_25px_rgba(0,0,0,0.5)]'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-1.5 sm:gap-6 px-1.5 sm:px-6 py-2.5 sm:py-3.5">
          {/* Brand Section Left */}
          <Link href="/" className="group flex shrink-0 items-center gap-2.5 sm:gap-3.5">
            <div className="relative h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-full border-2 border-[#00C4CC] shadow-[0_0_15px_rgba(0,196,204,0.4)] transition duration-300 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(0,196,204,0.6)]">
              <Image
                src={settings?.logo_url || '/images/logo.png'}
                alt={settings?.business_name || 'STH Gadgets'}
                fill
                className="object-cover rounded-full"
                priority
                sizes="(max-width: 640px) 40px, 48px"
              />
            </div>
            <div>
              <span
                className={`block font-display text-base sm:text-xl font-black tracking-wider uppercase transition duration-200 ${
                  isLight
                    ? 'text-slate-900 group-hover:text-[#0891B2]'
                    : 'text-white group-hover:text-[#00C4CC]'
                }`}
              >
                {settings?.business_name || 'STH GADGETS'}
              </span>
              <span className="hidden sm:block text-[10px] sm:text-[11px] font-semibold text-[#00C4CC] tracking-wide">
                100% Original Tech &amp; Direct Rates
              </span>
            </div>
          </Link>

          {/* Centered Search Bar (Desktop) */}
          <div
            ref={searchContainerRef}
            className="relative hidden md:block flex-1 max-w-lg lg:max-w-xl xl:max-w-2xl mx-2"
          >
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => {
                  if (query.trim() && searchResults.length > 0) setShowDropdown(true);
                }}
                placeholder="Search products, brands & categories..."
                className={`w-full rounded-full border py-2 pl-10 pr-10 text-xs sm:text-sm font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-[#00C4CC]/30 ${
                  isLight
                    ? 'border-slate-300 bg-slate-100/80 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0891B2]'
                    : 'border-slate-700/80 bg-[#0B121E] text-white placeholder:text-slate-500 focus:border-[#00C4CC] focus:bg-[#0F1A2A]'
                }`}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setShowDropdown(false);
                  }}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 hover:text-white transition"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              ) : null}
            </form>

            {/* Autocomplete Suggestions Dropdown (Desktop) */}
            {showDropdown && (
              <div
                className={`absolute left-0 right-0 top-full mt-2.5 z-50 overflow-hidden rounded-2xl border p-2.5 shadow-2xl animate-fade-in ${
                  isLight
                    ? 'border-slate-200 bg-white text-slate-800'
                    : 'border-slate-800 bg-[#0B121E] text-white shadow-[0_10px_35px_rgba(0,0,0,0.8)]'
                }`}
              >
                {isSearching ? (
                  <div className="p-3.5 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <span className="animate-spin text-sm">⚡</span>
                    <span>Searching products...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#00C4CC]">
                      <span>Matching Products ({searchResults.length})</span>
                      <span className="text-slate-500 text-[9px] lowercase">press Enter to view all</span>
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
                          className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition duration-150 group border ${
                            isLight
                              ? 'border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-800'
                              : 'border-transparent hover:border-[#00C4CC]/30 hover:bg-[#0F1A2A] text-white'
                          }`}
                        >
                          <div
                            className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border p-1 ${
                              isLight
                                ? 'border-slate-200 bg-slate-50'
                                : 'border-slate-800 bg-black/40'
                            }`}
                          >
                            <Image
                              src={img}
                              alt={prod.name}
                              fill
                              className="object-contain"
                              sizes="44px"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className={`truncate text-xs font-bold transition duration-150 ${
                                isLight
                                  ? 'text-slate-900 group-hover:text-[#0891B2]'
                                  : 'text-white group-hover:text-[#00C4CC]'
                              }`}
                            >
                              {prod.name}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span className="font-mono font-bold text-[#00C4CC]">
                                PKR {prod.price.toLocaleString('en-PK')}
                              </span>
                              {prod.category?.name && (
                                <span
                                  className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${
                                    isLight
                                      ? 'bg-slate-100 text-slate-600'
                                      : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {prod.category.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-slate-400 group-hover:text-[#00C4CC] group-hover:translate-x-0.5 transition duration-150">
                            →
                          </span>
                        </button>
                      );
                    })}
                    <button
                      onClick={handleSearchSubmit}
                      className={`w-full rounded-xl border p-2 text-center text-xs font-bold transition duration-200 mt-1 ${
                        isLight
                          ? 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-[#00C4CC] hover:text-black'
                          : 'border-slate-800 bg-[#0F1A2A] text-[#00C4CC] hover:bg-[#00C4CC] hover:text-black'
                      }`}
                    >
                      View All Results for &quot;{query}&quot;
                    </button>
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No products found matching &quot;{query}&quot;
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Actions Cluster */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {/* Hot Deals Navigation Button */}
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('sth_open_deals_modal'));
                const el = document.getElementById('product-catalog');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/10 hover:bg-gradient-to-r hover:from-amber-500 hover:to-rose-500 px-3.5 py-1.5 font-display text-xs font-bold text-amber-400 hover:text-white shadow-[0_0_12px_rgba(245,158,11,0.2)] transition duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>🔥</span>
              <span>Hot Deals</span>
            </button>

            {/* All Products Catalog Link */}
            <Link
              href="/products"
              className="hidden lg:flex items-center gap-1.5 rounded-full border border-[#00C4CC]/50 bg-[#00C4CC]/10 hover:bg-[#00C4CC] px-3.5 py-1.5 font-display text-xs font-bold text-[#00C4CC] hover:text-black shadow-[0_0_12px_rgba(0,196,204,0.15)] transition duration-200 hover:scale-105 active:scale-95"
            >
              <span>🛍️</span>
              <span>Catalog</span>
            </Link>

            {/* Theme Toggle Button */}
            {mounted && <ThemeToggle />}

            {/* Shopping Cart Button */}
            <button
              id="cart-icon-nav"
              type="button"
              onClick={openCart}
              className={`relative flex items-center gap-1.5 rounded-full border px-2 sm:px-3.5 py-1.5 sm:py-2 transition duration-200 hover:scale-105 active:scale-95 shadow-sm ${
                isLight
                  ? 'border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100 hover:border-slate-400'
                  : 'border-[#00C4CC]/50 bg-[#0B121E] text-[#00C4CC] hover:bg-[#00C4CC]/10'
              }`}
              aria-label="Shopping Cart"
            >
              <span className="text-base sm:text-lg">🛒</span>
              <span className="hidden sm:inline text-xs font-bold font-display">Cart</span>
              {mounted && totalItems > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#00C4CC] px-1 text-[10px] font-black text-black shadow-[0_0_8px_rgba(0,196,204,0.6)]">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Hamburger Menu Toggle for Mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`flex h-9 w-9 items-center justify-center rounded-full border md:hidden transition duration-200 hover:scale-105 active:scale-95 ${
                isLight
                  ? 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  : 'border-slate-800 bg-[#0B121E] text-slate-300 hover:border-[#00C4CC]'
              }`}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>



        {/* Mobile Search Bar (Directly beneath top header on phones) */}
        <div
          className={`block md:hidden border-t px-3.5 py-2.5 ${
            isLight ? 'border-slate-200 bg-slate-50/90' : 'border-slate-800/80 bg-[#060A11]/90'
          }`}
        >
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (query.trim() && searchResults.length > 0) setShowDropdown(true);
              }}
              placeholder="Search chargers, earbuds, power banks..."
              className={`w-full rounded-full border py-2 pl-9 pr-8 text-xs font-medium focus:outline-none ${
                isLight
                  ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#0891B2]'
                  : 'border-slate-700 bg-[#0B121E] text-white placeholder:text-slate-500 focus:border-[#00C4CC]'
              }`}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setShowDropdown(false);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-white transition"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </form>

          {/* Mobile Autocomplete Dropdown */}
          {showDropdown && query.trim() && searchResults.length > 0 && (
            <div
              className={`mt-2 space-y-1 rounded-2xl border p-2 shadow-2xl ${
                isLight
                  ? 'border-slate-200 bg-white text-slate-800'
                  : 'border-slate-800 bg-[#0B121E] text-white'
              }`}
            >
              {searchResults.map((prod) => (
                <button
                  key={prod.id}
                  onClick={() => handleSelectProduct(prod.slug)}
                  className={`flex w-full items-center justify-between rounded-xl p-2 text-xs transition ${
                    isLight ? 'text-slate-800 hover:bg-slate-100' : 'text-white hover:bg-[#0F1A2A]'
                  }`}
                >
                  <span className="truncate font-bold">{prod.name}</span>
                  <span className="font-mono text-[#00C4CC] shrink-0 ml-2 font-bold">
                    PKR {prod.price.toLocaleString('en-PK')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
    </>
  );
}
