'use client';

import React from 'react';
import Image from 'next/image';
import type { Settings } from '@/types/database';
import { useTheme } from '@/components/theme/ThemeProvider';

interface ProductOnlinePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings | null;
  productName: string;
  price: number;
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

export default function ProductOnlinePaymentModal({
  isOpen,
  onClose,
  settings,
  productName,
  price,
}: ProductOnlinePaymentModalProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  if (!isOpen) return null;

  const activeAccounts = settings?.payment_accounts?.filter((acc) => acc.is_active) || [];
  const whatsappNumber = settings?.whatsapp_number || '+92 348 9593671';
  const currencySymbol = settings?.currency_symbol || 'Rs.';

  const handleSendToWhatsApp = () => {
    const message = `Hello STH Gadgets!\n\nI want to order: ${productName}\nPrice: ${currencySymbol} ${price.toLocaleString()}\n\nI have made the online payment. Please find the payment screenshot attached.\n\nPlease confirm my order.\n\nThank you!`;
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className={`relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-2xl transition ${
        isLight
          ? 'border-slate-200 bg-white text-slate-800'
          : 'border-[#00C4CC]/30 bg-[#0C1420] text-[#C9D2DB]'
      }`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute right-4 top-4 rounded-lg border p-1.5 transition ${
            isLight
              ? 'border-slate-200 text-slate-500 hover:text-black hover:bg-slate-100'
              : 'border-slate-800 text-silver-dim hover:text-white'
          }`}
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-[#00C4CC] mb-2">
            <span className="text-2xl">💳</span>
            <span className="font-display text-lg font-bold">Online Payment</span>
          </div>
          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-silver-dim'}`}>
            Complete your payment using the account details below
          </p>
        </div>

        {/* Product Info */}
        <div className={`rounded-xl border p-3 mb-4 ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-[#080D15]'
        }`}>
          <div className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-silver-bright'}`}>{productName}</div>
          <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-silver-dim'}`}>Price: {currencySymbol} {price.toLocaleString()}</div>
        </div>

        {/* Payment Accounts */}
        {activeAccounts.length > 0 ? (
          <div className="space-y-3 mb-4">
            {activeAccounts.map((account) => (
              <div key={account.id} className={`rounded-xl border p-4 space-y-3 ${
                isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-[#080D15]'
              }`}>
                <div className="flex items-center gap-2 text-[#00C4CC]">
                  {getPaymentMethodLogo(account.payment_method_name) ? (
                    <Image 
                      src={getPaymentMethodLogo(account.payment_method_name)} 
                      alt={account.payment_method_name} 
                      width={28} 
                      height={28} 
                      className="rounded-md object-contain shrink-0"
                    />
                  ) : (
                    <span className="text-lg">{getPaymentMethodEmoji(account.payment_method_name)}</span>
                  )}
                  <span className="font-display text-sm font-bold">{account.payment_method_name}</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-500' : 'text-silver-dim'}>Account Name:</span>
                    <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-silver-bright'}`}>{account.account_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-500' : 'text-silver-dim'}>Account Number:</span>
                    <span className="font-mono font-bold text-[#00C4CC]">{account.account_number}</span>
                  </div>
                  {account.bank_name && (
                    <div className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-silver-dim'}>Bank Name:</span>
                      <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-silver-bright'}`}>{account.bank_name}</span>
                    </div>
                  )}
                  {account.whatsapp_number && (
                    <div className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-silver-dim'}>WhatsApp Number:</span>
                      <span className="font-mono font-bold text-[#00C4CC]">{account.whatsapp_number}</span>
                    </div>
                  )}
                </div>

                {account.instructions && (
                  <div className={`rounded-lg p-2 ${isLight ? 'bg-white border border-slate-200' : 'bg-slate-800/50'}`}>
                    <p className={`text-[11px] leading-relaxed whitespace-pre-line ${isLight ? 'text-slate-600' : 'text-silver-dim'}`}>
                      {account.instructions}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={`rounded-xl border border-dashed p-4 text-center mb-4 ${
            isLight ? 'border-slate-300 bg-slate-50 text-slate-500' : 'border-slate-700 bg-[#080D15]/50 text-silver-dim'
          }`}>
            <p className="text-xs">No payment accounts configured</p>
          </div>
        )}

        {/* Important Note */}
        <div className={`rounded-lg border p-3 mb-4 ${
          isLight
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          <p className="text-[11px]">
            ⚠️ <strong>Important:</strong> After payment, send a screenshot of the transaction to our WhatsApp for verification.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleSendToWhatsApp}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#128C7E] py-3 px-4 font-display text-sm font-bold text-white shadow-[0_0_20px_rgba(37,211,102,0.3)] transition hover:scale-[1.01]"
          >
            <span>📱</span>
            <span>Send Payment Screenshot to WhatsApp</span>
          </button>

          <button
            onClick={onClose}
            className={`w-full rounded-xl border py-2.5 font-display text-xs font-semibold transition ${
              isLight
                ? 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                : 'border-slate-800 text-silver-dim hover:text-white'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
