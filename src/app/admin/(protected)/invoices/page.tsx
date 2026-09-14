'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { Order } from '@/types/database';
import InvoiceModal from '@/components/admin/InvoiceModal';
import { useToast } from '@/context/ToastContext';

const TABS = [
  { id: 'all', label: 'All Invoices' },
  { id: 'approved', label: 'Approved' },
  { id: 'processing', label: 'Processing' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'pending', label: 'Pending' },
];

let cachedInvoices: Order[] | null = null;

export default function AdminInvoicesPage() {
  const { success, error: showErrorToast } = useToast();
  const [orders, setOrders] = useState<Order[]>(cachedInvoices || []);
  const [loading, setLoading] = useState(!cachedInvoices);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  async function fetchInvoices() {
    if (!cachedInvoices) setLoading(true);
    try {
      const res = await fetch('/api/admin/orders');
      const data = await res.json();
      if (data.orders) {
        cachedInvoices = data.orders;
        setOrders(data.orders);
      }
    } catch {
      showErrorToast('Failed to load invoices list.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Filter orders by tab and search query
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (selectedTab !== 'all' && o.status !== selectedTab) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const invNum = `inv-${o.order_number ? o.order_number : o.id.slice(0, 8)}`.toLowerCase();
        const matchName = o.customer_name.toLowerCase().includes(q);
        const matchPhone = o.phone.toLowerCase().includes(q);
        const matchCity = o.city.toLowerCase().includes(q);
        const matchInv = invNum.includes(q);
        return matchName || matchPhone || matchCity || matchInv;
      }

      return true;
    });
  }, [orders, selectedTab, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalCount = orders.length;
    const totalValue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const approvedCount = orders.filter((o) => o.status !== 'pending' && o.status !== 'cancelled' && o.status !== 'rejected').length;
    const pendingCount = orders.filter((o) => o.status === 'pending').length;

    return { totalCount, totalValue, approvedCount, pendingCount };
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00C4CC]/10 text-[#00C4CC] border border-[#00C4CC]/30">
              📄
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-silver-bright">
              Invoices System
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-silver-dim">
            View, print A4 format, and download official PDF invoices for STH Gadgets orders.
          </p>
        </div>

        <button
          onClick={fetchInvoices}
          disabled={loading}
          type="button"
          className="self-start sm:self-auto inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#080D15] px-4 py-2 text-xs font-bold text-silver-bright hover:border-[#00C4CC] hover:text-[#00C4CC] transition disabled:opacity-50"
        >
          <span>🔄</span>
          <span>Refresh Invoices</span>
        </button>
      </div>

      {/* Stats Summary Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-silver-dim block">
            Total Invoices
          </span>
          <span className="font-display text-xl sm:text-2xl font-black text-silver-bright mt-1 block">
            {stats.totalCount}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-silver-dim block">
            Total Invoiced Value
          </span>
          <span className="font-display text-xl sm:text-2xl font-black text-[#00C4CC] mt-1 block">
            PKR {stats.totalValue.toLocaleString('en-PK')}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-silver-dim block">
            Approved / Active
          </span>
          <span className="font-display text-xl sm:text-2xl font-black text-emerald-400 mt-1 block">
            {stats.approvedCount}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-silver-dim block">
            Pending Orders
          </span>
          <span className="font-display text-xl sm:text-2xl font-black text-amber-400 mt-1 block">
            {stats.pendingCount}
          </span>
        </div>
      </div>

      {/* Controls: Search & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-800 bg-[#080D15] p-1.5">
          {TABS.map((t) => {
            const isActive = selectedTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTab(t.id)}
                type="button"
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  isActive
                    ? 'bg-[#00C4CC] text-black shadow-sm'
                    : 'text-silver-dim hover:text-silver-bright hover:bg-slate-800/60'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice #, customer name, phone..."
            className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] pl-9 pr-4 py-2 text-xs text-silver-bright placeholder:text-silver-dim focus:border-[#00C4CC] focus:outline-none"
          />
          <span className="absolute left-3 top-2.5 text-xs text-silver-dim">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2 text-xs text-silver-dim hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Invoices List / Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-silver-dim gap-2">
          <span className="h-5 w-5 rounded-full border-2 border-[#00C4CC] border-t-transparent animate-spin"></span>
          <span className="text-xs">Loading invoices...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-12 text-center space-y-3">
          <span className="text-4xl block">📄</span>
          <h3 className="font-display text-base font-bold text-silver-bright">No Invoices Found</h3>
          <p className="text-xs text-silver-dim max-w-sm mx-auto">
            {searchQuery
              ? `No invoices match "${searchQuery}"`
              : 'There are no order invoices recorded in this category yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Card List (< md screens) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredOrders.map((order) => {
              const invNo = `INV-${order.order_number ? order.order_number.padStart(4, '0') : order.id.slice(0, 8).toUpperCase()}`;

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-slate-800 bg-[#0C1420] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-black text-[#00C4CC]">{invNo}</span>
                      <span className="block text-[11px] text-silver-dim font-mono">
                        Ref: {order.order_number || order.id.slice(0, 8)}
                      </span>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        order.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : order.status === 'pending'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : order.status === 'shipped' || order.status === 'processing'
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="border-t border-slate-800/80 pt-2 space-y-1 text-xs">
                    <div className="font-bold text-silver-bright">{order.customer_name}</div>
                    <div className="text-silver-dim">{order.phone} • {order.city}</div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[11px] text-silver-dim block">Grand Total</span>
                      <span className="font-mono font-bold text-silver-bright">
                        PKR {Number(order.total_amount).toLocaleString('en-PK')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedInvoiceOrder(order)}
                        className="rounded-xl bg-[#00C4CC] hover:bg-[#00b2b9] px-3 py-1.5 text-xs font-bold text-black shadow-sm transition"
                      >
                        📄 View Invoice
                      </button>

                      <Link
                        href={`/admin/orders/${order.id}/invoice`}
                        target="_blank"
                        className="rounded-xl border border-slate-700 bg-[#080D15] p-1.5 text-silver-dim hover:text-white transition"
                        title="Open full-page printable invoice"
                      >
                        ↗
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= md screens) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-800 bg-[#0C1420] shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-[#080D15] text-[11px] font-bold uppercase tracking-wider text-silver-dim">
                <tr>
                  <th className="px-4 py-3.5">Invoice #</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">City</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Grand Total</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Invoice Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOrders.map((order) => {
                  const invNo = `INV-${order.order_number ? order.order_number.padStart(4, '0') : order.id.slice(0, 8).toUpperCase()}`;

                  return (
                    <tr key={order.id} className="hover:bg-[#00C4CC]/5 transition">
                      <td className="px-4 py-3.5 font-mono">
                        <span className="font-bold text-[#00C4CC]">{invNo}</span>
                        <span className="block text-[10px] text-silver-dim font-mono">
                          Order #{order.order_number || order.id.slice(0, 8)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-silver-bright">{order.customer_name}</div>
                        <div className="text-[11px] text-silver-dim">{order.phone}</div>
                      </td>

                      <td className="px-4 py-3.5 text-silver-bright">{order.city}</td>

                      <td className="px-4 py-3.5 text-silver-dim whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString('en-PK', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      <td className="px-4 py-3.5 font-bold font-mono text-silver-bright">
                        PKR {Number(order.total_amount).toLocaleString('en-PK')}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            order.status === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : order.status === 'pending'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : order.status === 'shipped' || order.status === 'processing'
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedInvoiceOrder(order)}
                            type="button"
                            className="rounded-xl border border-[#00C4CC]/50 bg-[#00C4CC]/10 hover:bg-[#00C4CC]/20 px-3 py-1.5 text-xs font-bold text-[#00C4CC] transition"
                          >
                            📄 View / Print Invoice
                          </button>

                          <Link
                            href={`/admin/orders/${order.id}/invoice`}
                            target="_blank"
                            className="rounded-xl border border-slate-700 bg-[#080D15] p-1.5 text-silver-dim hover:text-white transition"
                            title="Open full page printable invoice in new tab"
                          >
                            ↗
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Standalone Invoice Modal Overlay */}
      {selectedInvoiceOrder && (
        <InvoiceModal
          order={selectedInvoiceOrder}
          onClose={() => setSelectedInvoiceOrder(null)}
        />
      )}
    </div>
  );
}
