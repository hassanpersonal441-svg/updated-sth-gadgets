'use client';

import React, { useState } from 'react';
import type { Borrowing } from '@/types/database';
import EmailActionModal from '@/components/admin/finance/EmailActionModal';

interface LenderProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  borrowings: Borrowing[];
  lenderName: string;
  lenderWhatsapp: string;
  lenderEmail?: string | null;
  onAddBorrowing?: () => void;
  onAddRepayment?: (borrowing: Borrowing) => void;
}

export default function LenderProfileModal({
  isOpen,
  onClose,
  borrowings,
  lenderName,
  lenderWhatsapp,
  lenderEmail,
  onAddBorrowing,
  onAddRepayment,
}: LenderProfileModalProps) {
  const [showEmailModal, setShowEmailModal] = useState(false);

  if (!isOpen) return null;

  const totalBorrowed = borrowings.reduce((sum, b) => sum + (Number(b.borrowed_amount) || 0), 0);
  const totalRepaid = borrowings.reduce((sum, b) => sum + (Number(b.total_repaid) || 0), 0);
  const totalOutstanding = borrowings.reduce((sum, b) => sum + (Number(b.remaining_amount) || 0), 0);

  const cleanPhone = lenderWhatsapp.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;

  function handleSendWhatsApp() {
    const message = `Assalam-o-Alaikum ${lenderName},\n\nThis is a summary update regarding your capital borrowings with STH Gadgets.\n\nTotal Borrowed: Rs. ${totalBorrowed.toLocaleString()}\nTotal Repaid: Rs. ${totalRepaid.toLocaleString()}\nOutstanding Balance: Rs. ${totalOutstanding.toLocaleString()}\n\nJazakAllah Khair.\nSTH Gadgets`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
  }

  const emailSubject = `STH Gadgets — Account Summary for ${lenderName}`;
  const emailBody = `Dear ${lenderName},\n\nHere is your current capital summary with STH Gadgets:\n\nTotal Borrowed: Rs. ${totalBorrowed.toLocaleString()}\nTotal Repaid: Rs. ${totalRepaid.toLocaleString()}\nRemaining Outstanding: Rs. ${totalOutstanding.toLocaleString()}\n\nThank you for your support.\n\nSTH Gadgets\nMobile Accessories & Gadgets`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-2xl text-[#C9D2DB]">
        {/* Top Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00C4CC]/20 text-xl font-bold text-[#00C4CC]">
              👤
            </div>
            <div>
              <h2 className="font-display text-lg font-black text-white">{lenderName}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span>📞 {lenderWhatsapp}</span>
                {lenderEmail && <span>✉️ {lenderEmail}</span>}
              </div>
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

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
          <div className="rounded-xl border border-slate-800 bg-[#080D15] p-3.5 text-center">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Borrowed</span>
            <span className="block font-mono text-lg font-black text-white mt-1">
              Rs. {totalBorrowed.toLocaleString()}
            </span>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-center">
            <span className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Total Repaid</span>
            <span className="block font-mono text-lg font-black text-emerald-400 mt-1">
              Rs. {totalRepaid.toLocaleString()}
            </span>
          </div>

          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-center">
            <span className="block text-[11px] font-bold text-rose-400 uppercase tracking-wider">Outstanding</span>
            <span className="block font-mono text-lg font-black text-rose-400 mt-1">
              Rs. {totalOutstanding.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Quick Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-6 p-3 rounded-xl border border-slate-800 bg-[#080D15]">
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm"
          >
            💬 WhatsApp Summary
          </button>

          {lenderEmail && (
            <button
              type="button"
              onClick={() => setShowEmailModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm"
            >
              ✉️ Email Summary
            </button>
          )}

          {onAddBorrowing && (
            <button
              type="button"
              onClick={onAddBorrowing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#00C4CC] hover:brightness-110 px-3.5 py-2 text-xs font-bold text-black transition shadow-sm ml-auto"
            >
              ➕ Add Borrowing
            </button>
          )}
        </div>

        {/* Borrowing History */}
        <div>
          <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#00C4CC] mb-3">
            Borrowing Records ({borrowings.length})
          </h3>

          <div className="space-y-3">
            {borrowings.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-slate-800 bg-[#080D15] p-4 text-xs space-y-2 hover:border-slate-700 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#00C4CC]">{b.borrowing_number}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        b.status === 'fully_paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : b.status === 'partially_paid'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {b.status.replace('_', ' ')}
                    </span>
                  </div>

                  <span className="text-slate-400">📅 {b.borrowing_date}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300 py-1 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-sans">Borrowed:</span>
                    <span className="font-bold text-white">Rs. {b.borrowed_amount?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-sans">Repaid:</span>
                    <span className="font-bold text-emerald-400">Rs. {b.total_repaid?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-sans">Remaining:</span>
                    <span className="font-bold text-rose-400">Rs. {b.remaining_amount?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-sans">Purpose:</span>
                    <span className="text-slate-300 font-sans truncate block">{b.purpose || 'General'}</span>
                  </div>
                </div>

                {b.remaining_amount > 0 && onAddRepayment && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onAddRepayment(b)}
                      className="rounded-lg bg-emerald-600/20 border border-emerald-500/40 px-3 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-600 hover:text-white transition"
                    >
                      💵 Add Repayment
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showEmailModal && lenderEmail && (
        <EmailActionModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          recipientEmail={lenderEmail}
          recipientName={lenderName}
          subject={emailSubject}
          bodyText={emailBody}
        />
      )}
    </div>
  );
}
