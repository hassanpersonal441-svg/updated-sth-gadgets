'use client';

import React, { useState, useEffect } from 'react';

export default function RepaymentHistoryPage() {
  const [repayments, setRepayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRepayments();
  }, []);

  async function fetchRepayments() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/finance/repayments');
      if (res.ok) {
        const data = await res.json();
        setRepayments(data.repayments || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function handleSendWhatsApp(r: any) {
    const rawPhone = r.borrowings?.whatsapp_number || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const phone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;
    const lenderName = r.borrowings?.lender_name || 'Lender';

    const message = `STH Gadgets — Repayment Confirmation\n\nAssalam-o-Alaikum ${lenderName},\n\nThis is to confirm that a repayment of PKR ${Number(r.amount).toLocaleString()} has been processed.\n\nRepayment No: ${r.repayment_number || 'REP'}\nDate: ${r.repayment_date}\nPayment Method: ${r.payment_method}${r.notes ? `\nNotes: ${r.notes}` : ''}\n\nJazakAllah Khair.\nSTH Gadgets`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  }

  return (
    <div className="space-y-6 text-[#C9D2DB]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📜</span>
            <h1 className="font-display text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
              Repayment Audit Trail
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete history of all capital repayments made to lenders.
          </p>
        </div>
      </div>

      {/* Main Table / List Container */}
      <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-4 sm:p-6 shadow-xl">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            ⏳ Loading repayment history...
          </div>
        ) : repayments.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No repayments logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3">Repayment ID</th>
                  <th className="py-3 px-3">Borrowing ID</th>
                  <th className="py-3 px-3">Lender Name</th>
                  <th className="py-3 px-3 text-right">Repayment Amount</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3">Notes</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {repayments.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-3 font-bold text-emerald-400">
                      {r.repayment_number || '#REP'}
                    </td>

                    <td className="py-3.5 px-3 text-[#00C4CC] font-bold">
                      {r.borrowings?.borrowing_number || '#BOR'}
                    </td>

                    <td className="py-3.5 px-3 font-sans font-medium text-white">
                      {r.borrowings?.lender_name || 'Lender'}
                      <div className="text-[10px] text-slate-400 font-mono">
                        📞 {r.borrowings?.whatsapp_number}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-right font-bold text-emerald-400 text-sm">
                      PKR {Number(r.amount).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-3 font-sans text-slate-300">
                      {r.repayment_date}
                    </td>

                    <td className="py-3.5 px-3 font-sans">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-200">
                        {r.payment_method}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-sans text-slate-400 truncate max-w-[200px]">
                      {r.notes || '—'}
                    </td>

                    <td className="py-3.5 px-3 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(r)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#25D366]/20 border border-[#25D366]/40 px-2.5 py-1 text-xs text-[#25D366] font-bold hover:bg-[#25D366] hover:text-white transition"
                      >
                        💬 Confirm WA
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
