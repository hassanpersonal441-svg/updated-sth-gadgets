'use client';

import React from 'react';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';

interface OnlinePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentAccount: any;
  totalAmount: number;
  onContinue: () => void;
}

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

export default function OnlinePaymentModal({
  isOpen,
  onClose,
  paymentAccount,
  totalAmount,
  onContinue,
}: OnlinePaymentModalProps) {
  const { subtotal, freeShippingThreshold, deliveryCharges } = useCart();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#00C4CC]/30 bg-[#0C1420] text-[#C9D2DB] p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg border border-slate-800 p-1.5 text-silver-dim hover:text-white transition"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-[#00C4CC] mb-2">
            {getPaymentMethodLogo(paymentAccount?.payment_method_name || '') ? (
              <Image 
                src={getPaymentMethodLogo(paymentAccount?.payment_method_name || '')} 
                alt={paymentAccount?.payment_method_name || 'Online Payment'} 
                width={36} 
                height={36} 
                className="rounded-lg object-contain shrink-0"
              />
            ) : (
              <span className="text-2xl">{getPaymentMethodEmoji(paymentAccount?.payment_method_name || '')}</span>
            )}
            <span className="font-display text-lg font-bold">
              {paymentAccount?.payment_method_name || 'Online Payment'}
            </span>
          </div>
          <p className="text-xs text-silver-dim">
            Complete your payment using the details below
          </p>
        </div>

        {/* Free Shipping Progress Banner */}
        {subtotal > 0 && (
          <div className="rounded-xl border border-slate-800 bg-[#0C1420] p-2.5 space-y-2 mb-4">
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

        {/* Payment Details */}
        <div className="rounded-xl border border-slate-800 bg-[#080D15] p-4 space-y-3 mb-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-silver-dim">Account Name:</span>
              <span className="font-semibold text-silver-bright">
                {paymentAccount?.account_name || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-silver-dim">Account Number:</span>
              <span className="font-mono font-bold text-[#00C4CC]">
                {paymentAccount?.account_number || 'N/A'}
              </span>
            </div>
            {paymentAccount?.bank_name && (
              <div className="flex justify-between">
                <span className="text-silver-dim">Bank Name:</span>
                <span className="font-semibold text-silver-bright">
                  {paymentAccount.bank_name}
                </span>
              </div>
            )}
            {paymentAccount?.whatsapp_number && (
              <div className="flex justify-between">
                <span className="text-silver-dim">WhatsApp Number:</span>
                <span className="font-mono font-bold text-silver-bright">
                  {paymentAccount.whatsapp_number}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-800 pt-2">
              <span className="text-silver-dim">Amount to Pay:</span>
              <span className="font-display font-bold text-[#00C4CC]">
                Rs. {totalAmount.toLocaleString('en-PK')}
              </span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-xl border border-slate-800 bg-[#080D15] p-4 mb-4">
          <h4 className="font-display text-xs font-bold text-silver-bright mb-2">
            📋 Payment Instructions
          </h4>
          <div className="text-xs text-silver-dim leading-relaxed whitespace-pre-line">
            {paymentAccount?.instructions || 'Send the exact amount to the account number above.'}
          </div>
        </div>

        {/* Important Note */}
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 mb-4">
          <p className="text-[11px] text-amber-300">
            ⚠️ <strong>Important:</strong> After payment, send a screenshot of the transaction to our WhatsApp for verification.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] py-3 px-4 font-display text-sm font-bold text-black shadow-[0_0_20px_rgba(0,196,204,0.3)] transition hover:scale-[1.01]"
          >
            <span>✓</span>
            <span>Payment Completed - Continue</span>
          </button>

          <button
            onClick={onClose}
            className="w-full rounded-xl border border-slate-800 py-2.5 font-display text-xs font-semibold text-silver-dim hover:text-white transition"
          >
            Cancel & Go Back
          </button>
        </div>
      </div>
    </div>
  );
}