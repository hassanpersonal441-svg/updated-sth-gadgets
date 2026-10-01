'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { Order, OrderStatus } from '@/types/database';
import OrderActionModal from '@/components/admin/OrderActionModal';
import CreateOrderModal from '@/components/admin/CreateOrderModal';
import ShippingSlipModal from '@/components/admin/ShippingSlipModal';
import { useToast } from '@/context/ToastContext';
import { formatInvoiceDate, formatOrderDateTime, formatNumber } from '@/lib/utils';
import ConfirmModal from '@/components/admin/ConfirmModal';

const TABS = [
  { id: 'all', label: 'All Orders' },
  { id: 'pending', label: 'Pending Approval' },
  { id: 'pending_payment', label: 'Pending Payment' },
  { id: 'approved', label: 'Approved' },
  { id: 'processing', label: 'Processing' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled / Rejected' },
];

// Helper to extract image from order item
function getOrderItemImage(item: any): string | null {
  if (item.product_image && typeof item.product_image === 'string') return item.product_image;
  if (item.product?.image_url && typeof item.product.image_url === 'string') return item.product.image_url;
  if (Array.isArray(item.product?.product_images) && item.product.product_images.length > 0) {
    const primary = item.product.product_images.find((pi: any) => pi?.is_primary);
    return primary?.image_url || item.product.product_images[0]?.image_url || null;
  }
  return null;
}

// Helper to render consistent, clean status badges
function renderStatusBadge(status: OrderStatus | string) {
  switch (status) {
    case 'delivered':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          DELIVERED
        </span>
      );
    case 'shipped':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
          SHIPPED
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
          PROCESSING
        </span>
      );
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-teal-500/10 text-teal-400 border border-teal-500/30 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
          APPROVED
        </span>
      );
    case 'pending_payment':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-purple-500/10 text-purple-400 border border-purple-500/30 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
          PAYMENT PENDING
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          PENDING
        </span>
      );
    case 'cancelled':
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          CANCELLED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-slate-500/10 text-slate-300 border border-slate-700 shadow-sm">
          {status}
        </span>
      );
  }
}

// Helper to render source badges
function renderSourceBadge(source: string | null | undefined) {
  if (source === 'whatsapp') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm">
        <svg className="w-3 h-3 fill-current shrink-0" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.299.144.347.491 1.2.534 1.288.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.144.39-.086s1.011.477 1.184.564c.173.086.289.13.332.202.043.072.043.419-.101.824z"/>
        </svg>
        <span>WhatsApp</span>
      </span>
    );
  }
  if (source === 'web') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-sm">
        <svg className="w-3 h-3 fill-none stroke-current shrink-0" viewBox="0 0 24 24" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
        <span>Website</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400/90 border border-amber-500/30 shadow-sm">
      <svg className="w-3 h-3 fill-none stroke-current shrink-0" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <span>Direct</span>
    </span>
  );
}

// In-memory cache for instant module opening without blocking loading spinner
let cachedOrders: Order[] | null = null;

