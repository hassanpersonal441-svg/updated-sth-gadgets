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
    <div className="fixed bottom-20 right-5 z-40 animate-slideUp">
      <button
        onClick={openCart}
        className="group flex items-center gap-3 rounded-full bg-[#00C4CC] hover:bg-[#00B2B9] text-black px-4 py-3 shadow-[0_0_20px_rgba(0,196,204,0.4)] transition hover:scale-105"
        aria-label="View shopping cart"
      >
        <div className="relative flex items-center justify-center">
          <span className="text-lg">🛒</span>
          <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[10px] font-extrabold text-[#00C4CC]">
            {totalItems}
          </span>
        </div>
        <div className="font-display text-xs sm:text-sm font-black flex items-center gap-1.5">
          <span>View Cart</span>
          <span className="opacity-40">•</span>
          <span>PKR {totalAmount.toLocaleString('en-PK')}</span>
        </div>
      </button>
    </div>
  );
}
