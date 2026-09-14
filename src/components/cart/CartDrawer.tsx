'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function CartDrawer() {
  const {
    items,
    totalItems,
    subtotal,
    couponCode,
    couponDiscount,
    couponStatus,
    couponMessage,
    bundleDiscount,
    bundlePercentage,
    deliveryCharges,
    totalAmount,
    isCartOpen,
    closeCart,
    openCheckout,
    updateQuantity,
    removeFromCart,
    clearCart,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const [inputCode, setInputCode] = useState('');

  if (!isCartOpen) return null;

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!inputCode.trim()) return;
    const success = await applyCoupon(inputCode);
    if (success) setInputCode('');
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm transition-opacity animate-fadeIn">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={closeCart} />

      {/* Slide-over Drawer */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-[#080D15] text-[#C9D2DB] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🛒</span>
            <h2 className="font-display text-base font-black tracking-wide text-silver-bright">
              Your Shopping Cart
            </h2>
            <span className="rounded-full bg-[#00C4CC]/20 border border-[#00C4CC]/40 px-2 py-0.5 text-xs font-extrabold text-[#00C4CC]">
              {totalItems}
            </span>
          </div>
          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="rounded-lg border border-slate-800 p-1.5 text-silver-dim hover:border-slate-700 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <span className="text-5xl mb-3">🛍️</span>
            <p className="font-display text-base font-bold text-silver-bright">Your cart is empty</p>
            <p className="mt-1 text-xs text-silver-dim max-w-xs">
              Explore our collection of power banks, chargers, earbuds, and accessories.
            </p>
            <button
              onClick={closeCart}
              className="mt-5 rounded-xl bg-[#00C4CC] px-5 py-2.5 font-display text-xs font-bold text-black shadow-sm transition hover:brightness-110"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Items List */}
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-800/80 bg-[#0C1420] p-3 transition hover:border-slate-700"
                >
                  {/* Thumbnail */}
                  <Link
                    href={`/products/${item.slug}`}
                    onClick={closeCart}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-black/30 p-1"
                  >
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      className="object-contain"
                      sizes="64px"
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${item.slug}`}
                      onClick={closeCart}
                      className="block truncate font-display text-xs sm:text-sm font-semibold text-silver-bright hover:text-[#00C4CC] transition"
                    >
                      {item.productName}
                    </Link>
                    {item.variantName && (
                      <span className="text-[10px] text-[#00C4CC] font-mono">
                        {item.variantName}
                      </span>
                    )}
                    <div className="mt-1 font-display text-xs font-bold text-[#00C4CC]">
                      PKR {item.price.toLocaleString('en-PK')}
                    </div>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center rounded-lg border border-slate-800 bg-[#080D15]">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-1 text-xs text-silver-dim hover:text-[#00C4CC] transition font-bold"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-silver-bright">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-1 text-xs text-silver-dim hover:text-[#00C4CC] transition font-bold"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-[11px] text-rose-400/80 hover:text-rose-400 transition flex items-center gap-1"
                      title="Remove item"
                    >
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Clear Cart Button */}
            <div className="flex justify-end pt-1">
              <button
                onClick={clearCart}
                className="text-[11px] text-silver-dim hover:text-silver-bright transition underline"
              >
                Clear entire cart
              </button>
            </div>

            {/* Coupon Code Input */}
            <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-3.5 space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-silver-bright uppercase tracking-wider">
                <span>🏷️</span>
                <span>Apply Promo / Coupon Code</span>
              </label>

              {couponStatus === 'valid' && couponCode ? (
                <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-400">
                  <div className="flex items-center gap-2">
                    <span>✓</span>
                    <span className="font-mono font-bold">{couponCode}</span>
                    <span>(-PKR {couponDiscount.toLocaleString('en-PK')})</span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="font-bold text-emerald-400 hover:text-white px-1"
                    title="Remove coupon"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApply} className="flex gap-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE (E.G. STH10)"
                    className="flex-1 rounded-xl border border-slate-700 bg-[#080D15] px-3 py-1.5 text-xs uppercase font-mono tracking-wider text-[#00C4CC] placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none font-bold"
                  />
                  <button
                    type="submit"
                    disabled={couponStatus === 'checking'}
                    className="rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] px-3.5 py-1.5 font-display text-xs font-bold text-black transition shrink-0 disabled:opacity-50"
                  >
                    {couponStatus === 'checking' ? '...' : 'Apply'}
                  </button>
                </form>
              )}

              {couponMessage && couponStatus !== 'valid' && (
                <p className="text-[11px] font-semibold text-rose-400">
                  {couponMessage}
                </p>
              )}
            </div>

            {/* Bundle Discount Notification Banner */}
            {bundlePercentage > 0 ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-center justify-between text-xs text-amber-300">
                <div className="flex items-center gap-2 font-medium">
                  <span>🎁</span>
                  <span>
                    Bundle Deal Applied ({bundlePercentage}% OFF {totalItems} items!)
                  </span>
                </div>
                <span className="font-bold font-mono">
                  -PKR {bundleDiscount.toLocaleString('en-PK')}
                </span>
              </div>
            ) : totalItems === 1 ? (
              <div className="rounded-xl border border-slate-800 bg-[#0C1420] p-2.5 text-center text-[11px] text-silver-dim">
                💡 <span className="text-[#00C4CC] font-bold">Tip:</span> Add 1 more item to unlock a <strong className="text-amber-400">5% Bundle Discount</strong>!
              </div>
            ) : null}
          </div>
        )}

        {/* Footer / Checkout Button */}
        {items.length > 0 && (
          <div className="border-t border-slate-800 bg-[#0A101A] p-5 space-y-3">
            {/* Price Breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-silver-dim">
                <span>Subtotal ({totalItems} item{totalItems > 1 ? 's' : ''})</span>
                <span className="font-medium text-silver-bright">
                  PKR {subtotal.toLocaleString('en-PK')}
                </span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Coupon Discount ({couponCode})</span>
                  <span>-PKR {couponDiscount.toLocaleString('en-PK')}</span>
                </div>
              )}

              {bundleDiscount > 0 && (
                <div className="flex justify-between text-amber-400 font-semibold">
                  <span>Bundle Discount ({bundlePercentage}%)</span>
                  <span>-PKR {bundleDiscount.toLocaleString('en-PK')}</span>
                </div>
              )}

              <div className="flex justify-between text-silver-dim">
                <span>Delivery Charges</span>
                <span>
                  {deliveryCharges === 0 ? (
                    <span className="text-emerald-400 font-bold">FREE</span>
                  ) : (
                    `PKR ${deliveryCharges.toLocaleString('en-PK')}`
                  )}
                </span>
              </div>

              <div className="flex justify-between border-t border-slate-800 pt-2 font-display text-base font-black text-silver-bright">
                <span>Total Amount</span>
                <span className="text-[#00C4CC]">
                  PKR {totalAmount.toLocaleString('en-PK')}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={openCheckout}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] py-3.5 px-4 font-display text-sm font-bold text-white shadow-[0_0_20px_rgba(37,211,102,0.3)] transition hover:scale-[1.01]"
              >
                <svg viewBox="0 0 32 32" className="h-4 w-4 fill-white shrink-0">
                  <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.34.687 4.52 1.872 6.35L4 29l7.86-1.83A11.94 11.94 0 0016 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3z" />
                </svg>
                <span>Proceed to WhatsApp Order</span>
              </button>

              <button
                onClick={closeCart}
                className="w-full rounded-xl border border-slate-800 py-2.5 text-center font-display text-xs font-semibold text-silver-dim hover:text-silver-bright hover:border-slate-700 transition"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