export default function AdminOrdersPage() {
  const { success, error: showErrorToast, admin } = useToast();
  const [orders, setOrders] = useState<Order[]>(cachedOrders || []);
  const [loading, setLoading] = useState(!cachedOrders);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderSourceFilter, setOrderSourceFilter] = useState<'all' | 'web' | 'whatsapp' | 'random'>('all');

  // Multi-Selection State for Bulk Actions & 2-per-page A4 Slips
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [slipOrdersToPrint, setSlipOrdersToPrint] = useState<Order[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Direct table delete confirmation state
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deletingDirect, setDeletingDirect] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Create Order Modal state
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);

  async function fetchOrders(showToast = false) {
    if (!cachedOrders || cachedOrders.length === 0) {
      setLoading(true);
    }
    setFetchError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch('/api/admin/orders', {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (res.ok && data.orders) {
        cachedOrders = data.orders;
        setOrders(data.orders);
        if (showToast) {
          admin('Orders list refreshed!', 'Orders Updated');
        }
      } else {
        throw new Error(data.error || 'Failed to load orders');
      }
    } catch (err: any) {
      const errorMsg = err.name === 'AbortError' ? 'Orders load timed out' : (err.message || 'Failed to refresh orders');
      setFetchError(errorMsg);
      if (showToast) {
        showErrorToast(errorMsg);
      }
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
    if (orderToDelete.status === 'delivered') {
      showErrorToast('Delivered orders cannot be deleted');
      setOrderToDelete(null);
      return;
    }
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
      setSelectedOrderIds((prev) => prev.filter((id) => id !== orderToDelete.id));
      admin(`Order ${orderToDelete.order_number || orderToDelete.id} deleted successfully!`, 'Order Deleted');
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
      admin('Order approved successfully.', 'Order Approved');
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
      admin('Order rejected successfully.', 'Order Rejected');
    } catch (err: any) {
      showErrorToast(err.message || 'Error rejecting order');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCreateInvoice(order: Order, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setActionLoadingId(`invoice-${order.id}`);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/invoice`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.invoiceUrl) {
        window.open(data.invoiceUrl, '_blank');
        admin(
          data.isExisting
            ? `Invoice ${data.invoice_number} opened in new tab.`
            : `Invoice ${data.invoice_number} generated successfully!`,
          'Invoice Ready'
        );
      } else {
        window.open(`/invoice/${order.order_number || order.id}`, '_blank');
      }
    } catch {
      window.open(`/invoice/${order.order_number || order.id}`, '_blank');
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

      // Order source filter
      if (orderSourceFilter !== 'all') {
        if (o.order_source !== orderSourceFilter) return false;
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
  }, [orders, selectedTab, searchQuery, orderSourceFilter]);

  // Counts per status
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const pendingPaymentCount = orders.filter((o) => o.status === 'pending_payment').length;
  const approvedCount = orders.filter((o) => o.status === 'approved').length;
  const totalRevenue = orders
    .filter((o) => o.status === 'approved' || o.status === 'pending_payment' || o.status === 'processing' || o.status === 'shipped' || o.status === 'delivered')
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  // Revenue by source
  const webRevenue = orders
    .filter((o) => o.order_source === 'web' && (o.status === 'approved' || o.status === 'pending_payment' || o.status === 'processing' || o.status === 'shipped' || o.status === 'delivered'))
    .reduce((sum, o) => sum + Number(o.total_amount), 0);
  const whatsappRevenue = orders
    .filter((o) => o.order_source === 'whatsapp' && (o.status === 'approved' || o.status === 'pending_payment' || o.status === 'processing' || o.status === 'shipped' || o.status === 'delivered'))
    .reduce((sum, o) => sum + Number(o.total_amount), 0);
  const randomRevenue = orders
    .filter((o) => o.order_source === 'random' && (o.status === 'approved' || o.status === 'pending_payment' || o.status === 'processing' || o.status === 'shipped' || o.status === 'delivered'))
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  function handleOrderUpdated(updated: Order) {
    setOrders((prev) => {
      const next = prev.map((o) => (o.id === updated.id ? updated : o));
      cachedOrders = next;
      return next;
    });
    setSelectedOrder(updated);
  }

  // Multi-Selection Logic
  const allFilteredSelected = filteredOrders.length > 0 && filteredOrders.every((o) => selectedOrderIds.includes(o.id));
  const someFilteredSelected = filteredOrders.some((o) => selectedOrderIds.includes(o.id)) && !allFilteredSelected;

  function toggleSelectOrder(orderId: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  }

  function handleSelectAllFiltered() {
    if (allFilteredSelected) {
      const filteredIdSet = new Set(filteredOrders.map((o) => o.id));
      setSelectedOrderIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const combined = Array.from(new Set([...selectedOrderIds, ...filteredOrders.map((o) => o.id)]));
      setSelectedOrderIds(combined);
    }
  }

  function handleClearSelection() {
    setSelectedOrderIds([]);
  }

  function handleOpenBulkSlips() {
    const selectedOrdersList = orders.filter((o) => selectedOrderIds.includes(o.id));
    if (selectedOrdersList.length === 0) {
      showErrorToast('Please select at least 1 order to print slips.');
      return;
    }
    const printableOrders = selectedOrdersList.filter(
      (o) => o.status !== 'shipped' && o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'rejected'
    );
    if (printableOrders.length === 0) {
      showErrorToast('All selected orders are already shipped/delivered or cancelled. Slip printing is disabled.');
      return;
    }
    if (printableOrders.length < selectedOrdersList.length) {
      success(`Selected ${printableOrders.length} active order(s). Already shipped orders were excluded.`);
    }
    setSlipOrdersToPrint(printableOrders);
  }

  function handleOpenSingleSlip(order: Order, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (order.status === 'shipped' || order.status === 'delivered' || order.status === 'cancelled' || order.status === 'rejected') {
      showErrorToast(`Shipping slip is disabled for ${order.status} orders.`);
      return;
    }
    setSlipOrdersToPrint([order]);
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="font-display text-2xl font-black text-silver-bright sm:text-3xl">
            Orders Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-silver-dim">
            Review incoming orders, process shipments, print 2-per-page A4 slips, and manage customer orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Bulk Print Button if orders are selected */}
          {selectedOrderIds.length > 0 && (
            <button
              onClick={handleOpenBulkSlips}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-black px-4 py-2 text-xs font-black transition shadow-[0_0_20px_rgba(14,165,233,0.35)] hover:scale-105"
            >
              <span>🖨️</span>
              <span>Print Slips ({selectedOrderIds.length} Selected · 2 Per Page)</span>
            </button>
          )}

          <button
            onClick={() => setShowCreateOrderModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] text-black px-3.5 py-2 text-xs font-black transition shadow-sm hover:scale-105"
          >
            <span>➕</span>
            <span>Create Order</span>
          </button>
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

        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-3.5 sm:p-4">
          <span className="text-xs text-violet-400 font-semibold">Pending Payment</span>
          <div className="mt-1 font-display text-xl sm:text-2xl font-black text-violet-300">{pendingPaymentCount}</div>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 sm:p-4">
          <span className="text-xs text-emerald-400 font-semibold">Approved Orders</span>
          <div className="mt-1 font-display text-xl sm:text-2xl font-black text-emerald-300">{approvedCount}</div>
        </div>

        <div className="rounded-2xl border border-[#00C4CC]/30 bg-[#00C4CC]/5 p-3.5 sm:p-4">
          <span className="text-xs text-[#00C4CC] font-semibold">Total Revenue</span>
          <div className="mt-1 font-display text-lg sm:text-2xl font-black text-[#00C4CC]">
            PKR {totalRevenue.toLocaleString('en-PK')}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-3.5 sm:p-4">
          <span className="text-xs text-blue-400 font-semibold">🌐 Website Revenue</span>
          <div className="mt-1 font-display text-lg sm:text-2xl font-black text-blue-300">
            PKR {webRevenue.toLocaleString('en-PK')}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 sm:p-4">
          <span className="text-xs text-emerald-400 font-semibold">📱 WhatsApp Revenue</span>
          <div className="mt-1 font-display text-lg sm:text-2xl font-black text-emerald-300">
            PKR {whatsappRevenue.toLocaleString('en-PK')}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5 sm:p-4">
          <span className="text-xs text-amber-400 font-semibold">🎲 Random Revenue</span>
          <div className="mt-1 font-display text-lg sm:text-2xl font-black text-amber-300">
            PKR {randomRevenue.toLocaleString('en-PK')}
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
                {tab.id === 'pending_payment' && pendingPaymentCount > 0 && (
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    isSelected ? 'bg-black text-[#00C4CC]' : 'bg-violet-500 text-black'
                  }`}>
                    {pendingPaymentCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={orderSourceFilter}
            onChange={(e) => setOrderSourceFilter(e.target.value as 'all' | 'web' | 'whatsapp' | 'random')}
            className="rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-xs font-semibold text-silver-bright focus:border-[#00C4CC] focus:outline-none"
          >
            <option value="all">All Sources</option>
            <option value="web">🌐 Website</option>
            <option value="whatsapp">📱 WhatsApp</option>
            <option value="random">🎲 Random/Other</option>
          </select>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer, phone, STH #..."
            className="w-full sm:w-72 rounded-xl border border-slate-800 bg-[#080D15] px-3.5 py-2 text-xs text-silver-bright placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none"
          >
          </input>
        </div>
      </div>

      {/* Orders List / Table Container */}
      <div className="rounded-2xl border border-slate-800 bg-[#0C1420] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-silver-dim flex flex-col items-center justify-center gap-2">
            <span className="h-6 w-6 rounded-full border-2 border-[#00C4CC] border-t-transparent animate-spin"></span>
            <span className="font-semibold text-slate-300">Loading orders...</span>
          </div>
        ) : fetchError ? (
          <div className="py-16 text-center text-xs text-silver-dim flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-lg">
              ⚠️
            </div>
            <div className="text-slate-300 font-semibold">{fetchError}</div>
            <button
              type="button"
              onClick={() => fetchOrders(true)}
              className="rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] text-black px-4 py-2 font-bold transition shadow-sm"
            >
              ↻ Try Again
            </button>
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
                const itemsCount = (order.order_items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);
                const isSelected = selectedOrderIds.includes(order.id);

                return (
                  <div
                    key={order.id}
                    className={`p-4 space-y-3 transition ${isSelected ? 'bg-sky-950/20 border-l-4 border-l-sky-400' : 'hover:bg-[#00C4CC]/5'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div
                          className="pt-0.5 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectOrder(order.id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0 cursor-pointer pointer-events-none"
                          />
                        </div>
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
                          <div className="mt-1">
                            {renderSourceBadge(order.order_source)}
                          </div>
                        </div>
                      </div>

                      {renderStatusBadge(order.status)}
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
                      {(() => {
                        const isSlipDisabled = order.status === 'shipped' || order.status === 'delivered' || order.status === 'cancelled' || order.status === 'rejected';
                        return (
                          <button
                            type="button"
                            disabled={isSlipDisabled}
                            onClick={(e) => {
                              if (isSlipDisabled) return;
                              handleOpenSingleSlip(order, e);
                            }}
                            className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                              isSlipDisabled
                                ? 'border-slate-800 bg-slate-900/40 text-slate-600 opacity-40 cursor-not-allowed'
                                : 'border-sky-600/60 bg-sky-950/40 hover:bg-sky-900/60 text-sky-300'
                            }`}
                            title={isSlipDisabled ? `Shipping slip disabled (Order is ${order.status})` : 'Print Courier Shipping Slip'}
                          >
                            🖨️ Slip
                          </button>
                        );
                      })()}

                      <button
                        type="button"
                        disabled={actionLoadingId === `invoice-${order.id}`}
                        onClick={(e) => handleCreateInvoice(order, e)}
                        className="rounded-xl border border-[#00C4CC] bg-[#00C4CC]/10 hover:bg-[#00C4CC]/20 px-3 py-2 text-xs font-semibold text-[#00C4CC] transition disabled:opacity-50"
                        title="Create/View Official Invoice"
                      >
                        {actionLoadingId === `invoice-${order.id}` ? '...' : '📄'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="flex-1 rounded-xl bg-[#00C4CC] hover:bg-[#00b2b9] py-2 text-xs font-bold text-black text-center transition"
                      >
                        Manage
                      </button>

                      {order.status !== 'delivered' && (
                        <button
                          type="button"
                          onClick={() => setOrderToDelete(order)}
                          className="rounded-xl border border-rose-900/80 bg-rose-950/30 hover:bg-rose-900/50 px-3 py-2 text-xs font-semibold text-rose-300 transition"
                          title="Delete order"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= md screens) */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-800/80 bg-[#09111E] shadow-2xl">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-[#070D18] text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="w-10 px-3 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someFilteredSelected;
                        }}
                        onChange={handleSelectAllFiltered}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0 cursor-pointer"
                        title="Select All"
                      />
                    </th>
                    <th className="px-4 py-3.5">Order #</th>
                    <th className="px-4 py-3.5">Customer</th>
                    <th className="px-4 py-3.5">City</th>
                    <th className="px-4 py-3.5">Source</th>
                    <th className="px-4 py-3.5">Items</th>
                    <th className="px-4 py-3.5">Total Amount</th>
                    <th className="px-4 py-3.5">Date & Time</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredOrders.map((order) => {
                    const itemsCount = (order.order_items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);
                    const firstItem = order.order_items?.[0];
                    const itemImg = firstItem ? getOrderItemImage(firstItem) : null;
                    const isSelected = selectedOrderIds.includes(order.id);

                    return (
                      <tr
                        key={order.id}
                        className={`transition-colors cursor-pointer group ${
                          isSelected ? 'bg-sky-950/30 hover:bg-sky-950/40' : 'hover:bg-[#0E1A2C]'
                        }`}
                        onClick={() => setSelectedOrder(order)}
                      >
                        {/* Checkbox */}
                        <td
                          className="w-10 px-3 py-3.5 text-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectOrder(order.id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0 cursor-pointer pointer-events-none"
                          />
                        </td>

                        {/* Order Number */}
                        <td className="px-4 py-3.5 font-mono whitespace-nowrap">
                          {order.order_number ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-[#00C4CC]/10 px-2.5 py-1 text-xs font-bold text-[#00C4CC] border border-[#00C4CC]/25 group-hover:border-[#00C4CC]/50 transition-colors shadow-sm">
                              {order.order_number}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/25">
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00C4CC]/20 to-blue-600/20 border border-[#00C4CC]/30 flex items-center justify-center text-[#00C4CC] font-bold text-xs shrink-0 shadow-sm">
                              {order.customer_name
                                ? order.customer_name
                                    .split(' ')
                                    .filter(Boolean)
                                    .map((n) => n[0])
                                    .slice(0, 2)
                                    .join('')
                                    .toUpperCase()
                                : '?'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-white text-xs group-hover:text-[#00C4CC] transition-colors truncate">
                                {order.customer_name}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                                <span>{order.phone}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* City */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-medium text-slate-200">
                            <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="capitalize">{order.city || 'N/A'}</span>
                          </div>
                        </td>

                        {/* Source */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {renderSourceBadge(order.order_source)}
                        </td>

                        {/* Items */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            {itemImg ? (
                              <img
                                src={itemImg}
                                alt={firstItem?.product_name || 'Product'}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-700/80 bg-[#06101D] shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center justify-center text-xs shrink-0 text-slate-400">
                                📦
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                                <span>{itemsCount} {itemsCount === 1 ? 'item' : 'items'}</span>
                              </div>
                              {order.order_items && order.order_items.length > 0 && (
                                <div
                                  className="text-[11px] text-slate-400 truncate max-w-[190px]"
                                  title={order.order_items.map((it) => it.product_name).join(', ')}
                                >
                                  {order.order_items[0].product_name}
                                  {order.order_items.length > 1 && (
                                    <span className="text-[#00C4CC] font-semibold ml-1">
                                      +{order.order_items.length - 1} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Total */}
                        <td className="px-4 py-3.5 whitespace-nowrap" suppressHydrationWarning>
                          <div className="font-mono font-bold text-white text-xs sm:text-sm">
                            PKR {formatNumber(order.total_amount)}
                          </div>
                          <div className="text-[10px] mt-0.5 font-medium">
                            {order.payment_status === 'paid' ? (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                Paid ({order.payment_method || 'Online'})
                              </span>
                            ) : (
                              <span className="text-amber-400/90 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                COD (Unpaid)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Date & Time */}
                        <td className="px-4 py-3.5 whitespace-nowrap" suppressHydrationWarning>
                          {(() => {
                            const dt = formatOrderDateTime(order.created_at);
                            return (
                              <div>
                                <div className="font-semibold text-silver-bright">{dt.date}</div>
                                <div className="text-[11px] font-mono text-[#00C4CC] flex items-center gap-1 mt-0.5">
                                  <span>🕒</span>
                                  <span>{dt.time}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {renderStatusBadge(order.status)}
                        </td>

                        {/* Actions (Print Slip / Approve / Reject / Manage / Delete) */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {/* Direct Shipping Slip Print Button */}
                            {(() => {
                              const isSlipDisabled = order.status === 'shipped' || order.status === 'delivered' || order.status === 'cancelled' || order.status === 'rejected';
                              return (
                                <button
                                  type="button"
                                  disabled={isSlipDisabled}
                                  onClick={(e) => {
                                    if (isSlipDisabled) return;
                                    handleOpenSingleSlip(order, e);
                                  }}
                                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition flex items-center gap-1 shadow-sm ${
                                    isSlipDisabled
                                      ? 'border-slate-800 bg-slate-900/40 text-slate-600 opacity-40 cursor-not-allowed'
                                      : 'border-sky-600/40 bg-sky-950/40 hover:bg-sky-500 hover:text-white text-sky-300'
                                  }`}
                                  title={isSlipDisabled ? `Shipping slip disabled (Order is ${order.status})` : 'Print Shipping Slip (Upper/Lower or 6x4)'}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 6 2 18 2 18 9" />
                                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                    <rect x="6" y="14" width="12" height="8" />
                                  </svg>
                                  <span>Slip</span>
                                </button>
                              );
                            })()}

                            {(order.status === 'pending' || order.status === 'pending_payment') && (
                              <>
                                <button
                                  type="button"
                                  disabled={actionLoadingId === order.id}
                                  onClick={(e) => handleDirectApprove(order, e)}
                                  className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition disabled:opacity-50 flex items-center gap-1"
                                  title="Approve Order & Assign STH #"
                                >
                                  {actionLoadingId === order.id ? (
                                    '...'
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span>Approve</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={actionLoadingId === order.id}
                                  onClick={(e) => handleDirectReject(order, e)}
                                  className="rounded-lg border border-rose-800 bg-rose-950/40 hover:bg-rose-900/60 px-2 py-1.5 text-[11px] font-semibold text-rose-300 transition disabled:opacity-50"
                                  title="Reject Order"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              disabled={actionLoadingId === `invoice-${order.id}`}
                              onClick={(e) => handleCreateInvoice(order, e)}
                              className="rounded-lg border border-[#00C4CC]/40 bg-[#00C4CC]/10 hover:bg-[#00C4CC] hover:text-black px-2.5 py-1.5 text-[11px] font-semibold text-[#00C4CC] transition disabled:opacity-50 flex items-center gap-1 shadow-sm"
                              title="Create / View Official Invoice"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>Invoice</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className="rounded-lg border border-slate-700 bg-[#0E1726] hover:bg-[#142238] hover:border-[#00C4CC]/60 px-3 py-1.5 text-xs font-semibold text-silver-bright hover:text-[#00C4CC] transition flex items-center gap-1 shadow-sm"
                            >
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span>Manage</span>
                            </button>

                            {order.status !== 'delivered' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOrderToDelete(order);
                                }}
                                className="rounded-lg border border-rose-900/60 bg-rose-950/20 px-2 py-1.5 text-xs font-semibold text-rose-400 hover:border-rose-600 hover:bg-rose-900/40 hover:text-rose-300 transition"
                                title="Delete this order"
                              >
                                🗑️
                              </button>
                            )}
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

      {/* Floating Sticky Bulk Selection Bar */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-sky-500/40 bg-[#081322]/95 backdrop-blur-xl px-5 py-3 shadow-[0_10px_35px_rgba(0,0,0,0.6)] text-white animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-xs font-black text-black">
              {selectedOrderIds.length}
            </span>
            <span className="text-xs font-bold text-slate-200">
              Orders Selected
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={handleOpenBulkSlips}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-black px-4 py-2 text-xs font-black transition shadow-[0_0_15px_rgba(14,165,233,0.4)] hover:scale-105"
          >
            <span>🖨️</span>
            <span>Print Joint Slips (2 Per A4 Page)</span>
          </button>

          <button
            type="button"
            onClick={handleClearSelection}
            className="rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            Clear Selection
          </button>
        </div>
      )}

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

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={showCreateOrderModal}
        onClose={() => setShowCreateOrderModal(false)}
        onOrderCreated={() => fetchOrders(true)}
      />

      {/* Shipping Slips Modal (Single or Multi / 2 per page A4) */}
      {slipOrdersToPrint && (
        <ShippingSlipModal
          orders={slipOrdersToPrint}
          allOrders={orders}
          onClose={() => setSlipOrdersToPrint(null)}
        />
      )}

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
