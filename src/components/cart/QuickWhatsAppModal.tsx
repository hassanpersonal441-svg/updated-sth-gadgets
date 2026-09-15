'use client';

import React, { useState, useEffect } from 'react';

interface QuickWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, phone: string) => Promise<void>;
  title?: string;
  subtitle?: string;
}

export default function QuickWhatsAppModal({
  isOpen,
  onClose,
  onSubmit,
  title = 'Quick WhatsApp Order',
  subtitle = 'Please enter your contact number so we can record your order & send updates.',
}: QuickWhatsAppModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const savedName = localStorage.getItem('sth_customer_name');
      const savedPhone = localStorage.getItem('sth_customer_phone');
      if (savedName) setCustomerName(savedName);
      if (savedPhone) setPhone(savedPhone);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 7) {
      setErrorMsg('Please enter a valid WhatsApp phone number (e.g. 0348 9593671)');
      return;
    }

    const name = customerName.trim() || 'WhatsApp Customer';

    if (typeof window !== 'undefined') {
      localStorage.setItem('sth_customer_name', name);
      localStorage.setItem('sth_customer_phone', cleanPhone);
    }

    setLoading(true);
    try {
      await onSubmit(name, cleanPhone);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit order.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#00C4CC]/40 bg-[#0C1420] p-6 shadow-[0_0_35px_rgba(0,196,204,0.3)] text-[#C9D2DB]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#25D366]/20 text-lg text-[#25D366]">
              💬
            </span>
            <div>
              <h3 className="font-display text-sm sm:text-base font-bold text-white">{title}</h3>
              <p className="text-[11px] text-silver-dim">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-silver-dim hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {errorMsg && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-400 font-semibold">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-silver-bright mb-1">
              Your Phone Number (WhatsApp / Mobile) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 0348 9593671"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#00C4CC] focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-silver-bright mb-1">
              Your Name <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Ali Khan"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#00C4CC] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-[#080D15] px-4 py-2.5 text-xs font-semibold text-silver-dim hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] px-5 py-2.5 text-xs font-black text-white shadow-md transition disabled:opacity-50"
            >
              <svg viewBox="0 0 32 32" className="h-4 w-4 fill-white shrink-0">
                <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.34.687 4.52 1.872 6.35L4 29l7.86-1.83A11.94 11.94 0 0016 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3z" />
              </svg>
              <span>{loading ? 'Submitting Order...' : 'Confirm & Open WhatsApp'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
