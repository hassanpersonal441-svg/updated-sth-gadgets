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
    <div className="mobile-cart-summary fixed right-3 z-40 animate-slideUp sm:right-6">
      <button
        onClick={openCart}
        className="group flex items-center gap-3 rounded-full bg-[#00C4CC] hover:bg-[#00B2B9] text-black px-4 py-2.5 sm:py-3 shadow-[0_4px_25px_rgba(0,196,204,0.45)] transition-all duration-300 ease-out hover:shadow-[0_8px_35px_rgba(0,196,204,0.6)] hover:scale-105 active:scale-95 relative overflow-hidden"
        aria-label="View shopping cart"
      >
        <div className="relative flex items-center justify-center">
          <span className="text-lg transition-transform duration-300 group-hover:rotate-12">🛒</span>
          <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[10px] font-extrabold text-[#00C4CC] animate-pulse shadow-[0_0_8px_rgba(0,196,204,0.6)]">
            {totalItems}
          </span>
        </div>
        <div className="font-display text-xs sm:text-sm font-black flex items-center gap-1.5 relative z-10">
          <span>View Cart</span>
          <span className="opacity-40">•</span>
          <span>PKR {totalAmount.toLocaleString('en-PK')}</span>
        </div>
        {/* Button shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shine" />
      </button>
    </div>
  );
}
