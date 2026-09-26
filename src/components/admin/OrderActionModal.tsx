'use client';

import React, { useState, useEffect } from 'react';
import type { Order } from '@/types/database';
import { useToast } from '@/context/ToastContext';
import { formatOrderDateTime } from '@/lib/utils';
import { createWhatsAppUrl } from '@/lib/whatsapp';
import { renderWhatsAppTemplate } from '@/lib/whatsapp-templates';

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
  const [showCustomerWhatsApp, setShowCustomerWhatsApp] = useState(false);
  const [customerMessageType, setCustomerMessageType] = useState<'approved' | 'processing' | 'shipped' | 'delivered' | 'address_confirmation' | 'thank_you' | 'custom'>('approved');
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [customCustomerMessage, setCustomCustomerMessage] = useState('');
  const [whatsappTemplates, setWhatsAppTemplates] = useState<Record<string, string>>({});

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(order?.customer_name || '');
  const [editPhone, setEditPhone] = useState(order?.phone || '');
  const [editCity, setEditCity] = useState(order?.city || '');
  const [editAddress, setEditAddress] = useState(order?.address || '');
  const [editOrderNumber, setEditOrderNumber] = useState(order?.order_number || '');

  // VIP / Known Customer Custom Rate & Discount State
  const initialBaseDiscount = (Number(order?.coupon_discount) || 0) + (Number(order?.bundle_discount) || 0);
  const [vipDiscountAmount, setVipDiscountAmount] = useState(initialBaseDiscount);
  const [vipDiscountPercent, setVipDiscountPercent] = useState<string>('0');
  const [vipDeliveryCharges, setVipDeliveryCharges] = useState(Number(order?.delivery_charges) || 0);
  const [editTotalAmount, setEditTotalAmount] = useState(order?.total_amount ? String(order.total_amount) : '0');

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (order) {
      setNotes(order.admin_notes || '');
      setEditName(order.customer_name || '');
      setEditPhone(order.phone || '');
      setEditCity(order.city || '');
      setEditAddress(order.address || '');
      setEditOrderNumber(order.order_number || '');
      const baseDiscount = (Number(order.coupon_discount) || 0) + (Number(order.bundle_discount) || 0);
      setVipDiscountAmount(baseDiscount);
      setVipDiscountPercent(
        order.subtotal > 0 && baseDiscount > 0
          ? (Math.round((baseDiscount / order.subtotal) * 1000) / 10).toString()
          : '0'
      );
      setVipDeliveryCharges(Number(order.delivery_charges) || 0);
      setEditTotalAmount(String(order.total_amount || 0));
      setIsEditing(false);
      setShowDeleteConfirm(false);
      setErrorMsg('');
      setConfirmationUrl(null);
      setShowCustomerWhatsApp(false);
      setCustomerMessageType('approved');
      setCourierName('');
      setTrackingNumber('');
      setCustomCustomerMessage('');
      fetch('/api/admin/whatsapp')
        .then((response) => response.json())
        .then((data) => {
          if (Array.isArray(data.templates)) {
            setWhatsAppTemplates(Object.fromEntries(data.templates.map((template: { template_key: string; body: string }) => [template.template_key, template.body])));
          }
        })
        .catch(() => {});
    }
  }, [order?.id]);

  if (!order) return null;

  const orderSubtotal = Number(order.subtotal) || 0;
  const currentDiscount = Number(vipDiscountAmount) || 0;
  const currentDelivery = Number(vipDeliveryCharges) || 0;
  const liveTotalAmount = Math.max(0, orderSubtotal - currentDiscount + currentDelivery);
  const isCustomPriceApplied = currentDiscount !== initialBaseDiscount || currentDelivery !== (Number(order.delivery_charges) || 0);

  function applyPresetPercent(pct: number) {
    const calculatedDiscount = Math.round((orderSubtotal * pct) / 100);
    setVipDiscountAmount(calculatedDiscount);
    setVipDiscountPercent(pct.toString());
  }

  function applyCustomPercent(pctStr: string) {
    setVipDiscountPercent(pctStr);
    const num = parseFloat(pctStr);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      const calculatedDiscount = Math.round((orderSubtotal * num) / 100);
      setVipDiscountAmount(calculatedDiscount);
    }
  }

  function applyCustomPkrDiscount(pkr: number) {
    const val = Math.max(0, Math.min(pkr, orderSubtotal));
    setVipDiscountAmount(val);
    if (orderSubtotal > 0) {
      setVipDiscountPercent((Math.round((val / orderSubtotal) * 1000) / 10).toString());
    }
  }

  function resetToOriginalWebRate() {
    setVipDiscountAmount(initialBaseDiscount);
    setVipDiscountPercent('0');
    setVipDeliveryCharges(Number(order?.delivery_charges) || 0);
  }
  const orderCouponDiscount = Number(order.coupon_discount) || 0;
  const orderBundleDiscount = Number(order.bundle_discount) || 0;
  const orderDeliveryCharges = Number(order.delivery_charges) || 0;
  const orderTotalAmount = Number(order.total_amount) || 0;

  async function handleApprove() {
    if (!order) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_notes: notes,
          coupon_discount: currentDiscount,
          bundle_discount: 0,
          delivery_charges: currentDelivery,
          total_amount: liveTotalAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve order');
      }

      onOrderUpdated(data.order);
      setConfirmationUrl(data.confirmationWhatsAppUrl);
      success(`Order approved with final total PKR ${liveTotalAmount.toLocaleString('en-PK')}!`);
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

  function sendCustomerWhatsApp() {
    if (!order) return;

    if (customerMessageType === 'shipped' && (!courierName.trim() || !trackingNumber.trim())) {
      showErrorToast('Courier name and tracking number are required for a shipped message');
      return;
    }

    const itemsText = (order.order_items || [])
      .map((item) => `${item.product_name} x ${item.quantity}`)
      .join(', ');
    const orderRef = order.order_number || order.id;
    const total = Number(order.total_amount || 0).toLocaleString('en-PK');
    const messages = {
      approved: `Hello ${order.customer_name},\n\nYour order *${orderRef}* has been approved by STH Gadgets.\n\nItems: ${itemsText}\nTotal: PKR ${total}\nDelivery: ${order.city}\n\nWe are preparing your order for dispatch. Thank you for shopping with us!`,
      processing: `Hello ${order.customer_name},\n\nYour order *${orderRef}* is now being processed by STH Gadgets.\n\nItems: ${itemsText}\nTotal: PKR ${total}\nDelivery City: ${order.city}\n\nWe will share the courier details once it is dispatched.`,
      shipped: `Hello ${order.customer_name},\n\nYour order *${orderRef}* has been shipped through courier.\n\nCourier: ${courierName.trim()}\nTracking Number: ${trackingNumber.trim()}\nDelivery City: ${order.city}\nItems: ${itemsText}\nTotal: PKR ${total}\n\nYou can use the tracking number to follow your parcel. Thank you!`,
      delivered: `Hello ${order.customer_name},\n\nYour order *${orderRef}* has been marked as delivered.\n\nItems: ${itemsText}\nTotal: PKR ${total}\nDelivery City: ${order.city}\n\nThank you for shopping with STH Gadgets! Please contact us if you need any assistance.`,
    };

    const templateKeyByType: Record<string, string> = {
      approved: 'order_approved',
      processing: 'product_purchased',
      shipped: 'order_dispatched',
      delivered: 'order_delivered',
      address_confirmation: 'address_confirmation',
      thank_you: 'thank_you',
    };
    const values = {
      customer_name: order.customer_name,
      order_number: orderRef,
      whatsapp_number: order.phone,
      city: order.city,
      address: order.address,
      order_items: itemsText,
      subtotal: Number(order.subtotal || 0).toLocaleString('en-PK'),
      delivery_charges: Number(order.delivery_charges || 0).toLocaleString('en-PK'),
      discount: (Number(order.coupon_discount || 0) + Number(order.bundle_discount || 0)).toLocaleString('en-PK'),
      total,
      payment_method: 'Cash on Delivery',
      order_status: order.status,
      tracking_number: trackingNumber.trim(),
      store_name: 'STH Gadgets',
    };
    const fallbackMessage = customerMessageType === 'custom'
      ? customCustomerMessage.trim()
      : messages[customerMessageType as keyof typeof messages] || '';
    const savedBody = templateKeyByType[customerMessageType] ? whatsappTemplates[templateKeyByType[customerMessageType]] : '';
    const finalMessage = customerMessageType === 'custom' ? fallbackMessage : renderWhatsAppTemplate(savedBody || fallbackMessage, values);
    if (!finalMessage) {
      showErrorToast('Please write a message before sending');
      return;
    }

    window.open(createWhatsAppUrl(order.phone, finalMessage), '_blank');
    fetch('/api/admin/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: order.id, order_number: order.order_number, customer_name: order.customer_name, message_type: customerMessageType, recipient_phone: order.phone, message_body: finalMessage, status: 'sent' }),
    }).catch(() => {});
    setShowCustomerWhatsApp(false);
  }

  async function handleSaveEdit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!order) return;
    setLoading(true);
    setErrorMsg('');

    const parsedTotal = Math.max(0, parseFloat(editTotalAmount) || orderTotalAmount);
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
          coupon_discount: currentDiscount,
          bundle_discount: 0,
          delivery_charges: currentDelivery,
          total_amount: parsedTotal,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update order');
      }

      onOrderUpdated(data.order);
      setIsEditing(false);
  success(`Order details & custom total (PKR ${parsedTotal.toLocaleString('en-PK')}) updated successfully!`);
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

  const isPending = order.status === 'pending' || order.status === 'pending_payment';
  const isApprovedOrActive = order.status !== 'pending' && order.status !== 'pending_payment' && order.status !== 'cancelled' && order.status !== 'rejected';

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
            </div>
            <p className="mt-1 text-[11px] sm:text-xs text-silver-dim truncate max-w-xs sm:max-w-md" suppressHydrationWarning>
              Ref ID: <span className="font-mono text-silver-bright">{order.id}</span>
              {' • '}
              <span className="text-[#00C4CC] font-mono">🕒 {formatOrderDateTime(order.created_at).full}</span>
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

                  <div>
                    <label className="block text-[11px] font-semibold text-silver-dim mb-1">
                      Total Order Amount (PKR) (Adjust Price Directly)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editTotalAmount}
                      onChange={(e) => setEditTotalAmount(e.target.value)}
                      placeholder={String(orderTotalAmount)}
                      className="w-full rounded-lg border border-slate-700 bg-[#0C1420] px-3 py-1.5 text-xs font-mono font-bold text-emerald-400 focus:border-[#00C4CC] focus:outline-none"
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
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                  <div className="space-y-1">
                    <div className="font-semibold text-silver-bright text-xs sm:text-sm">
                      {item.product_name}
                    </div>
                    {item.variant_name && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[11px] font-medium">Color:</span>
                        <span className="rounded-md bg-[#00C4CC]/15 border border-[#00C4CC]/30 px-2 py-0.5 text-[11px] font-bold text-[#00C4CC]">
                          {item.variant_name}
                        </span>
                      </div>
                    )}
                    <div className="text-silver-dim text-[11px]">
                      Quantity: <strong className="text-white font-mono">{item.quantity}</strong> × PKR {Number(item.unit_price).toLocaleString('en-PK')}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-silver-bright text-xs sm:text-sm">
                      PKR {Number(item.line_total).toLocaleString('en-PK')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {false && (<>
            {/* VIP & Acquaintance Custom Rate Adjustment Panel */}
            <div className="rounded-xl border border-cyan-500/40 bg-[#06101D] p-3.5 sm:p-4 space-y-3.5 mt-3 shadow-md">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">🤝</span>
                  <h3 className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-[#00C4CC]">
                    VIP / Known Customer Custom Rate
                  </h3>
                </div>
                {isCustomPriceApplied && (
                  <span className="rounded-full bg-[#00C4CC]/20 border border-[#00C4CC]/50 px-2.5 py-0.5 text-[10px] font-black text-[#00C4CC] animate-pulse">
                    ● Custom Rate Active
                  </span>
                )}
              </div>

              <p className="text-[11px] text-silver-dim leading-relaxed">
                Give special discounted rates to friends or known customers. Total amount and profit recalculate instantly in real-time.
              </p>

              {/* 1-Click Quick Preset Buttons */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Quick Discount Presets:
                </span>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => applyPresetPercent(5)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                      vipDiscountPercent === '5'
                        ? 'bg-[#00C4CC] text-slate-950 shadow-[0_0_10px_rgba(0,196,204,0.5)]'
                        : 'border border-cyan-500/40 bg-cyan-500/10 text-[#00C4CC] hover:bg-cyan-500/20'
                    }`}
                  >
                    ⚡ -5% VIP
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetPercent(10)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                      vipDiscountPercent === '10'
                        ? 'bg-[#00C4CC] text-slate-950 shadow-[0_0_10px_rgba(0,196,204,0.5)]'
                        : 'border border-cyan-500/40 bg-cyan-500/10 text-[#00C4CC] hover:bg-cyan-500/20'
                    }`}
                  >
                    ⚡ -10% VIP
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetPercent(15)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                      vipDiscountPercent === '15'
                        ? 'bg-[#00C4CC] text-slate-950 shadow-[0_0_10px_rgba(0,196,204,0.5)]'
                        : 'border border-cyan-500/40 bg-cyan-500/10 text-[#00C4CC] hover:bg-cyan-500/20'
                    }`}
                  >
                    ⚡ -15% VIP
                  </button>
                  <button
                    type="button"
                    onClick={() => setVipDeliveryCharges(0)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                      currentDelivery === 0
                        ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                        : 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    🚚 Free Delivery
                  </button>
                  {isCustomPriceApplied && (
                    <button
                      type="button"
                      onClick={resetToOriginalWebRate}
                      className="rounded-lg border border-slate-700 bg-[#0C1420] hover:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                      title="Reset to original website rate"
                    >
                      🔄 Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Custom Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-silver-dim mb-1">
                    Discount Percentage (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={vipDiscountPercent}
                      onChange={(e) => applyCustomPercent(e.target.value)}
                      placeholder="e.g. 5"
                      className="w-full rounded-lg border border-slate-700 bg-[#0C1420] pl-3 pr-7 py-1.5 text-xs font-mono text-[#00C4CC] focus:border-[#00C4CC] focus:outline-none"
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1.5 text-xs text-slate-500">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-silver-dim mb-1">
                    Discount Amount (PKR)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max={orderSubtotal}
                      value={currentDiscount}
                      onChange={(e) => applyCustomPkrDiscount(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full rounded-lg border border-slate-700 bg-[#0C1420] pl-3 pr-10 py-1.5 text-xs font-mono text-emerald-400 focus:border-[#00C4CC] focus:outline-none"
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1.5 text-[10px] text-slate-500">PKR</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-silver-dim mb-1">
                    Delivery Charges (PKR)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={currentDelivery}
                      onChange={(e) => setVipDeliveryCharges(Number(e.target.value) || 0)}
                      placeholder="200"
                      className="w-full rounded-lg border border-slate-700 bg-[#0C1420] pl-3 pr-10 py-1.5 text-xs font-mono text-silver-bright focus:border-[#00C4CC] focus:outline-none"
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1.5 text-[10px] text-slate-500">PKR</span>
                  </div>
                </div>
              </div>
            </div>

            </>)}

            {/* Financial Breakdown (Live Recalculation) */}
            <div className="border-t border-slate-800 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-silver-dim">
                <span>Subtotal (Standard Catalog Rate)</span>
                <span>PKR {orderSubtotal.toLocaleString('en-PK')}</span>
              </div>
              {currentDiscount > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Total Discount {vipDiscountPercent !== '0' ? `(${vipDiscountPercent}%)` : ''}</span>
                  <span>-PKR {currentDiscount.toLocaleString('en-PK')}</span>
                </div>
              )}
              <div className="flex justify-between text-silver-dim">
                <span>Delivery Charges</span>
                <span>{currentDelivery === 0 ? <strong className="text-emerald-400">FREE</strong> : `PKR ${currentDelivery.toLocaleString('en-PK')}`}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 font-display text-sm sm:text-base font-black text-silver-bright">
                <span>Final Approved Total</span>
                <span className="text-[#00C4CC] font-mono">
                  PKR {liveTotalAmount.toLocaleString('en-PK')}
                </span>
              </div>
            </div>

            {/* Admin Financial Profit Box (Recalculates against live custom total) */}
            <div className="rounded-xl border border-slate-800 bg-[#0C1420] p-3 space-y-2 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  🔒 Live Order Profit &amp; Cost Analysis
                </span>
                <span className="text-[10px] text-silver-dim">Private Financials</span>
              </div>
              {(() => {
                const totalItemCost = (order.order_items || []).reduce((sum, i) => {
                  return sum + ((Number(i.purchase_price) || 0) * (i.quantity || 1));
                }, 0);
                const netProductRevenue = Math.max(0, orderSubtotal - currentDiscount);
                const orderProfit = netProductRevenue - totalItemCost;
                const orderMargin = netProductRevenue > 0 ? Math.round((orderProfit / netProductRevenue) * 10000) / 100 : 0;
                const isLoss = orderProfit < 0;

                return (
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div className="rounded-lg bg-[#080D15] p-2">
                      <span className="text-[10px] text-silver-dim block">Product Cost</span>
                      <span className="font-mono font-bold text-amber-300 text-[11px] sm:text-xs">
                        PKR {totalItemCost.toLocaleString('en-PK')}
                      </span>
                    </div>

                    <div className={`rounded-lg p-2 ${isLoss ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                      <span className="text-[10px] text-silver-dim block">Net Profit</span>
                      <span className={`font-mono font-bold text-[11px] sm:text-xs ${isLoss ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {orderProfit >= 0 ? '+' : ''}PKR {orderProfit.toLocaleString('en-PK')}
                      </span>
                    </div>

                    <div className={`rounded-lg p-2 ${isLoss ? 'bg-rose-500/10' : 'bg-[#00C4CC]/10'}`}>
                      <span className="text-[10px] text-silver-dim block">Profit Margin</span>
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
                    : order.status === 'pending_payment'
                    ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                    : order.status === 'shipped' || order.status === 'processing'
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {order.status === 'pending_payment' ? 'Payment Pending' : order.status}
              </span>

              <a
                href={`/admin/invoices/new?customer_name=${encodeURIComponent(order.customer_name)}&customer_phone=${encodeURIComponent(order.phone)}&customer_city=${encodeURIComponent(order.city)}&customer_address=${encodeURIComponent(order.address)}&delivery=${order.delivery_charges}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-xl border border-[#00C4CC]/40 bg-[#00C4CC]/10 px-3 py-1 text-xs font-bold text-[#00C4CC] hover:bg-[#00C4CC]/20 transition"
              >
                📄 Generate Invoice
              </a>

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
                    className="rounded-xl bg-[#25D366] hover:bg-[#20BD5A] px-4 py-2 font-display text-xs font-bold text-white shadow-[0_0_15px_rgba(37,211,102,0.3)] transition hover:scale-[1.02] disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span>✓</span>
                    <span>{loading ? 'Approving...' : `APPROVE ORDER (PKR ${liveTotalAmount.toLocaleString('en-PK')})`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={loading}
                    className="rounded-xl border border-rose-800/80 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 transition disabled:opacity-50"
                  >
                    {loading ? 'Rejecting...' : 'REJECT'}
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

              {isApprovedOrActive && (
                <>
                  {isCustomPriceApplied && (
                    <button
                      type="button"
                      onClick={() => handleSaveEdit()}
                      disabled={loading}
                      className="rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] px-4 py-2 font-display text-xs font-bold text-black shadow-[0_0_15px_rgba(0,196,204,0.3)] transition hover:scale-[1.02] disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : `💾 Save Custom Total (PKR ${liveTotalAmount.toLocaleString('en-PK')})`}
                    </button>
                  )}
                  <a
                    href={`/invoice/${order.order_number || order.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-[#00C4CC]/50 bg-[#00C4CC]/10 hover:bg-[#00C4CC]/20 px-3.5 py-2 text-xs font-bold text-[#00C4CC] transition inline-flex items-center gap-1.5"
                  >
                    <span>📄</span>
                    <span>View Official Invoice</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowCustomerWhatsApp(true)}
                    disabled={!order.phone}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#25D366]/50 bg-[#25D366]/10 px-3.5 py-2 text-xs font-bold text-[#25D366] transition hover:bg-[#25D366]/20 disabled:opacity-50"
                  >
                    <span>💬</span>
                    <span>Customer WhatsApp</span>
                  </button>
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

      {showCustomerWhatsApp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="fixed inset-0" onClick={() => setShowCustomerWhatsApp(false)} />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-[#25D366]/35 bg-[#0C1420] text-[#C9D2DB] shadow-2xl">
            <div className="border-b border-slate-800 bg-gradient-to-r from-[#10251B] via-[#0C1420] to-[#071827] px-5 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#25D366]">Customer notification</span>
                  <h3 className="mt-1 font-display text-lg font-black text-white">Send order update</h3>
                  <p className="mt-1 text-[11px] text-slate-400">{order.order_number || 'Pending order'} · {order.customer_name}</p>
                </div>
                <button type="button" onClick={() => setShowCustomerWhatsApp(false)} className="rounded-lg border border-slate-700 p-1.5 text-slate-400 hover:text-white" title="Close">
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-2.5 p-5">
              {([
                ['approved', 'Approved', 'Confirm that the order has been accepted.', '✓'],
                ['processing', 'Processing', 'Tell the customer the order is being prepared.', '⚙️'],
                ['shipped', 'Shipped by Courier', 'Send courier name and tracking number.', '🚚'],
                ['delivered', 'Delivered', 'Confirm successful delivery.', '📦'],
                ['address_confirmation', 'Address Confirmation', 'Ask the customer to verify their delivery address.', '📍'],
                ['thank_you', 'Thank You', 'Send a short post-delivery thank-you message.', '✨'],
                ['custom', 'Custom Message', 'Write a one-time English message for this order.', '✎'],
              ] as const).map(([value, label, description, icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCustomerMessageType(value)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${customerMessageType === value ? 'border-[#25D366] bg-[#25D366]/12' : 'border-slate-700 bg-[#080D15] hover:border-[#25D366]/50'}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-base">{icon}</span>
                  <span className="min-w-0 flex-1"><span className="block text-xs font-black text-white">{label}</span><span className="mt-0.5 block text-[11px] text-slate-400">{description}</span></span>
                  <span className={`h-4 w-4 rounded-full border ${customerMessageType === value ? 'border-[#25D366] bg-[#25D366]' : 'border-slate-600'}`} />
                </button>
              ))}

              {customerMessageType === 'shipped' && (
                <div className="space-y-2 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-indigo-300">Courier Name *</label>
                    <input value={courierName} onChange={(e) => setCourierName(e.target.value)} placeholder="e.g. TCS, Leopards, M&P" className="w-full rounded-lg border border-slate-700 bg-[#080D15] px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-indigo-300">Tracking Number *</label>
                    <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Enter courier tracking number" className="w-full rounded-lg border border-slate-700 bg-[#080D15] px-3 py-2 text-xs font-mono text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none" />
                  </div>
                </div>
              )}

              {customerMessageType === 'custom' && (
                <div className="rounded-xl border border-[#00C4CC]/30 bg-[#00C4CC]/5 p-3">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#36C5FF]">Custom English Message</label>
                  <textarea value={customCustomerMessage} onChange={(event) => setCustomCustomerMessage(event.target.value)} rows={5} placeholder={`Hello ${order.customer_name},\n\nWrite your message here...`} className="w-full resize-y rounded-lg border border-slate-700 bg-[#080D15] px-3 py-2 text-xs leading-5 text-white placeholder:text-slate-500 focus:border-[#00C4CC] focus:outline-none" />
                </div>
              )}

              {customerMessageType !== 'custom' && customerMessageType !== 'shipped' && (
                <div className="rounded-xl border border-slate-800 bg-[#080D15] p-3 text-[11px] leading-5 text-slate-400">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Message preview</span>
                  {renderWhatsAppTemplate(whatsappTemplates[{ approved: 'order_approved', processing: 'product_purchased', delivered: 'order_delivered', address_confirmation: 'address_confirmation', thank_you: 'thank_you' }[customerMessageType] || ''] || 'Your selected message will be prepared with this order information.', { customer_name: order.customer_name, order_number: order.order_number || 'Pending', total: Number(order.total_amount || 0).toLocaleString('en-PK'), city: order.city, address: order.address, store_name: 'STH Gadgets' })}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
                <button type="button" onClick={() => setShowCustomerWhatsApp(false)} className="rounded-xl border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-white">Cancel</button>
                <button type="button" onClick={sendCustomerWhatsApp} className="rounded-xl bg-[#25D366] px-4 py-2 text-xs font-black text-white shadow-[0_0_16px_rgba(37,211,102,0.25)] hover:bg-[#20BD5A]">Open WhatsApp</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
