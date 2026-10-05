'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';

export default function FloatingCartButton() {
  const pathname = usePathname();
  const { totalItems, totalAmount, openCart, isCartOpen, isCheckoutOpen } = useCart();

  // Hide completely inside Admin Panel or when cart/checkout is open or cart is empty
  if (pathname?.startsWith('/admin') || totalItems === 0 || isCartOpen || isCheckoutOpen) {
    return null;
  }

  return (
    <div className="mobile-cart-summary fixed left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-6 bottom-20 sm:bottom-6 z-40 animate-slide-up w-[90%] sm:w-auto flex justify-center">
      <button
        type="button"
        onClick={openCart}
        className="w-full sm:w-auto group relative overflow-hidden flex justify-center items-center gap-2.5 sm:gap-3 rounded-full bg-[#081220]/95 hover:bg-[#0B1A2E] text-white border border-[#00C4CC]/50 px-4 sm:px-5 py-2.5 sm:py-3 shadow-[0_10px_35px_rgba(0,0,0,0.7),0_0_25px_rgba(0,196,204,0.3)] backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-[#00C4CC]/30"
        aria-label="View shopping cart"
      >
        {/* Cart Icon & Items Count */}
        <div className="flex items-center gap-1.5 font-display text-xs sm:text-sm font-bold text-silver-bright">
          <span className="text-base sm:text-lg">🛒</span>
          <span>{totalItems} {totalItems === 1 ? 'Item' : 'Items'}</span>
        </div>

        <span className="text-slate-500 font-normal">|</span>

        {/* Amount */}
        <div className="font-mono text-xs sm:text-sm font-black text-[#00C4CC]">
          ₨{totalAmount.toLocaleString('en-PK')}
        </div>

        <span className="text-slate-500 font-normal">|</span>

        {/* View Cart Action CTA */}
        <div className="font-display text-xs sm:text-sm font-black text-white group-hover:text-[#00C4CC] transition-colors flex items-center gap-1">
          <span>View Cart</span>
          <span className="group-hover:translate-x-0.5 transition-transform duration-200">→</span>
        </div>

        {/* Ambient Subtle Rim Glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-[#00C4CC]/10 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none" />
      </button>
    </div>
  );
}
