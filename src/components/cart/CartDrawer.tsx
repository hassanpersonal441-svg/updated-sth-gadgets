'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/components/theme/ThemeProvider';
import ExclusiveBundleModal from './ExclusiveBundleModal';

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
    freeShippingThreshold,
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

  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [inputCode, setInputCode] = useState('');
  const [isPreCheckoutModalOpen, setIsPreCheckoutModalOpen] = useState(false);
  const [hasDismissedPreCheckout, setHasDismissedPreCheckout] = useState(false);

  // Prevent body scroll when drawer is open (with mobile Safari fix)
  React.useEffect(() => {
    if (isCartOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!inputCode.trim()) return;
    const success = await applyCoupon(inputCode);
    if (success) setInputCode('');
  }

  function handleCheckoutClick() {
    if (!hasDismissedPreCheckout) {
      setIsPreCheckoutModalOpen(true);
    } else {
      openCheckout();
    }
  }

  return (
    <>
      <ExclusiveBundleModal
        isOpen={isPreCheckoutModalOpen}
        onClose={() => {
          setIsPreCheckoutModalOpen(false);
          setHasDismissedPreCheckout(true);
        }}
        isPreCheckout={true}
        onProceedToCheckout={() => {
          openCheckout();
        }}
      />

      <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-md transition-opacity animate-fade-in">
        {/* Backdrop click to close */}
        <div className="fixed inset-0" onClick={closeCart} />

        {/* Slide-over Drawer Container */}
        <div
          className={`relative z-10 flex h-full w-full max-w-md flex-col border-l transition-all duration-300 shadow-2xl ${
            isLight
              ? 'border-slate-200 bg-white text-slate-800'
              : 'border-slate-800 bg-[#060A11] text-[#CBD5E1]'
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between border-b px-5 py-4 ${
              isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800/80 bg-[#0B121E]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🛒</span>
              <h2
                className={`font-display text-base font-black tracking-wide ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                Shopping Cart
              </h2>
              <span className="rounded-full bg-[#00C4CC] px-2.5 py-0.5 text-xs font-black text-black shadow-sm">
                {totalItems}
              </span>
            </div>
            <button
              type="button"
              onClick={closeCart}
              aria-label="Close cart"
              className="rounded-xl border border-slate-700/60 p-2 text-slate-400 hover:text-white transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <span className="text-6xl mb-4">🛍️</span>
              <p
                className={`font-display text-lg font-bold ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                Your cart is empty
              </p>
              <p className="mt-1 text-xs text-slate-200 dark:text-white max-w-xs leading-relaxed font-normal">
                Discover fast chargers, power banks, wireless earbuds, and cables with official rates.
              </p>
              <button
                type="button"
                onClick={closeCart}
                className="mt-6 rounded-2xl bg-gradient-to-r from-[#00C4CC] to-[#00E5FF] px-6 py-3 font-display text-xs font-black text-black shadow-[0_0_20px_rgba(0,196,204,0.3)] transition hover:scale-105 active:scale-95 cursor-pointer"
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
                    className={`flex items-center gap-3.5 rounded-2xl border p-3 transition duration-150 ${
                      isLight
                        ? 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                        : 'border-slate-800/80 bg-[#0B121E] hover:border-[#00C4CC]/40'
                    }`}
                  >
                    {/* Thumbnail */}
                    <Link
                      href={`/products/${item.slug}`}
                      onClick={closeCart}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border p-1 ${
                        isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-black/40'
                      }`}
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
                        className={`block truncate font-display text-xs sm:text-sm font-bold transition ${
                          isLight
                            ? 'text-slate-900 hover:text-[#0891B2]'
                            : 'text-white hover:text-[#00C4CC]'
                        }`}
                      >
                        {item.productName}
                      </Link>
                      {item.colorName ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400">Color:</span>
                          {item.colorValue && (
                            <span
                              className="h-2.5 w-2.5 rounded-full inline-block border border-slate-600 shadow-sm"
                              style={{ backgroundColor: item.colorValue }}
                            />
                          )}
                          <span className="text-[10px] text-[#00C4CC] font-bold">
                            {item.colorName}
                          </span>
                        </div>
                      ) : item.variantName ? (
                        <span className="block text-[10px] text-[#00C4CC] font-mono mt-0.5">
                          {item.variantName}
                        </span>
                      ) : null}
                      <div className="mt-1 font-display text-xs sm:text-sm font-black text-[#00C4CC]">
                        Rs. {item.price.toLocaleString('en-PK')}
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex flex-col items-end gap-2">
                      <div
                        className={`flex items-center rounded-xl border ${
                          isLight ? 'border-slate-200 bg-white' : 'border-slate-700 bg-[#060A11]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2.5 py-1 text-xs hover:text-[#00C4CC] transition font-bold cursor-pointer"
                        >
                          −
                        </button>
                        <span
                          className={`w-6 text-center text-xs font-black ${
                            isLight ? 'text-slate-900' : 'text-white'
                          }`}
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2.5 py-1 text-xs hover:text-[#00C4CC] transition font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Clear Entire Cart */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-[11px] text-slate-400 hover:text-rose-400 transition underline cursor-pointer"
                >
                  Clear entire cart
                </button>
              </div>

              {/* Promo Coupon Code Box */}
              <div
                className={`rounded-2xl border p-4 space-y-2.5 ${
                  isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-[#0B121E]'
                }`}
              >
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span>🏷️</span>
                  <span>Apply Promo Code</span>
                </label>

                {couponStatus === 'valid' && couponCode ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-400">
                      <div className="flex items-center gap-2">
                        <span>✓</span>
                        <span className="font-mono font-bold">{couponCode}</span>
                        <span>(-Rs. {couponDiscount.toLocaleString('en-PK')})</span>
                      </div>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="font-bold text-emerald-400 hover:text-white px-1 cursor-pointer"
                        title="Remove coupon"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-[10.5px] text-amber-300 font-medium">
                      ℹ️ Coupon active. Other automatic deals are paused.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleApply} className="flex gap-2">
                    <input
                      type="text"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      placeholder="PROMO CODE"
                      className={`flex-1 rounded-xl border px-3 py-2 text-xs uppercase font-mono tracking-wider font-bold focus:border-[#00C4CC] focus:outline-none ${
                        isLight
                          ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'
                          : 'border-slate-700 bg-[#060A11] text-[#00C4CC] placeholder:text-slate-600'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={couponStatus === 'checking'}
                      className="rounded-xl bg-[#00C4CC] hover:bg-[#00E5FF] px-4 py-2 font-display text-xs font-black text-black transition shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      {couponStatus === 'checking' ? '...' : 'Apply'}
                    </button>
                  </form>
                )}

                {couponMessage && couponStatus !== 'valid' && (
                  <p className="text-[11px] font-bold text-rose-400">{couponMessage}</p>
                )}
              </div>

              {/* Bundle Discount Banner */}
              {bundlePercentage > 0 ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-center justify-between text-xs text-amber-300">
                  <div className="flex items-center gap-2 font-bold">
                    <span>🎁</span>
                    <span>Combo Deal Applied ({bundlePercentage}% OFF)</span>
                  </div>
                  <span className="font-bold font-mono">
                    -Rs. {bundleDiscount.toLocaleString('en-PK')}
                  </span>
                </div>
              ) : null}

              {/* Free Delivery Progress Bar */}
              {subtotal > 0 && freeShippingThreshold > 0 && (
                <div
                  className={`rounded-2xl border p-3.5 space-y-2.5 ${
                    isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-[#0B121E]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">🚚 Free Shipping Progress</span>
                    <span className="text-[#00C4CC] font-bold">
                      {subtotal >= freeShippingThreshold ? (
                        <span className="text-emerald-400">✓ FREE Shipping Unlocked!</span>
                      ) : (
                        <span>
                          Rs. {subtotal.toLocaleString('en-PK')} / Rs.{' '}
                          {freeShippingThreshold.toLocaleString('en-PK')}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#00C4CC] to-[#00E5FF] transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%`,
                      }}
                    />
                  </div>
                  {subtotal < freeShippingThreshold && (
                    <p className="text-[10.5px] text-center text-slate-400">
                      Add <span className="text-[#00C4CC] font-bold">Rs. {(freeShippingThreshold - subtotal).toLocaleString('en-PK')}</span> more for <span className="text-emerald-400 font-bold">FREE Delivery</span>!
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer / Total & Checkout CTA */}
          {items.length > 0 && (
            <div
              className={`border-t p-5 space-y-3.5 ${
                isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-[#0B121E]'
              }`}
            >
              {/* Breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal ({totalItems} item{totalItems > 1 ? 's' : ''})</span>
                  <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Rs. {subtotal.toLocaleString('en-PK')}
                  </span>
                </div>

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Coupon Discount</span>
                    <span>-Rs. {couponDiscount.toLocaleString('en-PK')}</span>
                  </div>
                )}

                {bundleDiscount > 0 && (
                  <div className="flex justify-between text-amber-400 font-semibold">
                    <span>Combo Discount</span>
                    <span>-Rs. {bundleDiscount.toLocaleString('en-PK')}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-400">
                  <span>Delivery Charges</span>
                  <span>
                    {deliveryCharges === 0 ? (
                      <span className="text-emerald-400 font-bold">FREE</span>
                    ) : (
                      `Rs. ${deliveryCharges.toLocaleString('en-PK')}`
                    )}
                  </span>
                </div>

                <div
                  className={`flex justify-between border-t pt-2 font-display text-base font-black ${
                    isLight ? 'border-slate-200 text-slate-900' : 'border-slate-800 text-white'
                  }`}
                >
                  <span>Total Amount</span>
                  <span className="text-[#00C4CC]">
                    Rs. {totalAmount.toLocaleString('en-PK')}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleCheckoutClick}
                  className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] hover:bg-[#20BD5A] py-3.5 px-4 font-display text-sm font-black text-white shadow-[0_0_25px_rgba(37,211,102,0.35)] transition duration-200 hover:scale-[1.01] active:scale-98 cursor-pointer"
                >
                  <svg viewBox="0 0 32 32" className="h-4 w-4 fill-white shrink-0">
                    <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.34.687 4.52 1.872 6.35L4 29l7.86-1.83A11.94 11.94 0 0016 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3z" />
                  </svg>
                  <span>Proceed to Checkout</span>
                </button>

                <button
                  type="button"
                  onClick={closeCart}
                  className="w-full rounded-2xl border border-slate-700/60 py-2.5 text-center font-display text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
