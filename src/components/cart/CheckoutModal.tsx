'use client';

import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';

export default function CheckoutModal() {
  const {
    items,
    totalItems,
    subtotal,
    couponCode,
    couponDiscount,
    bundleDiscount,
    deliveryCharges,
    totalAmount,
    isCheckoutOpen,
    closeCheckout,
    clearCart,
  } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [orderComplete, setOrderComplete] = useState<{
    orderId: string;
    whatsappUrl: string;
  } | null>(null);

  if (!isCheckoutOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!customerName.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Please enter your WhatsApp phone number');
      return;
    }
    if (!city.trim()) {
      setErrorMsg('Please enter your city');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('Please enter your complete delivery address');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          address: address.trim(),
          coupon_code: couponCode || null,
          items: items.map((i) => ({
            product_id: i.productId,
            quantity: i.quantity,
            variant_name: i.variantName || null,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit order');
      }

      // Save order complete state
      setOrderComplete({
        orderId: data.orderId,
        whatsappUrl: data.whatsappUrl,
      });

      // Clear the cart
      clearCart();

      // Open WhatsApp
      if (typeof window !== 'undefined' && data.whatsappUrl) {
        window.location.href = data.whatsappUrl;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while creating your order.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={orderComplete ? closeCheckout : undefined} />

      <div className="relative z-10 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#0C1420] text-[#C9D2DB] p-4 sm:p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={closeCheckout}
          className="absolute right-4 top-4 rounded-lg border border-slate-800 p-1.5 text-silver-dim hover:text-white transition"
        >
          ✕
        </button>

        {orderComplete ? (
          /* ============================================================ */
          /* SUCCESS STATE */
          /* ============================================================ */
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-3xl text-emerald-400 border border-emerald-500/40">
              ✓
            </div>

            <h3 className="font-display text-xl font-black text-silver-bright">
              Order Submitted Successfully!
            </h3>

            <p className="text-xs sm:text-sm text-silver-dim max-w-sm mx-auto">
              Your order is recorded and is currently <strong className="text-amber-400">PENDING</strong> verification.
              Your pre-filled WhatsApp order chat was generated.
            </p>

            <div className="rounded-xl border border-slate-800 bg-[#080D15] p-3 text-xs font-mono text-silver-dim">
              Ref ID: <span className="text-[#00C4CC]">{orderComplete.orderId}</span>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <a
                href={orderComplete.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] py-3 px-4 font-display text-sm font-bold text-white shadow-sm transition hover:scale-[1.01]"
              >
                <svg viewBox="0 0 32 32" className="h-4 w-4 fill-white">
                  <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.34.687 4.52 1.872 6.35L4 29l7.86-1.83A11.94 11.94 0 0016 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3z" />
                </svg>
                <span>Re-open WhatsApp Message</span>
              </a>

              <button
                onClick={closeCheckout}
                className="rounded-xl border border-slate-800 py-2.5 font-display text-xs font-semibold text-silver-bright hover:border-[#00C4CC] transition"
              >
                Close & Return to Shop
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* CUSTOMER FORM */
          /* ============================================================ */
          <div>
            <div className="mb-5">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-[#00C4CC]">
                Fast WhatsApp Checkout
              </span>
              <h2 className="font-display text-xl font-black text-silver-bright">
                Delivery Details
              </h2>
              <p className="mt-1 text-xs text-silver-dim">
                Please enter your contact details. Your order will be verified and dispatched via WhatsApp.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-silver-bright mb-1">
                  👤 Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Muhammad Ali"
                  className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2 text-xs sm:text-sm text-silver-bright placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-silver-bright mb-1">
                  📱 WhatsApp Number *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0348 9593671 or +92 348 9593671"
                  className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2 text-xs sm:text-sm text-silver-bright placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-silver-bright mb-1">
                    🏙️ City *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Karachi, Lahore..."
                    className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2 text-xs sm:text-sm text-silver-bright placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-silver-bright mb-1">
                    🚚 Delivery Method
                  </label>
                  <div className="rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs text-silver-dim flex items-center justify-between">
                    <span>Cash on Delivery</span>
                    <span className="text-emerald-400 font-bold">Available</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-silver-bright mb-1">
                  📍 Complete Delivery Address *
                </label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House #, Street #, Sector, Area..."
                  className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2 text-xs sm:text-sm text-silver-bright placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none font-medium resize-none"
                />
              </div>

              {/* Order Summary Mini Box */}
              <div className="rounded-xl border border-slate-800 bg-[#080D15] p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-silver-dim">
                  <span>Items ({totalItems})</span>
                  <span>PKR {subtotal.toLocaleString('en-PK')}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Coupon ({couponCode})</span>
                    <span>-PKR {couponDiscount.toLocaleString('en-PK')}</span>
                  </div>
                )}
                {bundleDiscount > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Bundle Discount</span>
                    <span>-PKR {bundleDiscount.toLocaleString('en-PK')}</span>
                  </div>
                )}
                <div className="flex justify-between text-silver-dim">
                  <span>Delivery Charges</span>
                  <span>{deliveryCharges === 0 ? 'FREE' : `PKR ${deliveryCharges.toLocaleString('en-PK')}`}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1.5 font-display text-sm font-black text-silver-bright">
                  <span>Total Amount</span>
                  <span className="text-[#00C4CC]">PKR {totalAmount.toLocaleString('en-PK')}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || items.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] py-3.5 px-4 font-display text-sm font-bold text-white shadow-[0_0_20px_rgba(37,211,102,0.3)] transition hover:scale-[1.01] disabled:opacity-50"
                >
                  <svg viewBox="0 0 32 32" className="h-4 w-4 fill-white shrink-0">
                    <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.34.687 4.52 1.872 6.35L4 29l7.86-1.83A11.94 11.94 0 0016 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3z" />
                  </svg>
                  <span>{loading ? 'Processing Order...' : 'Submit & Order on WhatsApp'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
