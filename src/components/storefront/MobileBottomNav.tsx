'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';

export default function MobileBottomNav({ whatsappNumber }: { whatsappNumber?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { totalItems, openCart } = useCart();
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
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 backdrop-blur-sm lg:hidden animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0C1420] p-4 shadow-2xl mt-16 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-[#00C4CC]">
                Search STH Gadgets
              </span>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-slate-400 hover:text-white"
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
                className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-[#00C4CC] focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="rounded-xl bg-[#00C4CC] px-4 py-2.5 text-xs font-bold text-slate-950"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-800/90 bg-[#080D15]/95 backdrop-blur-md py-2 text-slate-400 lg:hidden shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition ${
            pathname === '/' ? 'text-[#00C4CC]' : 'hover:text-slate-200'
          }`}
        >
          <span className="text-base">🏠</span>
          <span>Home</span>
        </Link>

        {/* Categories */}
        <Link
          href="/products"
          className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition ${
            pathname === '/products' ? 'text-[#00C4CC]' : 'hover:text-slate-200'
          }`}
        >
          <span className="text-base">📦</span>
          <span>Categories</span>
        </Link>

        {/* Search */}
        <button
          type="button"
          onClick={() => setShowSearchModal(true)}
          className="flex flex-col items-center gap-0.5 text-[10px] font-semibold hover:text-slate-200 transition"
        >
          <span className="text-base">🔍</span>
          <span>Search</span>
        </button>

        {/* Cart */}
        <button
          type="button"
          onClick={openCart}
          className="relative flex flex-col items-center gap-0.5 text-[10px] font-semibold hover:text-slate-200 transition"
        >
          <div className="relative">
            <span className="text-base">🛒</span>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00C4CC] text-[9px] font-black text-slate-950">
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
          className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 transition"
        >
          <span className="text-base">💬</span>
          <span>WhatsApp</span>
        </a>
      </nav>
    </>
  );
}
