'use client';

import React, { useState, useEffect } from 'react';
import type { Borrowing } from '@/types/database';
import BorrowingModal from '@/components/admin/finance/BorrowingModal';
import RepaymentModal from '@/components/admin/finance/RepaymentModal';
import LenderProfileModal from '@/components/admin/finance/LenderProfileModal';
import EmailActionModal from '@/components/admin/finance/EmailActionModal';
import ConfirmModal from '@/components/admin/ConfirmModal';

export default function BorrowedAmountsPage() {
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [isBorrowingModalOpen, setIsBorrowingModalOpen] = useState(false);
  const [selectedBorrowing, setSelectedBorrowing] = useState<Borrowing | null>(null);

  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = useState(false);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileLenderData, setProfileLenderData] = useState<{
    name: string;
    whatsapp: string;
    email?: string | null;
    items: Borrowing[];
  } | null>(null);

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailModalData, setEmailModalData] = useState<{
    recipientEmail: string;
    recipientName: string;
    subject: string;
    bodyText: string;
  }>({
    recipientEmail: '',
    recipientName: '',
    subject: '',
    bodyText: '',
  });

  useEffect(() => {
    fetchBorrowings();
  }, [searchQuery, statusFilter, startDate, endDate]);

  async function fetchBorrowings() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (statusFilter) params.set('status', statusFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/admin/finance/borrowings?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBorrowings(data.borrowings || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  // Confirm Modal State
  const [confirmDeleteData, setConfirmDeleteData] = useState<{
    id: string;
    title: string;
    description: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  function handleDeleteClick(id: string, name: string, borNum: string) {
    setConfirmDeleteData({
      id,
      title: `Delete Borrowing Record (${borNum})`,
      description: `Are you sure you want to delete borrowing record ${borNum} for "${name}"? This will also delete all associated repayments.`,
    });
  }

  async function handleConfirmDelete() {
    if (!confirmDeleteData) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/finance/borrowings/${confirmDeleteData.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchBorrowings();
      } else {
        alert('Failed to delete borrowing record.');
      }
    } catch {
      alert('An error occurred while deleting.');
    } finally {
      setDeleting(false);
      setConfirmDeleteData(null);
    }
  }

  function handleOpenAddModal() {
    setSelectedBorrowing(null);
    setIsBorrowingModalOpen(true);
  }

  function handleOpenEditModal(b: Borrowing) {
    setSelectedBorrowing(b);
    setIsBorrowingModalOpen(true);
  }

  function handleOpenRepaymentModal(b: Borrowing) {
    setSelectedBorrowing(b);
    setIsRepaymentModalOpen(true);
  }

  function handleOpenProfileModal(b: Borrowing) {
    const lenderItems = borrowings.filter(
      (item) => item.whatsapp_number.replace(/\D/g, '') === b.whatsapp_number.replace(/\D/g, '')
    );
    setProfileLenderData({
      name: b.lender_name,
      whatsapp: b.whatsapp_number,
      email: b.email,
      items: lenderItems,
    });
    setIsProfileModalOpen(true);
  }

  function handleSendWhatsApp(b: Borrowing) {
    const cleanPhone = b.whatsapp_number.replace(/\D/g, '');
    const phone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;

    let orderInfo = '';
    if (b.related_order_number) {
      orderInfo = `\nOrder: ${b.related_order_number}`;
    }

    let purposeInfo = '';
    if (b.purpose) {
      purposeInfo = `\nPurpose: ${b.purpose}`;
    }

    const message = `STH Gadgets — Borrowing Record\n\nAssalam-o-Alaikum,\n\nThis is to confirm that an amount of PKR ${b.borrowed_amount?.toLocaleString()} has been borrowed.\n\nLender: ${b.lender_name}\nAmount Borrowed: PKR ${b.borrowed_amount?.toLocaleString()}\nDate: ${b.borrowing_date}${purposeInfo}${orderInfo}\n\nCurrent Remaining Balance: PKR ${b.remaining_amount?.toLocaleString()}\n\nJazakAllah Khair.`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  }

  function handleSendEmail(b: Borrowing) {
    if (!b.email) {
      alert('No email address saved for this lender. Please click Edit to add an email address.');
      return;
    }

    let orderLine = '';
    if (b.related_order_number) {
      orderLine = `\nRelated Order: ${b.related_order_number}`;
    }

    let purposeLine = '';
    if (b.purpose) {
      purposeLine = `\nPurpose: ${b.purpose}`;
    }

    const subject = `STH Gadgets — Borrowed Amount Confirmation ${b.borrowing_number}`;
    const body = `Dear ${b.lender_name},\n\nThis email confirms that STH Gadgets has borrowed the following amount:\n\nBorrowing ID: ${b.borrowing_number}\nAmount Borrowed: PKR ${b.borrowed_amount?.toLocaleString()}\nDate: ${b.borrowing_date}${purposeLine}${orderLine}\n\nCurrent Remaining Balance:\nPKR ${b.remaining_amount?.toLocaleString()}\n\nThank you.\n\nSTH Gadgets\nMobile Accessories & Gadgets`;

    setEmailModalData({
      recipientEmail: b.email,
      recipientName: b.lender_name,
      subject,
      bodyText: body,
    });
    setIsEmailModalOpen(true);
  }

  function handleSendRepaymentWhatsApp(b: Borrowing) {
    const cleanPhone = b.whatsapp_number.replace(/\D/g, '');
    const phone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;

    const statusText = b.status === 'fully_paid' ? 'Fully Paid' : 'Partially Paid';
    const message = `STH Gadgets — Repayment Confirmation\n\nAssalam-o-Alaikum,\n\nThis is to confirm the repayment of borrowed amount.\n\nLender: ${b.lender_name}\n\nOriginal Borrowed Amount: PKR ${b.borrowed_amount?.toLocaleString()}\nTotal Repaid: PKR ${b.total_repaid?.toLocaleString()}\nRemaining Balance: PKR ${b.remaining_amount?.toLocaleString()}\n\nStatus: ${statusText}\nLast Repayment Date: ${b.updated_at ? b.updated_at.split('T')[0] : b.borrowing_date}\n\nJazakAllah Khair.`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  }

  function handleSendRepaymentEmail(b: Borrowing) {
    if (!b.email) {
      alert('No email address saved for this lender. Please click Edit to add an email address.');
      return;
    }

    const statusText = b.status === 'fully_paid' ? 'Fully Paid' : 'Partially Paid';
    const subject = `STH Gadgets — Repayment Confirmation ${b.borrowing_number}`;
    const body = `Dear ${b.lender_name},\n\nThis email confirms the repayment details for Borrowing ID ${b.borrowing_number}:\n\nOriginal Borrowed Amount:\nPKR ${b.borrowed_amount?.toLocaleString()}\n\nTotal Repaid:\nPKR ${b.total_repaid?.toLocaleString()}\n\nRemaining Balance:\nPKR ${b.remaining_amount?.toLocaleString()}\n\nStatus:\n${statusText}\n\nRepayment Date:\n${b.updated_at ? b.updated_at.split('T')[0] : b.borrowing_date}\n\nThank you.\n\nSTH Gadgets\nMobile Accessories & Gadgets`;

    setEmailModalData({
      recipientEmail: b.email,
      recipientName: b.lender_name,
      subject,
      bodyText: body,
    });
    setIsEmailModalOpen(true);
  }

  return (
    <div className="space-y-6 text-[#C9D2DB]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <h1 className="font-display text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
              Borrowed Amounts Management
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track capital borrowed from lenders, repayments, outstanding balances, and send confirmations.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00C4CC] to-cyan-600 px-5 py-2.5 text-xs font-black text-black shadow-md hover:brightness-110 transition"
        >
          <span>➕ Add Borrowed Amount</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 bg-[#0C1420] p-4 rounded-2xl border border-slate-800 shadow-md">
        {/* Search */}
        <div className="sm:col-span-2 lg:col-span-5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Search</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lender, phone, email, #BOR, or #STH order..."
            className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-[#00C4CC] focus:outline-none"
          />
        </div>

        {/* Status Filter */}
        <div className="lg:col-span-3">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2 text-xs text-white focus:border-[#00C4CC] focus:outline-none"
          >
            <option value="">-- All Statuses --</option>
            <option value="active">Active (Unpaid)</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="fully_paid">Fully Paid</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="lg:col-span-2">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2 text-xs text-white focus:border-[#00C4CC] focus:outline-none"
          />
        </div>

        {/* End Date */}
        <div className="lg:col-span-2">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2 text-xs text-white focus:border-[#00C4CC] focus:outline-none"
          />
        </div>
      </div>

      {/* Main Records Container: Desktop Table + Mobile Cards */}
      <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-4 sm:p-6 shadow-xl">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            ⏳ Loading borrowing records...
          </div>
        ) : borrowings.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No borrowing records found matching your filters.
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE VIEW (Hidden on mobile) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-3">Borrowing ID</th>
                    <th className="py-3 px-3">Lender Details</th>
                    <th className="py-3 px-3 text-right">Borrowed</th>
                    <th className="py-3 px-3 text-right">Repaid</th>
                    <th className="py-3 px-3 text-right">Remaining</th>
                    <th className="py-3 px-3">Purpose / Order</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {borrowings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleOpenProfileModal(b)}
                          className="font-bold text-[#00C4CC] hover:underline"
                        >
                          {b.borrowing_number}
                        </button>
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                          {b.borrowing_date}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-sans">
                        <button
                          type="button"
                          onClick={() => handleOpenProfileModal(b)}
                          className="font-bold text-white hover:text-[#00C4CC] block text-left"
                        >
                          {b.lender_name}
                        </button>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          📞 {b.whatsapp_number}
                        </div>
                        {b.email && (
                          <div className="text-[10px] text-slate-400 font-sans truncate max-w-[140px]">
                            ✉️ {b.email}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold text-white">
                        PKR {Number(b.borrowed_amount).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-3 text-right text-emerald-400 font-bold">
                        PKR {Number(b.total_repaid).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-3 text-right text-rose-400 font-bold">
                        PKR {Number(b.remaining_amount).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-3 font-sans">
                        <span className="block font-semibold text-slate-200">
                          {b.purpose || 'General'}
                        </span>
                        {b.related_order_number && (
                          <span className="inline-block mt-0.5 rounded bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.2 text-[9px] font-mono text-blue-400 font-bold">
                            {b.related_order_number}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center font-sans">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                            b.status === 'fully_paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : b.status === 'partially_paid'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {b.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {b.remaining_amount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenRepaymentModal(b)}
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white transition shadow-sm"
                            >
                              💵 Repay
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(b)}
                            title="Send Borrowing WhatsApp Confirmation"
                            className="rounded-lg bg-[#25D366]/20 border border-[#25D366]/40 p-1.5 text-xs text-[#25D366] hover:bg-[#25D366] hover:text-white transition"
                          >
                            💬
                          </button>

                          {b.email && (
                            <button
                              type="button"
                              onClick={() => handleSendEmail(b)}
                              title="Send Borrowing Email Confirmation"
                              className="rounded-lg bg-blue-500/20 border border-blue-500/40 p-1.5 text-xs text-blue-400 hover:bg-blue-600 hover:text-white transition"
                            >
                              ✉️
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(b)}
                            title="Edit Borrowing"
                            className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-xs text-slate-300 hover:text-white transition"
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteClick(b.id, b.lender_name, b.borrowing_number)}
                            title="Delete Borrowing"
                            className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-xs text-rose-400 hover:bg-rose-600 hover:text-white transition"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARD VIEW (Responsive layout for mobile screens 320px–430px) */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {borrowings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl border border-slate-800 bg-[#080D15] p-4 text-xs space-y-3 shadow-md"
                >
                  {/* Card Top Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div>
                      <button
                        type="button"
                        onClick={() => handleOpenProfileModal(b)}
                        className="font-bold text-white text-sm hover:text-[#00C4CC] block text-left"
                      >
                        {b.lender_name}
                      </button>
                      <span className="font-mono text-[11px] font-bold text-[#00C4CC]">
                        {b.borrowing_number}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
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

                  {/* Contact Info */}
                  <div className="space-y-0.5 text-slate-400">
                    <p className="font-mono">📞 {b.whatsapp_number}</p>
                    {b.email && <p>✉️ {b.email}</p>}
                    <p>📅 Date: {b.borrowing_date}</p>
                    {b.purpose && <p>📌 Purpose: {b.purpose}</p>}
                    {b.related_order_number && (
                      <p className="font-mono text-blue-400">🛍️ Order: {b.related_order_number}</p>
                    )}
                  </div>

                  {/* Financial Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 bg-[#0C1420] p-2.5 rounded-xl border border-slate-800/80 font-mono text-center">
                    <div>
                      <span className="block text-[9px] text-slate-400 font-sans uppercase">Borrowed</span>
                      <span className="font-bold text-white text-xs">
                        IDR {Number(b.borrowed_amount).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 font-sans uppercase">Repaid</span>
                      <span className="font-bold text-emerald-400 text-xs">
                        IDR {Number(b.total_repaid).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 font-sans uppercase">Remaining</span>
                      <span className="font-bold text-rose-400 text-xs">
                        IDR {Number(b.remaining_amount).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Action Buttons */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(b)}
                        className="rounded-lg bg-[#25D366]/20 border border-[#25D366]/40 px-2.5 py-1.5 text-xs text-[#25D366] font-bold"
                      >
                        💬 WA
                      </button>

                      {b.email && (
                        <button
                          type="button"
                          onClick={() => handleSendEmail(b)}
                          className="rounded-lg bg-blue-500/20 border border-blue-500/40 px-2.5 py-1.5 text-xs text-blue-400 font-bold"
                        >
                          ✉️ Email
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenProfileModal(b)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 font-bold"
                      >
                        👤 View
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {b.remaining_amount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenRepaymentModal(b)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                        >
                          💵 Repay
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(b)}
                        className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-xs text-slate-300"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <BorrowingModal
        isOpen={isBorrowingModalOpen}
        onClose={() => setIsBorrowingModalOpen(false)}
        onSave={fetchBorrowings}
        initialData={selectedBorrowing}
      />

      <RepaymentModal
        isOpen={isRepaymentModalOpen}
        onClose={() => setIsRepaymentModalOpen(false)}
        onSave={fetchBorrowings}
        borrowing={selectedBorrowing}
      />

      <LenderProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        borrowings={profileLenderData?.items || []}
        lenderName={profileLenderData?.name || ''}
        lenderWhatsapp={profileLenderData?.whatsapp || ''}
        lenderEmail={profileLenderData?.email}
        onAddBorrowing={handleOpenAddModal}
        onAddRepayment={(b) => {
          setIsProfileModalOpen(false);
          handleOpenRepaymentModal(b);
        }}
      />

      <EmailActionModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        recipientEmail={emailModalData.recipientEmail}
        recipientName={emailModalData.recipientName}
        subject={emailModalData.subject}
        bodyText={emailModalData.bodyText}
      />

      <ConfirmModal
        isOpen={!!confirmDeleteData}
        onClose={() => setConfirmDeleteData(null)}
        onConfirm={handleConfirmDelete}
        title={confirmDeleteData?.title || 'Delete Borrowing Record'}
        description={confirmDeleteData?.description || ''}
        confirmText="Delete Record"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
