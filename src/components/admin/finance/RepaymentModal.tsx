'use client';

import React, { useState, useEffect } from 'react';
import type { Borrowing, RepaymentMethod } from '@/types/database';

interface RepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  borrowing: Borrowing | null;
}

export default function RepaymentModal({
  isOpen,
  onClose,
  onSave,
  borrowing,
}: RepaymentModalProps) {
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [repaymentDate, setRepaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<RepaymentMethod>('Cash');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRepaymentAmount('');
      setRepaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('Cash');
      setNotes('');
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen || !borrowing) return null;

  const remaining = Number(borrowing.remaining_amount) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!borrowing) {
      setErrorMsg('Borrowing record not selected');
      return;
    }

    const amount = Number(repaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Repayment amount must be greater than 0');
      return;
    }

    if (amount > remaining + 0.01) {
      setErrorMsg(
        `Repayment amount (PKR ${amount.toLocaleString()}) cannot exceed remaining balance (PKR ${remaining.toLocaleString()})`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/finance/repayments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowing_id: borrowing.id,
          amount,
          repayment_date: repaymentDate,
          payment_method: paymentMethod,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record repayment');
      }

      onSave();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving repayment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-emerald-500/40 bg-[#0C1420] p-6 shadow-[0_0_35px_rgba(16,185,129,0.25)] text-[#C9D2DB]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-lg text-emerald-400">
              💵
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-white">Record Repayment</h3>
              <p className="text-xs text-slate-400 font-mono">
                {borrowing.borrowing_number} — {borrowing.lender_name}
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

        {/* Current Balance Summary Box */}
        <div className="my-4 rounded-xl border border-slate-800 bg-[#080D15] p-3.5 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Original Borrowed:</span>
            <span className="font-mono text-white font-semibold">
              PKR {borrowing.borrowed_amount?.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Total Repaid:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              PKR {borrowing.total_repaid?.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-800 text-sm font-bold text-white">
            <span>Remaining Balance:</span>
            <span className="font-mono text-[#00C4CC]">
              PKR {borrowing.remaining_amount?.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs font-semibold text-rose-400">
              ⚠️ {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Repayment Amount (PKR) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              max={remaining}
              step="any"
              placeholder={`Max: ${remaining}`}
              value={repaymentAmount}
              onChange={(e) => setRepaymentAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none font-mono text-base font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Repayment Date <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              required
              value={repaymentDate}
              onChange={(e) => setRepaymentDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Payment Method <span className="text-rose-400">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as RepaymentMethod)}
              className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Notes / Transaction ID <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Bank Alfalah Txn #92837..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
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
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
            >
              <span>{submitting ? 'Recording...' : 'Save Repayment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
