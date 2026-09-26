'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import OnlinePaymentModal from './OnlinePaymentModal';

// Helper function to get logo path for payment methods
function getPaymentMethodLogo(methodName: string): string {
  const lowerName = (methodName || '').toLowerCase();
  if (lowerName.includes('jazz')) return '/images/jazzcash-logo.png';
  if (lowerName.includes('easy') || lowerName.includes('paisa')) return '/images/easy-paisa-logo.png';
  if (lowerName.includes('meezan')) return '/images/meezan-bank-logo.png';
  if (lowerName.includes('sada')) return '/images/sadapay-logo.png';
  if (lowerName.includes('naya')) return '/images/nayapay-logo.png';
  return ''; // Return empty string for others to fall back to emoji
}

// Helper function to get fallback emoji for payment methods
function getPaymentMethodEmoji(methodName: string): string {
  const lowerName = methodName.toLowerCase();
  if (lowerName.includes('jazz')) return '📱';
  if (lowerName.includes('easy')) return '📲';
  if (lowerName.includes('bank') || lowerName.includes('meezan')) return '🏦';
  if (lowerName.includes('sada')) return '💳';
  if (lowerName.includes('naya')) return '🟢';
  return '🏛️';
}

export default function CheckoutModal() {
  const {
    items,
    totalItems,
    subtotal,
    couponCode,
    couponDiscount,
    bundleDiscount,
    deliveryCharges,
    freeShippingThreshold,
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
    paymentReference?: string;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [onlinePaymentSettings, setOnlinePaymentSettings] = useState<any>(null);
  const [paymentReference, setPaymentReference] = useState('');
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
          // Set first active account as default
          const activeAccounts = data.settings.payment_accounts?.filter((acc: any) => acc.is_active) || [];
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

    // If online payment is selected, show the payment modal first
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

      // Save order complete state
      setOrderComplete({
        orderId: data.orderId,
        whatsappUrl: data.whatsappUrl,
        paymentReference: data.payment_reference,
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
              {orderComplete.paymentReference && (
                <div className="mt-1">
                  Payment Ref: <span className="text-[#00C4CC]">{orderComplete.paymentReference}</span>
                </div>
              )}
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
                    � Payment Method *
                  </label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('cod');
                        setShowOnlinePaymentModal(false);
                      }}
                      className={`w-full rounded-xl border px-3 py-2 text-xs flex items-center justify-between transition ${
                        paymentMethod === 'cod'
                          ? 'border-[#00C4CC] bg-[#00C4CC]/10 text-[#00C4CC]'
                          : 'border-slate-700 bg-[#080D15] text-silver-dim hover:border-slate-600'
                      }`}
                    >
                      <span>Cash on Delivery</span>
                      {paymentMethod === 'cod' && <span className="text-xs">✓</span>}
                    </button>

                    {onlinePaymentSettings && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('online');
                          // Auto-open payment modal when online payment is selected
                          setShowOnlinePaymentModal(true);
                        }}
                        className={`w-full rounded-xl border px-3 py-2 text-xs flex items-center justify-between transition ${
                          paymentMethod === 'online'
                            ? 'border-[#00C4CC] bg-[#00C4CC]/10 text-[#00C4CC]'
                            : 'border-slate-700 bg-[#080D15] text-silver-dim hover:border-slate-600'
                        }`}
                      >
                        <span>Online Payment</span>
                        {paymentMethod === 'online' && <span className="text-xs">✓</span>}
                      </button>
                    )}
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

              {/* Free Shipping Progress Banner */}
              {subtotal > 0 && (
                <div className="rounded-xl border border-slate-800 bg-[#0C1420] p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-silver-dim">🚚 Free Shipping Progress</span>
                    <span className="text-[#00C4CC] font-bold">
                      {freeShippingThreshold > 0 ? (
                        subtotal >= freeShippingThreshold ? (
                          <span className="text-emerald-400">✓ FREE Shipping!</span>
                        ) : (
                          <span>Rs. {subtotal.toLocaleString('en-PK')} / Rs. {freeShippingThreshold.toLocaleString('en-PK')}</span>
                        )
                      ) : (
                        <span>Standard Delivery</span>
                      )}
                    </span>
                  </div>
                  {freeShippingThreshold > 0 && (
                    <>
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#00C4CC] to-[#00E5FF] transition-all duration-500"
                          style={{ width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%` }}
                        />
                      </div>
                      {subtotal < freeShippingThreshold && (
                        <p className="text-[10px] text-center text-silver-dim">
                          Add <span className="text-[#00C4CC] font-bold">Rs. {(freeShippingThreshold - subtotal).toLocaleString('en-PK')}</span> more for <span className="text-emerald-400 font-bold">FREE Delivery</span>!
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Online Payment Status Indicator */}
              {paymentMethod === 'online' && onlinePaymentSettings && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span className="text-sm">✓</span>
                    <span className="font-display text-xs font-bold">
                      Online Payment Selected
                    </span>
                  </div>
                  
                  {/* Payment Account Selector */}
                  {onlinePaymentSettings.payment_accounts && onlinePaymentSettings.payment_accounts.length > 1 && (
                    <div>
                      <label className="block text-xs font-semibold text-silver-bright mb-2">
                        Select Payment Method:
                      </label>
                      <div className="space-y-2">
                        {onlinePaymentSettings.payment_accounts
                          .filter((acc: any) => acc.is_active)
                          .map((account: any) => (
                            <button
                              key={account.id}
                              type="button"
                              onClick={() => setSelectedPaymentAccount(account)}
                              className={`w-full rounded-xl border px-3 py-2 text-xs flex items-center justify-between transition ${
                                selectedPaymentAccount?.id === account.id
                                  ? 'border-[#00C4CC] bg-[#00C4CC]/10 text-[#00C4CC]'
                                  : 'border-slate-700 bg-[#080D15] text-silver-dim hover:border-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {getPaymentMethodLogo(account.payment_method_name) ? (
                                  <Image 
                                    src={getPaymentMethodLogo(account.payment_method_name)} 
                                    alt={account.payment_method_name} 
                                    width={22} 
                                    height={22} 
                                    className="rounded object-contain shrink-0"
                                  />
                                ) : (
                                  <span className="text-sm">{getPaymentMethodEmoji(account.payment_method_name)}</span>
                                )}
                                <span>{account.payment_method_name}</span>
                              </div>
                              {selectedPaymentAccount?.id === account.id && <span className="text-xs">✓</span>}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowOnlinePaymentModal(true)}
                    className="w-full rounded-xl border border-[#00C4CC] bg-[#00C4CC]/10 hover:bg-[#00C4CC]/20 py-2 px-3 font-display text-xs font-bold text-[#00C4CC] transition"
                  >
                    View Payment Details
                  </button>
                </div>
              )}


              {/* Order Summary Mini Box */}
              <div className="rounded-xl border border-slate-800 bg-[#080D15] p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-silver-dim">
                  <span>Items ({totalItems})</span>
                  <span>Rs. {subtotal.toLocaleString('en-PK')}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Coupon ({couponCode})</span>
                    <span>-Rs. {couponDiscount.toLocaleString('en-PK')}</span>
                  </div>
                )}
                {bundleDiscount > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Bundle Discount</span>
                    <span>-Rs. {bundleDiscount.toLocaleString('en-PK')}</span>
                  </div>
                )}
                <div className="flex justify-between text-silver-dim">
                  <span>Delivery Charges</span>
                  <span>{deliveryCharges === 0 ? 'FREE' : `Rs. ${deliveryCharges.toLocaleString('en-PK')}`}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1.5 font-display text-sm font-black text-silver-bright">
                  <span>Total Amount</span>
                  <span className="text-[#00C4CC]">Rs. {totalAmount.toLocaleString('en-PK')}</span>
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

        {/* Online Payment Modal */}
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
      </div>
    </div>
  );
}
