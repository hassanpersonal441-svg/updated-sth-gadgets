'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Invoice, InvoiceStatus, InvoicePaymentStatus, InvoicePaymentMethod } from '@/types/database';
import ConfirmModal from '@/components/admin/ConfirmModal';

interface InvoiceStats {
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  unpaidInvoices: number;
  cancelledInvoices: number;
  totalSales: number;
  totalPaid: number;
  totalOutstanding: number;
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    unpaidInvoices: 0,
    cancelledInvoices: 0,
    totalSales: 0,
    totalPaid: 0,
    totalOutstanding: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState<string>('all');
  const [paymentStatus, setPaymentStatus] = useState<string>('all');
  const [paymentMethod, setPaymentMethod] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; invoiceNumber: string } | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (invoiceStatus !== 'all') params.set('invoice_status', invoiceStatus);
      if (paymentStatus !== 'all') params.set('payment_status', paymentStatus);
      if (paymentMethod !== 'all') params.set('payment_method', paymentMethod);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);

      const res = await fetch(`/api/admin/invoices?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Error loading invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [search, invoiceStatus, paymentStatus, paymentMethod, startDate, endDate]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleDelete = (id: string, invoiceNumber: string) => {
    setConfirmDelete({ id, invoiceNumber });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/invoices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInvoices();
      } else {
        const data = await res.json();
        alert(`Failed to delete invoice: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete invoice');
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const handleQuickStatusChange = async (id: string, newStatus: InvoiceStatus) => {
    try {
      const res = await fetch(`/api/admin/invoices/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_status: newStatus }),
      });
      if (res.ok) {
        fetchInvoices();
      }
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  const handleWhatsApp = (inv: Invoice) => {
    const rawPhone = inv.customer_whatsapp || inv.customer_phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const phone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;

    const publicUrl = `${window.location.origin}/invoice/${inv.invoice_number || inv.id}`;
    const message = `Hello ${inv.customer_name}!\n\nThank you for shopping with STH Gadgets.\n\nYour invoice details:\nInvoice No: ${inv.invoice_number}\nTotal Amount: Rs. ${inv.grand_total.toLocaleString()}\nPayment Status: ${inv.payment_status}\n\nYou can view your invoice here:\n${publicUrl}\n\nThank you for choosing STH Gadgets.`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="space-y-6 text-[#C9D2DB]">
      {/* Top Title & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase font-display">
            Invoice Management
          </h1>
          <p className="text-xs text-silver-dim mt-1">
            Create, manage, print, download, and send digital invoices for STH Gadgets customers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/invoices/new"
            className="flex items-center gap-2 rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] text-black px-4 py-2.5 text-xs sm:text-sm font-black transition shadow-md hover:scale-105"
          >
            <span>➕</span>
            <span>Create Invoice</span>
          </Link>
        </div>
      </div>

      {/* Module Switcher Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-[#0C1420] p-1.5 rounded-2xl border border-slate-800">
        <Link
          href="/admin/orders"
          className="px-4 py-2 rounded-xl text-xs font-bold text-silver-dim hover:text-white hover:bg-slate-800 transition"
        >
          📦 Orders List
        </Link>
        <Link
          href="/admin/invoices"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00C4CC] text-black shadow-sm"
        >
          📄 Invoices List & Dashboard
        </Link>
      </div>

      {/* Invoice Dashboard Statistics Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800/80 bg-[#0C1420] p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-silver-dim">Total Invoices</p>
          <p className="text-2xl font-extrabold text-white mt-1 font-mono">{stats.totalInvoices}</p>
          <p className="text-[10px] text-silver-dim mt-1 font-mono">
            Paid: {stats.paidInvoices} | Pending: {stats.pendingInvoices}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-900/30 bg-emerald-950/20 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Total Sales</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
            Rs. {stats.totalSales.toLocaleString()}
          </p>
          <p className="text-[10px] text-emerald-500/80 mt-1 font-mono">All confirmed invoices</p>
        </div>

        <div className="rounded-2xl border border-[#00C4CC]/30 bg-[#00C4CC]/5 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#00C4CC]">Total Paid</p>
          <p className="text-2xl font-extrabold text-[#00C4CC] mt-1 font-mono">
            Rs. {stats.totalPaid.toLocaleString()}
          </p>
          <p className="text-[10px] text-[#00C4CC]/80 mt-1 font-mono">Collected revenue</p>
        </div>

        <div className="rounded-2xl border border-rose-900/30 bg-rose-950/20 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Total Outstanding</p>
          <p className="text-2xl font-extrabold text-rose-400 mt-1 font-mono">
            Rs. {stats.totalOutstanding.toLocaleString()}
          </p>
          <p className="text-[10px] text-rose-500/80 mt-1 font-mono">Remaining unpaid balance</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0C1420] p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Search Field */}
          <div className="sm:col-span-2">
            <label className="block font-bold text-silver-dim mb-1">Search Invoices</label>
            <input
              type="text"
              placeholder="Invoice #, Name, Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white placeholder-slate-600 focus:border-[#00C4CC] focus:outline-none"
            />
          </div>

          {/* Invoice Status Filter */}
          <div>
            <label className="block font-bold text-silver-dim mb-1">Invoice Status</label>
            <select
              value={invoiceStatus}
              onChange={(e) => setInvoiceStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white focus:border-[#00C4CC] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Paid">Paid</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <label className="block font-bold text-silver-dim mb-1">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white focus:border-[#00C4CC] focus:outline-none"
            >
              <option value="all">All Payment Statuses</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block font-bold text-silver-dim mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white focus:border-[#00C4CC] focus:outline-none"
            >
              <option value="all">All Methods</option>
              <option value="Cash on Delivery">Cash on Delivery</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Easypaisa">Easypaisa</option>
              <option value="JazzCash">JazzCash</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setInvoiceStatus('all');
                setPaymentStatus('all');
                setPaymentMethod('all');
                setStartDate('');
                setEndDate('');
              }}
              className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-silver-dim hover:text-white hover:border-slate-700 transition"
            >
              🔄 Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Invoices Data Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0C1420] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-[#080D15] font-bold text-silver-bright uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Grand Total</th>
                <th className="py-3.5 px-4 text-right">Paid / Bal</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Payment</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-silver-dim">
                    <span className="inline-block animate-pulse">⏳ Loading invoices from database...</span>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-silver-dim">
                    No invoices found. Click <strong className="text-white">Create New Invoice</strong> to generate one.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#0F1A2A] transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#00C4CC]">
                      <Link href={`/admin/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoice_number || `STH-INV-${inv.id.slice(0, 8).toUpperCase()}`}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{inv.customer_name}</div>
                      <div className="text-[11px] text-silver-dim">📞 {inv.customer_phone} ({inv.customer_city})</div>
                    </td>
                    <td className="py-3.5 px-4 text-silver-dim font-mono">
                      {inv.invoice_date ? inv.invoice_date.split('T')[0] : ''}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                      Rs. {inv.grand_total.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[11px]">
                      <div className="text-emerald-400 font-bold">Rs. {inv.amount_paid.toLocaleString()}</div>
                      <div className="text-rose-400">Bal: Rs. {inv.remaining_amount.toLocaleString()}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <select
                        value={inv.invoice_status}
                        onChange={(e) => handleQuickStatusChange(inv.id, e.target.value as InvoiceStatus)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold border bg-[#080D15] cursor-pointer focus:outline-none ${
                          inv.invoice_status === 'Paid' || inv.invoice_status === 'Confirmed' || inv.invoice_status === 'Delivered'
                            ? 'border-emerald-500/40 text-emerald-400'
                            : inv.invoice_status === 'Pending'
                            ? 'border-amber-500/40 text-amber-400'
                            : inv.invoice_status === 'Cancelled'
                            ? 'border-rose-500/40 text-rose-400'
                            : 'border-slate-700 text-slate-300'
                        }`}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Paid">Paid</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                          inv.payment_status === 'Paid'
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                            : inv.payment_status === 'Partial'
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                            : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {inv.payment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/invoices/${inv.id}`}
                          title="View Invoice"
                          className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-white hover:border-[#00C4CC] transition"
                        >
                          👁️
                        </Link>
                        <Link
                          href={`/admin/invoices/${inv.id}/edit`}
                          title="Edit Invoice"
                          className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-white hover:border-[#00C4CC] transition"
                        >
                          ✏️
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleWhatsApp(inv)}
                          title="Send WhatsApp"
                          className="rounded-lg border border-emerald-900/40 bg-emerald-950/40 p-1.5 text-emerald-400 hover:bg-emerald-800/40 transition"
                        >
                          💬
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(inv.id, inv.invoice_number)}
                          disabled={deletingId === inv.id}
                          title="Delete Invoice"
                          className="rounded-lg border border-rose-900/40 bg-rose-950/40 p-1.5 text-rose-400 hover:bg-rose-800/40 transition disabled:opacity-50"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={executeDelete}
        title="Delete Invoice"
        description={`Are you sure you want to delete invoice "${confirmDelete?.invoiceNumber}"? This action cannot be undone.`}
        confirmText="Delete Invoice"
      />
    </div>
  );
}
