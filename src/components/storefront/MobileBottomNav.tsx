'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/components/theme/ThemeProvider';

export default function MobileBottomNav({ whatsappNumber }: { whatsappNumber?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { totalItems, openCart } = useCart();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [mounted, setMounted] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const phone = (whatsappNumber || '+923489593671').replace(/[^\d]/g, '');

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearchModal(false);
      setSearchQuery('');
    }
  }

  if (!mounted) return null;

  return (
    <>
      {/* Mobile Search Overlay Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 backdrop-blur-md lg:hidden animate-fade-in">
          <div
            className={`w-full max-w-md rounded-3xl border p-5 shadow-2xl mt-16 space-y-3.5 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#0B121E] border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
              <span className="font-display text-xs font-black uppercase tracking-wider text-[#00C4CC]">
                Search STH Gadgets
              </span>
              <button
                type="button"
                onClick={() => setShowSearchModal(false)}
                className="text-slate-400 hover:text-white text-base"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fast chargers, earbuds, power banks..."
                className={`w-full rounded-2xl border px-4 py-2.5 text-xs focus:border-[#00C4CC] focus:outline-none ${
                  isLight
                    ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400'
                    : 'border-slate-700 bg-[#060A11] text-white placeholder:text-slate-500'
                }`}
                autoFocus
              />
              <button
                type="submit"
                className="rounded-2xl bg-[#00C4CC] px-4 py-2.5 text-xs font-black text-black hover:brightness-110 shrink-0"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t py-2 backdrop-blur-xl lg:hidden shadow-[0_-5px_25px_rgba(0,0,0,0.4)] ${
          isLight
            ? 'border-slate-200/90 bg-white/95 text-slate-600'
            : 'border-slate-800/80 bg-[#060A11]/95 text-slate-400'
        }`}
      >
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 text-[10.5px] font-bold transition duration-200 ${
            pathname === '/' ? 'text-[#00C4CC]' : 'hover:text-white'
          }`}
        >
          <span className="text-base">🏠</span>
          <span>Home</span>
        </Link>

        {/* Catalog */}
        <Link
          href="/products"
          className={`flex flex-col items-center gap-0.5 text-[10.5px] font-bold transition duration-200 ${
            pathname === '/products' ? 'text-[#00C4CC]' : 'hover:text-white'
          }`}
        >
          <span className="text-base">🛍️</span>
          <span>Catalog</span>
        </Link>

        {/* Search */}
        <button
          type="button"
          onClick={() => setShowSearchModal(true)}
          className="flex flex-col items-center gap-0.5 text-[10.5px] font-bold hover:text-white transition duration-200 cursor-pointer"
        >
          <span className="text-base">🔍</span>
          <span>Search</span>
        </button>

        {/* Cart */}
        <button
          type="button"
          onClick={openCart}
          className="relative flex flex-col items-center gap-0.5 text-[10.5px] font-bold hover:text-white transition duration-200 cursor-pointer"
        >
          <div className="relative">
            <span className="text-base">🛒</span>
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#00C4CC] px-1 text-[9px] font-black text-black shadow-sm">
                {totalItems}
              </span>
            )}
          </div>
          <span>Cart</span>
        </button>

        {/* WhatsApp */}
        <a
          href={`https://wa.me/${phone}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-0.5 text-[10.5px] font-black text-emerald-400 hover:text-emerald-300 transition duration-200"
        >
          <span className="text-base">💬</span>
          <span>WhatsApp</span>
        </a>
      </nav>
    </>
  );
}
