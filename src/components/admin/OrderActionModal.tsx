'use client';

import React, { useState, useEffect } from 'react';
import type { Order } from '@/types/database';
import { useToast } from '@/context/ToastContext';
import InvoiceModal from '@/components/admin/InvoiceModal';

interface OrderActionModalProps {
  order: Order | null;
  onClose: () => void;
  onOrderUpdated: (updatedOrder: Order) => void;
  onOrderDeleted?: (orderId: string) => void;
}

export default function OrderActionModal({
  order,
  onClose,
  onOrderUpdated,
  onOrderDeleted,
}: OrderActionModalProps) {
  const { success, error: showErrorToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState(order?.admin_notes || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmationUrl, setConfirmationUrl] = useState<string | null>(null);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(order?.customer_name || '');
  const [editPhone, setEditPhone] = useState(order?.phone || '');
  const [editCity, setEditCity] = useState(order?.city || '');
  const [editAddress, setEditAddress] = useState(order?.address || '');
  const [editOrderNumber, setEditOrderNumber] = useState(order?.order_number || '');

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Invoice Modal State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    if (order) {
      setNotes(order.admin_notes || '');
      setEditName(order.customer_name || '');
      setEditPhone(order.phone || '');
      setEditCity(order.city || '');
      setEditAddress(order.address || '');
      setEditOrderNumber(order.order_number || '');
      setIsEditing(false);
      setShowDeleteConfirm(false);
      setErrorMsg('');
      setConfirmationUrl(null);
    }
  }, [order?.id]);

  if (!order) return null;

  async function handleApprove() {
    if (!order) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: notes }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve order');
      }

      onOrderUpdated(data.order);
      setConfirmationUrl(data.confirmationWhatsAppUrl);
      success('Order approved successfully.');
    } catch (err: any) {
      const msg = err.message || 'Error approving order';
      setErrorMsg(msg);
      showErrorToast(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!order) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: notes }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reject order');
      }

      onOrderUpdated(data.order);
      success('Order rejected successfully.');
    } catch (err: any) {
      const msg = err.message || 'Error rejecting order';
      setErrorMsg(msg);
      showErrorToast(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleRetryNotification(target: 'admin' | 'customer') {
    if (!order) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/retry-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to send ${target} WhatsApp notification`);
      }
      onOrderUpdated(data.order);
      success(data.message || `${target.toUpperCase()} WhatsApp notification sent successfully!`);
    } catch (err: any) {
      showErrorToast(err.message || 'Error sending notification');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(newStatus: string) {
    if (!order) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, admin_notes: notes }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to update status to ${newStatus}`);
      }

      onOrderUpdated(data.order);
      success(`Order status updated to ${newStatus.toUpperCase()}!`);
    } catch (err: any) {
      const msg = err.message || 'Error updating order status';
      setErrorMsg(msg);
      showErrorToast(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!order) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: editName.trim(),
          phone: editPhone.trim(),
          city: editCity.trim(),
          address: editAddress.trim(),
          order_number: editOrderNumber.trim() ? editOrderNumber.trim() : null,
          admin_notes: notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update order');
      }

      onOrderUpdated(data.order);
      setIsEditing(false);
      success('Order details updated successfully!');
    } catch (err: any) {
      const msg = err.message || 'Error updating order';
      setErrorMsg(msg);
      showErrorToast(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!order) return;
    setDeleting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete order');
      }

      success(`Order ${order.order_number || order.id} deleted successfully!`);
      if (onOrderDeleted) {
        onOrderDeleted(order.id);
      }
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Error deleting order';
      setErrorMsg(msg);
      showErrorToast(msg);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const isPending = order.status === 'pending';
  const isApproved = order.status === 'approved';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-slate-800 bg-[#0C1420] text-[#C9D2DB] p-4 sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-base sm:text-lg font-black text-silver-bright">
                Order Details
              </h2>
              {order.order_number ? (
                <span className="rounded-lg bg-[#00C4CC]/20 border border-[#00C4CC]/40 px-2.5 py-0.5 font-mono text-xs font-black text-[#00C4CC]">
                  {order.order_number}
                </span>
              ) : (
                <span className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                  Pending Official Number
                </span>
              )}

              {/* Edit Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    // Cancel: revert fields
                    setEditName(order.customer_name);
                    setEditPhone(order.phone);
                    setEditCity(order.city);
                    setEditAddress(order.address);
                    setEditOrderNumber(order.order_number || '');
                  }
                  setIsEditing(!isEditing);
                }}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                  isEditing
                    ? 'border-[#00C4CC] bg-[#00C4CC]/15 text-[#00C4CC]'
                    : 'border-slate-700 bg-[#080D15] text-silver-dim hover:text-silver-bright hover:border-slate-600'
                }`}
              >
                {isEditing ? '✕ Cancel Edit' : '✏️ Edit Details'}
              </button>

              {/* View / Print Invoice Button */}
              <button
                type="button"
                onClick={() => setShowInvoiceModal(true)}
                className="rounded-lg border border-[#00C4CC]/50 bg-[#00C4CC]/10 hover:bg-[#00C4CC]/20 text-[#00C4CC] px-2.5 py-1 text-xs font-semibold transition"
              >
                📄 View / Print Invoice
              </button>
            </div>
            <p className="mt-1 text-[11px] sm:text-xs text-silver-dim truncate max-w-xs sm:max-w-md">
              Ref ID: <span className="font-mono text-silver-bright">{order.id}</span> • {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg border border-slate-800 p-1.5 text-silver-dim hover:text-white transition"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
            {errorMsg}
          </div>
        )}

        {/* Confirmation banner if just approved */}
        {confirmationUrl && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <span>✓</span>
              <span>Order Approved! Assigned Official Number: {order.order_number}</span>
            </div>
            <p className="text-xs text-silver-dim">
              Send the official confirmation message with order details to the customer's WhatsApp:
            </p>
            <a
              href={confirmationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] px-4 py-2 text-xs font-bold text-white shadow-sm transition"
            >
              <svg viewBox="0 0 32 32" className="h-4 w-4 fill-white">
                <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.34.687 4.52 1.872 6.35L4 29l7.86-1.83A11.94 11.94 0 0016 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3z" />
              </svg>
              <span>Send Confirmation on WhatsApp</span>
            </a>
          </div>
        )}

        {/* Content Body */}
        <div className="mt-5 space-y-5 text-xs sm:text-sm">
          {/* Customer Info Card (View vs Edit Mode) */}
          <div className="rounded-xl border border-slate-800/80 bg-[#080D15] p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#00C4CC]">
                Customer Information {isEditing && '(Editing Mode)'}
              </h3>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-silver-dim mb-1">
                      Customer Full Name *
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-[#0C1420] px-3 py-1.5 text-xs text-silver-bright focus:border-[#00C4CC] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-silver-dim mb-1">
                      WhatsApp Phone *
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-[#0C1420] px-3 py-1.5 text-xs font-mono text-silver-bright focus:border-[#00C4CC] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-silver-dim mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-[#0C1420] px-3 py-1.5 text-xs text-silver-bright focus:border-[#00C4CC] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-silver-dim mb-1">
                      Official Order Number (Reassign)
                    </label>
                    <input
                      type="text"
                      value={editOrderNumber}
                      onChange={(e) => setEditOrderNumber(e.target.value)}
                      placeholder="e.g. STH-0001 (or blank)"
                      className="w-full rounded-lg border border-slate-700 bg-[#0C1420] px-3 py-1.5 text-xs font-mono text-[#00C4CC] placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-silver-dim mb-1">
                    Delivery Address *
                  </label>
                  <textarea
                    rows={2}
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-[#0C1420] px-3 py-1.5 text-xs text-silver-bright focus:border-[#00C4CC] focus:outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSaveEdit()}
                    disabled={loading}
                    className="rounded-lg bg-[#00C4CC] hover:bg-[#00b0b8] px-4 py-1.5 font-display text-xs font-bold text-black transition disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : '💾 Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-silver-dim">Name: </span>
                  <strong className="text-silver-bright">{order.customer_name}</strong>
                </div>
                <div>
                  <span className="text-silver-dim">WhatsApp: </span>
                  <a
                    href={`https://wa.me/${order.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[#00C4CC] underline"
                  >
                    {order.phone}
                  </a>
                </div>
                <div>
                  <span className="text-silver-dim">City: </span>
                  <span className="text-silver-bright">{order.city}</span>
                </div>
                <div>
                  <span className="text-silver-dim">Source: </span>
                  <span className="capitalize text-silver-bright">{order.order_source}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-silver-dim">Address: </span>
                  <span className="text-silver-bright">{order.address}</span>
                </div>
              </div>
            )}
          </div>

          {/* Ordered Items Table */}
          <div className="rounded-xl border border-slate-800/80 bg-[#080D15] p-3.5 sm:p-4 space-y-3">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#00C4CC]">
              Items Ordered
            </h3>
            <div className="divide-y divide-slate-800">
              {(order.order_items || []).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-silver-bright">
                      {item.product_name}
                      {item.variant_name && (
                        <span className="ml-1 text-[10px] text-[#00C4CC]">({item.variant_name})</span>
                      )}
                    </div>
                    <div className="text-silver-dim text-[11px]">
                      {item.quantity} x PKR {Number(item.unit_price).toLocaleString('en-PK')}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-silver-bright">
                    PKR {Number(item.line_total).toLocaleString('en-PK')}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Breakdown */}
            <div className="border-t border-slate-800 pt-3 space-y-1 text-xs">
              <div className="flex justify-between text-silver-dim">
                <span>Subtotal</span>
                <span>PKR {Number(order.subtotal).toLocaleString('en-PK')}</span>
              </div>
              {Number(order.coupon_discount) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Coupon Discount</span>
                  <span>-PKR {Number(order.coupon_discount).toLocaleString('en-PK')}</span>
                </div>
              )}
              {Number(order.bundle_discount) > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Bundle Discount</span>
                  <span>-PKR {Number(order.bundle_discount).toLocaleString('en-PK')}</span>
                </div>
              )}
              <div className="flex justify-between text-silver-dim">
                <span>Delivery Charges</span>
                <span>PKR {Number(order.delivery_charges).toLocaleString('en-PK')}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 font-display text-sm sm:text-base font-black text-silver-bright">
                <span>Total Amount</span>
                <span className="text-[#00C4CC]">
                  PKR {Number(order.total_amount).toLocaleString('en-PK')}
                </span>
              </div>
            </div>

            {/* Admin Financial Profit Box */}
            <div className="rounded-xl border border-slate-800 bg-[#0C1420] p-3 space-y-2 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  🔒 Order Profit & Cost Analysis
                </span>
                <span className="text-[10px] text-silver-dim">Private Financials</span>
              </div>
              {(() => {
                const totalItemCost = (order.order_items || []).reduce((sum, i) => {
                  return sum + ((Number(i.purchase_price) || 0) * (i.quantity || 1));
                }, 0);
                const orderSubtotal = Number(order.subtotal) || 0;
                const netProductRevenue = Math.max(0, orderSubtotal - (Number(order.coupon_discount) || 0) - (Number(order.bundle_discount) || 0));
                const orderProfit = netProductRevenue - totalItemCost;
                const orderMargin = netProductRevenue > 0 ? Math.round((orderProfit / netProductRevenue) * 10000) / 100 : 0;
                const isLoss = orderProfit < 0;

                return (
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div className="rounded-lg bg-[#080D15] p-2">
                      <span className="text-[10px] text-silver-dim block">Cost</span>
                      <span className="font-mono font-bold text-amber-300 text-[11px] sm:text-xs">
                        PKR {totalItemCost.toLocaleString('en-PK')}
                      </span>
                    </div>

                    <div className={`rounded-lg p-2 ${isLoss ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                      <span className="text-[10px] text-silver-dim block">Profit</span>
                      <span className={`font-mono font-bold text-[11px] sm:text-xs ${isLoss ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {orderProfit >= 0 ? '+' : ''}PKR {orderProfit.toLocaleString('en-PK')}
                      </span>
                    </div>

                    <div className={`rounded-lg p-2 ${isLoss ? 'bg-rose-500/10' : 'bg-[#00C4CC]/10'}`}>
                      <span className="text-[10px] text-silver-dim block">Margin</span>
                      <span className={`font-mono font-bold text-[11px] sm:text-xs ${isLoss ? 'text-rose-400' : 'text-[#00C4CC]'}`}>
                        {orderMargin}%
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Admin Notes */}
          <div>
            <label className="block text-xs font-semibold text-silver-bright mb-1">
              Admin Notes / Dispatch Details
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Courier tracking #, payment received, packing notes..."
              className="w-full rounded-xl border border-slate-700 bg-[#080D15] p-3 text-xs text-silver-bright placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="mt-6 border-t border-slate-800 pt-4 space-y-3">
          {/* Prominent Inline Delete Confirmation Box (Right where user is looking) */}
          {showDeleteConfirm && (
            <div className="rounded-xl border border-rose-500/60 bg-rose-950/60 p-4 space-y-3 animate-slideUp">
              <div className="flex items-center gap-2 font-display text-sm font-bold text-rose-200">
                <span className="text-lg">⚠️</span>
                <span>Confirm Permanent Deletion?</span>
              </div>
              <p className="text-xs text-rose-200/80">
                Are you sure you want to permanently delete order <strong className="text-white font-mono">{order.order_number || order.id}</strong>? All ordered items will be deleted and this action cannot be undone.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
                >
                  {deleting ? 'Deleting Order...' : 'Yes, Delete Order'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2 text-xs font-semibold text-silver-bright hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-silver-dim">Status:</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
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

              {/* Direct Delete Toggle Button */}
              {!showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-lg border border-rose-900/80 bg-rose-950/30 hover:bg-rose-900/50 px-2.5 py-1 text-xs font-semibold text-rose-400 hover:text-rose-300 transition"
                  title="Delete this order"
                >
                  🗑️ Delete Order
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isPending && (
                <>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={loading}
                    className="rounded-xl bg-[#25D366] hover:bg-[#20BD5A] px-4 py-2 font-display text-xs font-bold text-white shadow-[0_0_15px_rgba(37,211,102,0.3)] transition hover:scale-[1.02] disabled:opacity-50"
                  >
                    {loading ? 'Approving...' : '✓ APPROVE ORDER'}
                  </button>

                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={loading}
                    className="rounded-xl border border-rose-800/80 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 transition disabled:opacity-50"
                  >
                    {loading ? 'Rejecting...' : 'REJECT ORDER'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('cancelled')}
                    disabled={loading}
                    className="rounded-xl border border-slate-800 px-3 py-2 text-xs font-semibold text-silver-dim hover:text-white transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}

              {isApproved && (
                <>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('processing')}
                    disabled={loading}
                    className="rounded-xl border border-blue-800/80 bg-blue-950/30 px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-900/50 transition"
                  >
                    Processing
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('shipped')}
                    disabled={loading}
                    className="rounded-xl border border-indigo-800/80 bg-indigo-950/30 px-3 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/50 transition"
                  >
                    Shipped
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('delivered')}
                    disabled={loading}
                    className="rounded-xl border border-emerald-800/80 bg-emerald-950/30 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50 transition"
                  >
                    Delivered
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-800 px-3.5 py-2 text-xs font-semibold text-silver-dim hover:text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {showInvoiceModal && (
        <InvoiceModal order={order} onClose={() => setShowInvoiceModal(false)} />
      )}
    </div>
  );
}
