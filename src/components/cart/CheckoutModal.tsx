'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/components/theme/ThemeProvider';
import OnlinePaymentModal from './OnlinePaymentModal';

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

  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [orderComplete, setOrderComplete] = useState<{
    orderId: string;
    whatsappUrl: string;
    paymentReference?: string;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [onlinePaymentSettings, setOnlinePaymentSettings] = useState<any>(null);
  const [showOnlinePaymentModal, setShowOnlinePaymentModal] = useState(false);
  const [selectedPaymentAccount, setSelectedPaymentAccount] = useState<any>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // Load online payment settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.settings && data.settings.online_payment_enabled) {
          setOnlinePaymentSettings(data.settings);
          const activeAccounts =
            data.settings.payment_accounts?.filter((acc: any) => acc.is_active) || [];
          if (activeAccounts.length > 0) {
            setSelectedPaymentAccount(activeAccounts[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load payment settings:', err);
      }
    }
    loadSettings();
  }, []);

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

    if (paymentMethod === 'online' && !paymentConfirmed) {
      setShowOnlinePaymentModal(true);
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
          payment_method: paymentMethod,
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

      setOrderComplete({
        orderId: data.orderId,
        whatsappUrl: data.whatsappUrl,
        paymentReference: data.payment_reference,
      });

      clearCart();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while creating your order.');
    } finally {
      setLoading(false);
    }
  }

  const cardBg = isLight
    ? 'bg-white border-slate-200 shadow-[0_10px_35px_rgba(0,0,0,0.08)]'
    : 'bg-[#0B121E] border-slate-800 shadow-[0_15px_50px_rgba(0,0,0,0.8)]';

  const inputClass = `w-full rounded-2xl border px-4 py-3 text-xs sm:text-sm font-medium focus:border-[#00C4CC] focus:outline-none transition duration-200 ${
    isLight
      ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white'
      : 'border-slate-700 bg-[#060A11] text-white placeholder:text-slate-500 focus:bg-[#080E18]'
  }`;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
        <div
          className={`relative z-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border p-5 sm:p-8 transition-all ${cardBg}`}
        >
          {/* Close Header */}
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛍️</span>
              <div>
                <h2
                  className={`font-display text-lg sm:text-xl font-black ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {orderComplete ? 'Order Placed Successfully!' : 'Complete Your Order'}
                </h2>
                <p className="text-xs text-slate-400">
                  {orderComplete
                    ? 'Thank you! Finalize confirmation via WhatsApp.'
                    : 'Fast & Secure Cash on Delivery across Pakistan'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeCheckout}
              className="rounded-xl border border-slate-700/60 p-2 text-slate-400 hover:text-white transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* ORDER COMPLETE STATE */}
          {orderComplete ? (
            <div className="py-8 space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 text-3xl text-emerald-400 animate-bounce">
                ✓
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-xl sm:text-2xl font-black text-emerald-400">
                  Order #{orderComplete.orderId.slice(0, 8).toUpperCase()} Created!
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                  Click the button below to open WhatsApp and send your order confirmation directly to our support team for instant dispatch.
                </p>
              </div>

              <div className="pt-4 flex flex-col gap-3 max-w-sm mx-auto">
                <a
                  href={orderComplete.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] hover:bg-[#20BD5A] py-3.5 px-6 font-display text-sm font-black text-white shadow-[0_0_25px_rgba(37,211,102,0.4)] transition hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <svg viewBox="0 0 32 32" className="h-5 w-5 fill-white shrink-0">
                    <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.34.687 4.52 1.872 6.35L4 29l7.86-1.83A11.94 11.94 0 0016 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3z" />
                  </svg>
                  <span>Confirm on WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={closeCheckout}
                  className="rounded-2xl border border-slate-700/60 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Close & Return to Store
                </button>
              </div>
            </div>
          ) : (
            /* CHECKOUT FORM */
            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              {errorMsg && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-bold text-rose-400">
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Delivery Details Form */}
              <div className="space-y-4">
                <h3 className="font-display text-xs font-black uppercase tracking-wider text-[#00C4CC]">
                  1. Shipping &amp; Delivery Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Muhammad Ali"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      WhatsApp Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 0348 9593671"
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Lahore / Karachi"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Complete Street Address *
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="House/Shop #, Street, Area/Colony"
                      className={inputClass}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3 pt-2">
                <h3 className="font-display text-xs font-black uppercase tracking-wider text-[#00C4CC]">
                  2. Select Payment Method
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* COD */}
                  <label
                    onClick={() => setPaymentMethod('cod')}
                    className={`flex items-center gap-3.5 rounded-2xl border p-4 cursor-pointer transition ${
                      paymentMethod === 'cod'
                        ? 'border-[#00C4CC] bg-[#00C4CC]/10 shadow-[0_0_15px_rgba(0,196,204,0.2)]'
                        : isLight
                        ? 'border-slate-200 bg-slate-50'
                        : 'border-slate-800 bg-[#060A11]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="text-[#00C4CC] focus:ring-[#00C4CC]"
                    />
                    <div>
                      <strong className={`block text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        💵 Cash on Delivery (COD)
                      </strong>
                      <span className="text-[10.5px] text-slate-400">
                        Pay cash when rider delivers package
                      </span>
                    </div>
                  </label>

                  {/* Online Payment */}
                  <label
                    onClick={() => setPaymentMethod('online')}
                    className={`flex items-center gap-3.5 rounded-2xl border p-4 cursor-pointer transition ${
                      paymentMethod === 'online'
                        ? 'border-[#00C4CC] bg-[#00C4CC]/10 shadow-[0_0_15px_rgba(0,196,204,0.2)]'
                        : isLight
                        ? 'border-slate-200 bg-slate-50'
                        : 'border-slate-800 bg-[#060A11]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'online'}
                      onChange={() => setPaymentMethod('online')}
                      className="text-[#00C4CC] focus:ring-[#00C4CC]"
                    />
                    <div>
                      <strong className={`block text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        💳 Online Transfer
                      </strong>
                      <span className="text-[10.5px] text-slate-400">
                        EasyPaisa, JazzCash, Meezan Bank, SadaPay
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Order Summary Box */}
              <div
                className={`rounded-2xl border p-4 space-y-2 text-xs ${
                  isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-[#060A11]'
                }`}
              >
                <div className="flex justify-between text-slate-400">
                  <span>Items Total ({totalItems})</span>
                  <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Rs. {subtotal.toLocaleString('en-PK')}
                  </span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Coupon ({couponCode})</span>
                    <span>-Rs. {couponDiscount.toLocaleString('en-PK')}</span>
                  </div>
                )}
                {bundleDiscount > 0 && (
                  <div className="flex justify-between text-amber-400 font-semibold">
                    <span>Combo Savings</span>
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
                  className={`flex justify-between border-t pt-2 font-display text-sm sm:text-base font-black ${
                    isLight ? 'border-slate-200 text-slate-900' : 'border-slate-800 text-white'
                  }`}
                >
                  <span>Grand Total</span>
                  <span className="text-[#00C4CC]">
                    Rs. {totalAmount.toLocaleString('en-PK')}
                  </span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#00C4CC] via-[#00E5FF] to-[#00C4CC] hover:brightness-110 py-4 px-6 font-display text-sm font-black text-[#04080F] shadow-[0_0_25px_rgba(0,196,204,0.4)] transition duration-200 hover:scale-[1.01] active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? 'Creating Order...' : 'Confirm & Place Order'}</span>
                <span>→</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Online Payment Modal */}
      {showOnlinePaymentModal && (
        <OnlinePaymentModal
          isOpen={showOnlinePaymentModal}
          onClose={() => setShowOnlinePaymentModal(false)}
          paymentAccount={selectedPaymentAccount}
          totalAmount={totalAmount}
          onContinue={() => {
            setPaymentConfirmed(true);
            setShowOnlinePaymentModal(false);
          }}
        />
      )}
    </>
  );
}
