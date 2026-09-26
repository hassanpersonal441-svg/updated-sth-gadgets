'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';

export default function MobileSideNav() {
  const pathname = usePathname();
  const { totalItems, openCart } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* Fixed Mobile Side Navigation Bar */}
      <nav className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-3 rounded-2xl border border-slate-800/90 bg-[#080D15]/95 backdrop-blur-md p-3 text-slate-400 lg:hidden shadow-[0_8px_30px_rgba(0,0,0,0.6)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,196,204,0.3)] hover:border-[#00C4CC]/50">
        {/* Home */}
        <Link
          href="/"
          className={`group relative flex flex-col items-center gap-1 text-[10px] font-semibold transition-all duration-300 ${
            pathname === '/' ? 'text-[#00C4CC]' : 'hover:text-slate-200 hover:scale-110'
          }`}
          aria-label="Home"
        >
          <span className="text-xl transition-transform duration-300 group-hover:rotate-12">🏠</span>
          <div className={`absolute -inset-2 rounded-full bg-[#00C4CC]/20 opacity-0 transition-opacity duration-300 ${pathname === '/' ? 'opacity-100' : 'group-hover:opacity-100'}`} />
        </Link>

        {/* Products */}
        <Link
          href="/products"
          className={`group relative flex flex-col items-center gap-1 text-[10px] font-semibold transition-all duration-300 ${
            pathname === '/products' ? 'text-[#00C4CC]' : 'hover:text-slate-200 hover:scale-110'
          }`}
          aria-label="Products"
        >
          <span className="text-xl transition-transform duration-300 group-hover:rotate-12">🛍️</span>
          <div className={`absolute -inset-2 rounded-full bg-[#00C4CC]/20 opacity-0 transition-opacity duration-300 ${pathname === '/products' ? 'opacity-100' : 'group-hover:opacity-100'}`} />
        </Link>

        {/* Cart */}
        <button
          type="button"
          onClick={openCart}
          className="relative flex flex-col items-center gap-1 text-[10px] font-semibold hover:text-slate-200 transition-all duration-300 hover:scale-110"
          aria-label="Cart"
        >
          <div className="relative">
            <span className="text-xl transition-transform duration-300 group-hover:rotate-12">🛒</span>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#00C4CC] text-[9px] font-black text-slate-950 animate-pulse shadow-[0_0_8px_rgba(0,196,204,0.6)]">
                {totalItems}
              </span>
            )}
          </div>
          <div className="absolute -inset-2 rounded-full bg-[#00C4CC]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </button>
      </nav>
    </>
  );
}