'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { Order } from '@/types/database';
import OrderActionModal from '@/components/admin/OrderActionModal';
import { useToast } from '@/context/ToastContext';
import { formatInvoiceDate, formatOrderDateTime, formatNumber } from '@/lib/utils';
import ConfirmModal from '@/components/admin/ConfirmModal';

const TABS = [
  { id: 'all', label: 'All Orders' },
  { id: 'pending', label: 'Pending Approval' },
  { id: 'approved', label: 'Approved' },
  { id: 'processing', label: 'Processing' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled / Rejected' },
];

// In-memory cache for instant module opening without blocking loading spinner
let cachedOrders: Order[] | null = null;

export default function AdminOrdersPage() {
  const { success, error: showErrorToast } = useToast();
  const [orders, setOrders] = useState<Order[]>(cachedOrders || []);
  const [loading, setLoading] = useState(!cachedOrders);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Direct table delete confirmation state
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deletingDirect, setDeletingDirect] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function fetchOrders(showToast = false) {
    if (!cachedOrders) {
      setLoading(true);
    }
    try {
      const res = await fetch('/api/admin/orders');
      const data = await res.json();
      if (data.orders) {
        cachedOrders = data.orders;
        setOrders(data.orders);
        if (showToast) {
          success('Orders list refreshed!');
        }
      }
    } catch {
      showErrorToast('Failed to refresh orders.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders(false);
  }, []);

  // Direct delete action from row/card
  async function confirmDirectDelete() {
    if (!orderToDelete) return;
    setDeletingDirect(true);

    try {
      const res = await fetch(`/api/admin/orders/${orderToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete order');
      }

      setOrders((prev) => {
        const next = prev.filter((o) => o.id !== orderToDelete.id);
        cachedOrders = next;
        return next;
      });
      success(`Order ${orderToDelete.order_number || orderToDelete.id} deleted successfully!`);
      setOrderToDelete(null);
    } catch (err: any) {
      showErrorToast(err.message || 'Error deleting order');
    } finally {
      setDeletingDirect(false);
    }
  }

  async function handleDirectApprove(order: Order, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setActionLoadingId(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve order');
      }
      handleOrderUpdated(data.order);
      success('Order approved successfully.');
    } catch (err: any) {
      showErrorToast(err.message || 'Error approving order');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDirectReject(order: Order, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setActionLoadingId(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reject order');
      }
      handleOrderUpdated(data.order);
      success('Order rejected successfully.');
    } catch (err: any) {
      showErrorToast(err.message || 'Error rejecting order');
    } finally {
      setActionLoadingId(null);
    }
  }

  // Filter orders by tab and search
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Tab filter
      if (selectedTab === 'cancelled') {
        if (o.status !== 'cancelled' && o.status !== 'rejected') return false;
      } else if (selectedTab !== 'all') {
        if (o.status !== selectedTab) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = o.customer_name.toLowerCase().includes(q);
        const matchPhone = o.phone.toLowerCase().includes(q);
        const matchCity = o.city.toLowerCase().includes(q);
        const matchNum = (o.order_number || '').toLowerCase().includes(q);
        return matchName || matchPhone || matchCity || matchNum;
      }

      return true;
    });
  }, [orders, selectedTab, searchQuery]);

  // Counts per status
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const approvedCount = orders.filter((o) => o.status === 'approved').length;
  const totalRevenue = orders
    .filter((o) => o.status === 'approved' || o.status === 'processing' || o.status === 'shipped' || o.status === 'delivered')
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  function handleOrderUpdated(updated: Order) {
    setOrders((prev) => {
      const next = prev.map((o) => (o.id === updated.id ? updated : o));
      cachedOrders = next;
      return next;
    });
    setSelectedOrder(updated);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="font-display text-2xl font-black text-silver-bright sm:text-3xl">
            Orders & Invoices Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-silver-dim">
            Review incoming orders, generate invoices, track payments, print & download digital invoices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/invoices/new"
            className="flex items-center gap-1.5 rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] text-black px-3.5 py-2 text-xs font-black transition shadow-sm hover:scale-105"
          >
            <span>➕</span>
            <span>Create Invoice</span>
          </Link>
          <button
            onClick={() => fetchOrders(true)}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#0C1420] px-3.5 py-2 text-xs font-semibold text-silver-bright hover:border-[#00C4CC] hover:text-[#00C4CC] transition shadow-sm"
          >
            <span className={loading ? 'animate-spin' : ''}>↻</span>
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Module Switcher Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-[#0C1420] p-1.5 rounded-2xl border border-slate-800">
        <Link
          href="/admin/orders"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00C4CC] text-black shadow-sm"
        >
          📦 Orders List
        </Link>
        <Link
          href="/admin/invoices"
          className="px-4 py-2 rounded-xl text-xs font-bold text-silver-dim hover:text-white hover:bg-slate-800 transition"
        >
          📄 Invoices List & Dashboard
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-3.5 sm:p-4">
          <span className="text-xs text-silver-dim">Total Orders</span>
          <div className="mt-1 font-display text-xl sm:text-2xl font-black text-silver-bright">{orders.length}</div>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5 sm:p-4">
          <span className="text-xs text-amber-400 font-semibold">Pending Approval</span>
          <div className="mt-1 font-display text-xl sm:text-2xl font-black text-amber-300">{pendingCount}</div>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 sm:p-4">
          <span className="text-xs text-emerald-400 font-semibold">Approved Orders</span>
          <div className="mt-1 font-display text-xl sm:text-2xl font-black text-emerald-300">{approvedCount}</div>
        </div>

        <div className="rounded-2xl border border-[#00C4CC]/30 bg-[#00C4CC]/5 p-3.5 sm:p-4">
          <span className="text-xs text-[#00C4CC] font-semibold">Approved Revenue</span>
          <div className="mt-1 font-display text-lg sm:text-2xl font-black text-[#00C4CC]">
            PKR {totalRevenue.toLocaleString('en-PK')}
          </div>
        </div>
      </div>

      {/* Controls: Tabs & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Scrollable Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {TABS.map((tab) => {
            const isSelected = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`shrink-0 rounded-xl px-3 sm:px-3.5 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-[#00C4CC] text-black font-bold shadow-sm'
                    : 'border border-slate-800 bg-[#0C1420] text-silver-dim hover:text-silver-bright hover:border-slate-700'
                }`}
              >
                {tab.label}
                {tab.id === 'pending' && pendingCount > 0 && (
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    isSelected ? 'bg-black text-[#00C4CC]' : 'bg-amber-500 text-black'
                  }`}>
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer, phone, STH #..."
            className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3.5 py-2 text-xs text-silver-bright placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none"
          />
        </div>
      </div>

      {/* Orders List / Table Container */}
      <div className="rounded-2xl border border-slate-800 bg-[#0C1420] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-silver-dim flex flex-col items-center justify-center gap-2">
            <span className="h-5 w-5 rounded-full border-2 border-[#00C4CC] border-t-transparent animate-spin"></span>
            <span>Loading orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center text-xs text-silver-dim">
            No orders found matching the selected filters.
          </div>
        ) : (
          <>
            {/* Mobile Cards View (< md screens) */}
            <div className="divide-y divide-slate-800/80 md:hidden">
              {filteredOrders.map((order) => {
                const itemsCount = (order.order_items || []).reduce((sum, i) => sum + i.quantity, 0);

                return (
                  <div
                    key={order.id}
                    className="p-4 space-y-3 hover:bg-[#00C4CC]/5 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {order.order_number ? (
                          <span className="font-mono font-bold text-xs text-[#00C4CC] bg-[#00C4CC]/10 border border-[#00C4CC]/30 rounded-md px-2 py-0.5">
                            {order.order_number}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md px-2 py-0.5 font-bold">
                            Pending Official #
                          </span>
                        )}
                        <h4 className="mt-1 font-semibold text-silver-bright text-sm">
                          {order.customer_name}
                        </h4>
                        <span className="text-xs text-silver-dim">{order.phone} • {order.city}</span>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
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

                    <div className="flex items-center justify-between text-xs text-silver-dim pt-1 border-t border-slate-800/60">
                      <div>
                        <span className="text-silver-bright font-semibold font-mono">
                          PKR {formatNumber(order.total_amount)}
                        </span>
                        <span className="ml-1.5 text-[11px]">
                          ({itemsCount} item{itemsCount > 1 ? 's' : ''})
                        </span>
                      </div>
                      {(() => {
                        const dt = formatOrderDateTime(order.created_at);
                        return (
                          <div className="text-right" suppressHydrationWarning>
                            <span className="text-[11px] text-silver-bright font-medium">{dt.date}</span>
                            <span className="ml-1.5 text-[10px] font-mono text-[#00C4CC]">🕒 {dt.time}</span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Mobile Card Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="flex-1 rounded-xl bg-[#00C4CC] hover:bg-[#00b2b9] py-2 text-xs font-bold text-black text-center transition"
                      >
                        Manage
                      </button>

                      <button
                        type="button"
                        onClick={() => setOrderToDelete(order)}
                        className="rounded-xl border border-rose-900/80 bg-rose-950/30 hover:bg-rose-900/50 px-3 py-2 text-xs font-semibold text-rose-300 transition"
                        title="Delete order"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= md screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-[#080D15] text-[11px] font-bold uppercase tracking-wider text-silver-dim">
                  <tr>
                    <th className="px-4 py-3">Official Order #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Total Amount</th>
                    <th className="px-4 py-3">Order Date & Time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredOrders.map((order) => {
                    const itemsCount = (order.order_items || []).reduce((sum, i) => sum + i.quantity, 0);

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-[#00C4CC]/5 transition cursor-pointer"
                        onClick={() => setSelectedOrder(order)}
                      >
                        {/* Order Number */}
                        <td className="px-4 py-3.5 font-mono">
                          {order.order_number ? (
                            <span className="font-bold text-[#00C4CC]">{order.order_number}</span>
                          ) : (
                            <span className="text-amber-400/80 italic">Pending</span>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-silver-bright">{order.customer_name}</div>
                          <div className="text-[11px] text-silver-dim">{order.phone}</div>
                        </td>

                        {/* City */}
                        <td className="px-4 py-3.5 text-silver-bright">{order.city}</td>

                        {/* Items */}
                        <td className="px-4 py-3.5 text-silver-dim">
                          {itemsCount} item{itemsCount > 1 ? 's' : ''}
                        </td>

                        {/* Total */}
                        <td className="px-4 py-3.5 font-bold font-mono text-silver-bright" suppressHydrationWarning>
                          PKR {formatNumber(order.total_amount)}
                        </td>

                        {/* Date & Time */}
                        <td className="px-4 py-3.5 whitespace-nowrap" suppressHydrationWarning>
                          {(() => {
                            const dt = formatOrderDateTime(order.created_at);
                            return (
                              <div>
                                <div className="font-semibold text-silver-bright">{dt.date}</div>
                                <div className="text-[11px] font-mono text-[#00C4CC] flex items-center gap-1">
                                  <span>🕒</span>
                                  <span>{dt.time}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Status */}
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

                        {/* Actions (Approve / Reject / Manage / Delete) */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {order.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  disabled={actionLoadingId === order.id}
                                  onClick={(e) => handleDirectApprove(order, e)}
                                  className="rounded-lg bg-[#25D366] hover:bg-[#20BD5A] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition disabled:opacity-50"
                                  title="Approve Order & Assign STH #"
                                >
                                  {actionLoadingId === order.id ? '...' : '✓ APPROVE'}
                                </button>
                                <button
                                  type="button"
                                  disabled={actionLoadingId === order.id}
                                  onClick={(e) => handleDirectReject(order, e)}
                                  className="rounded-lg border border-rose-800 bg-rose-950/40 hover:bg-rose-900/60 px-2 py-1 text-[11px] font-semibold text-rose-300 transition disabled:opacity-50"
                                  title="Reject Order"
                                >
                                  REJECT
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                              }}
                              className="rounded-lg border border-slate-700 bg-[#080D15] px-2.5 py-1 text-xs font-semibold text-silver-bright hover:border-[#00C4CC] hover:text-[#00C4CC] transition"
                            >
                              Manage
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrderToDelete(order);
                              }}
                              className="rounded-lg border border-rose-900/60 bg-rose-950/20 px-2 py-1 text-xs font-semibold text-rose-400 hover:border-rose-600 hover:bg-rose-900/40 hover:text-rose-300 transition"
                              title="Delete this order"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Direct Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!orderToDelete}
        onClose={() => setOrderToDelete(null)}
        onConfirm={confirmDirectDelete}
        title="Delete Order Permanently"
        description={`Are you sure you want to delete the order for "${orderToDelete?.customer_name}" (Ref: ${orderToDelete?.order_number || orderToDelete?.id}) amounting to PKR ${Number(orderToDelete?.total_amount || 0).toLocaleString('en-PK')}? This action cannot be undone.`}
        confirmText="Yes, Delete Order"
        isDeleting={deletingDirect}
      />

      {/* Action / Detail Modal */}
      {selectedOrder && (
        <OrderActionModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onOrderUpdated={handleOrderUpdated}
          onOrderDeleted={(deletedId) => {
            setOrders((prev) => {
              const next = prev.filter((o) => o.id !== deletedId);
              cachedOrders = next;
              return next;
            });
            setSelectedOrder(null);
          }}
        />
      )}

    </div>
  );
}
