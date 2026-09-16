'use client';

import React, { useState, useEffect } from 'react';
import type { Borrowing } from '@/types/database';

interface BorrowingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialData?: Borrowing | null;
}

const PURPOSE_OPTIONS = [
  'Power Bank Order',
  'Earbuds Order',
  'Charger Order',
  'Speaker Order',
  'Smart Watch Order',
  'General',
  'Other',
];

export default function BorrowingModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: BorrowingModalProps) {
  const [lenderName, setLenderName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [borrowedAmount, setBorrowedAmount] = useState('');
  const [borrowingDate, setBorrowingDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [purpose, setPurpose] = useState('Power Bank Order');
  const [customPurpose, setCustomPurpose] = useState('');
  const [relatedOrderId, setRelatedOrderId] = useState('');
  const [notes, setNotes] = useState('');

  const [orders, setOrders] = useState<Array<{ id: string; order_number?: string; customer_name: string; total_amount: number }>>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
      if (initialData) {
        setLenderName(initialData.lender_name || '');
        setWhatsappNumber(initialData.whatsapp_number || '');
        setEmail(initialData.email || '');
        setBorrowedAmount(String(initialData.borrowed_amount || ''));
        setBorrowingDate(
          initialData.borrowing_date
            ? initialData.borrowing_date.split('T')[0]
            : new Date().toISOString().split('T')[0]
        );

        if (initialData.purpose && PURPOSE_OPTIONS.includes(initialData.purpose)) {
          setPurpose(initialData.purpose);
          setCustomPurpose('');
        } else if (initialData.purpose) {
          setPurpose('Other');
          setCustomPurpose(initialData.purpose);
        } else {
          setPurpose('General');
          setCustomPurpose('');
        }

        setRelatedOrderId(initialData.related_order_id || '');
        setNotes(initialData.notes || '');
      } else {
        setLenderName('');
        setWhatsappNumber('');
        setEmail('');
        setBorrowedAmount('');
        setBorrowingDate(new Date().toISOString().split('T')[0]);
        setPurpose('Power Bank Order');
        setCustomPurpose('');
        setRelatedOrderId('');
        setNotes('');
      }
      setErrorMsg('');
    }
  }, [isOpen, initialData]);

  async function fetchOrders() {
    setLoadingOrders(true);
    try {
      const res = await fetch('/api/admin/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingOrders(false);
    }
  }

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!lenderName.trim()) {
      setErrorMsg('Lender Name is required');
      return;
    }

    if (!whatsappNumber.trim()) {
      setErrorMsg('WhatsApp Number is required');
      return;
    }

    const amount = Number(borrowedAmount);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Borrowed Amount must be greater than 0');
      return;
    }

    if (!borrowingDate) {
      setErrorMsg('Borrowing Date is required');
      return;
    }

    const finalPurpose = purpose === 'Other' ? customPurpose.trim() || 'Other' : purpose;

    setSubmitting(true);
    try {
      const url = initialData
        ? `/api/admin/finance/borrowings/${initialData.id}`
        : '/api/admin/finance/borrowings';
      const method = initialData ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lender_name: lenderName.trim(),
          whatsapp_number: whatsappNumber.trim(),
          email: email.trim() || null,
          borrowed_amount: amount,
          borrowing_date: borrowingDate,
          purpose: finalPurpose,
          related_order_id: relatedOrderId || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save borrowing record');
      }

      onSave();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#00C4CC]/40 bg-[#0C1420] p-6 shadow-[0_0_35px_rgba(0,196,204,0.25)] text-[#C9D2DB]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00C4CC]/20 text-lg text-[#00C4CC]">
              💰
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-white">
                {initialData ? 'Edit Borrowed Amount' : 'Add Borrowed Amount'}
              </h3>
              <p className="text-xs text-slate-400">
                Record borrowed capital from a lender to fulfill customer orders.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {errorMsg && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs font-semibold text-rose-400">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Lender Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Lender Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ali Khan"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#00C4CC] focus:outline-none"
              />
            </div>

            {/* WhatsApp Number */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                WhatsApp Number <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 0300 1234567"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#00C4CC] focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Email Address <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="email"
                placeholder="e.g. lender@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#00C4CC] focus:outline-none"
              />
            </div>

            {/* Borrowed Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Borrowed Amount (Rs.) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                placeholder="e.g. 2200"
                value={borrowedAmount}
                onChange={(e) => setBorrowedAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#00C4CC] focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Borrowing Date */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Borrowing Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={borrowingDate}
                onChange={(e) => setBorrowingDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2.5 text-xs text-white focus:border-[#00C4CC] focus:outline-none"
              />
            </div>

            {/* Purpose Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Purpose <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2.5 text-xs text-white focus:border-[#00C4CC] focus:outline-none"
              >
                {PURPOSE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {purpose === 'Other' && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Specify Other Purpose <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Custom purpose details..."
                value={customPurpose}
                onChange={(e) => setCustomPurpose(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2.5 text-xs text-white focus:border-[#00C4CC] focus:outline-none"
              />
            </div>
          )}

          {/* Related Order Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Related Order <span className="text-slate-500 font-normal">(Optional — Link to customer order)</span>
            </label>
            <select
              value={relatedOrderId}
              onChange={(e) => setRelatedOrderId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2.5 text-xs text-white focus:border-[#00C4CC] focus:outline-none font-mono"
            >
              <option value="">-- No Related Order (Standalone Borrowing) --</option>
              {orders.map((ord) => (
                <option key={ord.id} value={ord.id}>
                  {ord.order_number || `#ORD-${ord.id.slice(0, 6)}`} — {ord.customer_name} (Rs. {ord.total_amount?.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Notes <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Additional borrowing agreements or terms..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-[#00C4CC] focus:outline-none"
            />
          </div>

          {/* Modal Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-[#080D15] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00C4CC] to-cyan-600 px-6 py-2.5 text-xs font-black text-black shadow-md hover:brightness-110 transition disabled:opacity-50"
            >
              <span>{submitting ? 'Saving...' : initialData ? 'Update Borrowing' : 'Save Borrowing'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
