'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { VendorProfile, VendorPurchase } from '@/types/database';
import { useToast } from '@/context/ToastContext';
import { createWhatsAppUrl } from '@/lib/whatsapp';

export default function VendorPurchasesPage() {
  const { success, error: showErrorToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [purchases, setPurchases] = useState<VendorPurchase[]>([]);
  const [profile, setProfile] = useState<VendorProfile>({
    id: 'voltix-mobile-v1',
    name: 'Voltix Mobile',
    logo_url: '/images/logo.png',
    phone: '+92 348 9593671',
    email: 'voltix@sthgadgets.com',
    address: 'Mobile Market, Lahore, Pakistan',
    notes: 'Primary Wholesale Mobile & Accessories Vendor',
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'purchased'>('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<VendorPurchase | null>(null);
  const [whatsAppPurchase, setWhatsAppPurchase] = useState<VendorPurchase | null>(null);
  const [whatsAppAction, setWhatsAppAction] = useState<'due_date' | 'partial_payment' | 'payment_confirmation'>('due_date');

  // Form State
  const [formOrderNumber, setFormOrderNumber] = useState('');
  const [formProductName, setFormProductName] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formWholesaleCost, setFormWholesaleCost] = useState(0);
  const [formStatus, setFormStatus] = useState<'pending' | 'purchased'>('pending');
  const [formPaymentStatus, setFormPaymentStatus] = useState<'unpaid' | 'partial' | 'paid'>('unpaid');
  const [formPaymentMethod, setFormPaymentMethod] = useState('cash');
  const [formAmountPaid, setFormAmountPaid] = useState(0);
  const [formPaymentDueDate, setFormPaymentDueDate] = useState('');
  const [formPurchaseDate, setFormPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Profile Form State
  const [profLogoUrl, setProfLogoUrl] = useState('');
  const [profPhone, setProfPhone] = useState('');
  const [profEmail, setProfEmail] = useState('');
  const [profAddress, setProfAddress] = useState('');
  const [profNotes, setProfNotes] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Suggestions for order numbers & products
  const [storeProducts, setStoreProducts] = useState<Array<{ id: string; name: string; wholesale_price?: number }>>([]);
  const [recentOrders, setRecentOrders] = useState<Array<{ id: string; order_number: string }>>([]);
  const suggestionsLoaded = useRef(false);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/vendor-purchases?status=${statusFilter}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.purchases) setPurchases(data.purchases);
      if (data.profile) {
        setProfile(data.profile);
        setProfLogoUrl(data.profile.logo_url || '');
        setProfPhone(data.profile.phone || '');
        setProfEmail(data.profile.email || '');
        setProfAddress(data.profile.address || '');
        setProfNotes(data.profile.notes || '');
      }
    } catch (err: any) {
      showErrorToast('Failed to load vendor purchases');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadData();
  }

  function resetForm() {
    setFormOrderNumber('');
    setFormProductName('');
    setFormQuantity(1);
    setFormWholesaleCost(0);
    setFormStatus('pending');
    setFormPaymentStatus('unpaid');
    setFormPaymentMethod('cash');
    setFormAmountPaid(0);
    setFormPaymentDueDate('');
    setFormPurchaseDate(new Date().toISOString().split('T')[0]);
    setFormNotes('');
    setEditingPurchase(null);
  }

  function openCreateModal() {
    resetForm();
    loadSuggestions();
    setIsCreateOpen(true);
  }

  function openEditModal(p: VendorPurchase) {
    loadSuggestions();
    setEditingPurchase(p);
    setFormOrderNumber(p.order_number);
    setFormProductName(p.product_name);
    setFormQuantity(p.quantity);
    setFormWholesaleCost(p.wholesale_cost);
    setFormStatus(p.status);
    setFormPaymentStatus(p.payment_status || 'unpaid');
    setFormPaymentMethod(p.payment_method || 'cash');
    setFormAmountPaid(Number(p.amount_paid) || 0);
    setFormPaymentDueDate(p.payment_due_date || '');
    setFormPurchaseDate(p.purchase_date);
    setFormNotes(p.notes || '');
    setIsCreateOpen(true);
  }

  async function loadSuggestions() {
    if (suggestionsLoaded.current) return;
    suggestionsLoaded.current = true;
    const [productsResult, ordersResult] = await Promise.allSettled([
      fetch('/api/products').then((response) => response.json()),
      fetch('/api/admin/orders?limit=20').then((response) => response.json()),
    ]);
    if (productsResult.status === 'fulfilled' && productsResult.value.products) {
      setStoreProducts(productsResult.value.products);
    }
    if (ordersResult.status === 'fulfilled' && ordersResult.value.orders) {
      setRecentOrders(ordersResult.value.orders.filter((order: any) => order.order_number));
    }
  }

  async function handleLogoFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'site-assets');

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed');

      setProfLogoUrl(data.url);
      success('Vendor logo uploaded from gallery successfully!');
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to upload logo image');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSavePurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!formProductName.trim()) {
      showErrorToast('Please enter or select a product name');
      return;
    }

    setSubmitting(true);
    try {
      const isEdit = !!editingPurchase;
      const url = isEdit
        ? `/api/admin/vendor-purchases/${editingPurchase.id}`
        : '/api/admin/vendor-purchases';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: formOrderNumber || 'STH-GENERAL',
          product_name: formProductName,
          quantity: formQuantity,
          wholesale_cost: formWholesaleCost,
          status: formStatus,
          payment_status: formPaymentStatus,
          payment_method: formPaymentMethod,
          amount_paid: formAmountPaid,
          payment_due_date: formPaymentDueDate || null,
          purchase_date: formPurchaseDate,
          notes: formNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save purchase record');
      }

      success(isEdit ? 'Purchase record updated!' : 'Vendor purchase record created!');
      setIsCreateOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      showErrorToast(err.message || 'Error saving purchase record');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(purchase: VendorPurchase) {
    const nextStatus = purchase.status === 'pending' ? 'purchased' : 'pending';
    try {
      const res = await fetch(`/api/admin/vendor-purchases/${purchase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to update status');

      success(`Status changed to ${nextStatus.toUpperCase()}`);
      loadData();
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to toggle status');
    }
  }

  async function handleDeletePurchase(id: string) {
    if (!confirm('Are you sure you want to delete this purchase record?')) return;
    try {
      const res = await fetch(`/api/admin/vendor-purchases/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to delete');

      success('Purchase record deleted');
      loadData();
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to delete record');
    }
  }

  function openWhatsApp(purchase: VendorPurchase) {
    setWhatsAppPurchase(purchase);
    setWhatsAppAction('due_date');
  }

  async function sendWhatsAppMessage() {
    if (!whatsAppPurchase || !profile.phone) {
      showErrorToast('Please add a vendor WhatsApp number in the vendor profile first');
      return;
    }

    const total = Number(whatsAppPurchase.wholesale_cost) * Number(whatsAppPurchase.quantity);
    const paid = Number(whatsAppPurchase.amount_paid) || 0;
    const remaining = Math.max(0, total - paid);
    const greeting = `Assalam-o-Alaikum ${profile.name},`;
    const dueDate = whatsAppPurchase.payment_due_date || 'Not set';
    const record = `Purchase ID: ${whatsAppPurchase.purchase_number}\nProduct: ${whatsAppPurchase.product_name}\nQuantity: ${whatsAppPurchase.quantity}\nTotal Amount: PKR ${total.toLocaleString('en-PK')}\nPurchase Date: ${whatsAppPurchase.purchase_date}`;
    const messages = {
      due_date: `${greeting}\n\nPayment due date update for vendor purchase ${whatsAppPurchase.purchase_number}.\n\n${record}\nPayment Due Date: ${dueDate}\nPaid Amount: PKR ${paid.toLocaleString('en-PK')}\nRemaining Amount: PKR ${remaining.toLocaleString('en-PK')}\nPayment Status: ${(whatsAppPurchase.payment_status || 'unpaid').toUpperCase()}\nPayment Method: ${whatsAppPurchase.payment_method || 'cash'}\n\nI will pay the remaining amount on the due date. Please confirm.`,
      partial_payment: `${greeting}\n\nThis is a partial payment update for vendor purchase ${whatsAppPurchase.purchase_number}.\n\n${record}\nPaid Amount: PKR ${paid.toLocaleString('en-PK')}\nRemaining Amount: PKR ${remaining.toLocaleString('en-PK')}\nPayment Method: ${whatsAppPurchase.payment_method || 'cash'}\n\nPlease confirm receipt of the partial payment.`,
      payment_confirmation: `${greeting}\n\nPayment confirmation for vendor purchase ${whatsAppPurchase.purchase_number}:\n\n${record}\nPaid Amount: PKR ${paid.toLocaleString('en-PK')}\nPayment Status: ${(whatsAppPurchase.payment_status || 'unpaid').toUpperCase()}\nPayment Method: ${whatsAppPurchase.payment_method || 'cash'}\n\nPlease confirm receipt. Thank you.`,
    };

    window.open(createWhatsAppUrl(profile.phone, messages[whatsAppAction]), '_blank');
    try {
      await fetch(`/api/admin/vendor-purchases/${whatsAppPurchase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_sent_at: new Date().toISOString() }),
      });
      success('WhatsApp message opened. Purchase ID is now active.');
      loadData();
    } catch {
      showErrorToast('Message opened, but the WhatsApp sent status could not be saved');
    }
    setWhatsAppPurchase(null);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/vendor-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Voltix Mobile',
          logo_url: profLogoUrl,
          phone: profPhone,
          email: profEmail,
          address: profAddress,
          notes: profNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to update profile');

      if (data.profile) setProfile(data.profile);
      success('Voltix Mobile vendor profile updated!');
      setIsProfileOpen(false);
    } catch (err: any) {
      showErrorToast(err.message || 'Error updating profile');
    } finally {
      setSubmitting(false);
    }
  }

  const pendingCount = purchases.filter((p) => p.status === 'pending').length;
  const pendingCostSum = purchases
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + (Number(p.wholesale_cost) || 0) * (Number(p.quantity) || 1), 0);
  const purchasedCostSum = purchases
    .filter((p) => p.status === 'purchased')
    .reduce((sum, p) => sum + (Number(p.wholesale_cost) || 0) * (Number(p.quantity) || 1), 0);

  return (
    <div className="space-y-6 text-[#C9D2DB]">
      {/* Header & Vendor Profile Card (Finance Theme: Cyan + Slate-800) */}
      <div className="rounded-2xl border border-[#00C4CC]/30 bg-gradient-to-r from-[#0C1420] via-[#0F1C2D] to-[#080D15] p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Voltix Mobile Vendor Logo */}
            <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl border border-[#00C4CC]/40 bg-black/60 p-1 shadow-md">
              <Image
                src={profile.logo_url || '/images/logo.png'}
                alt={profile.name}
                fill
                className="object-contain p-1"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#00C4CC]/15 border border-[#00C4CC]/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#00C4CC]">
                  OFFICIAL VENDOR
                </span>
                <span className="text-xs font-semibold text-emerald-400">● Active Supplier</span>
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-black text-white leading-snug">
                {profile.name} — Vendor Purchases
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Track order-based wholesale inventory purchases & procurement from Voltix Mobile.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="rounded-xl border border-slate-700 bg-[#0C1420] hover:border-[#00C4CC] px-3.5 py-2.5 text-xs font-bold text-white hover:text-[#00C4CC] transition flex items-center gap-1.5"
            >
              <span>⚙️</span> Edit Vendor Profile
            </button>
            <button
              onClick={openCreateModal}
              className="rounded-xl bg-gradient-to-r from-[#00C4CC] to-cyan-600 hover:brightness-110 py-2.5 px-4 font-display text-xs font-black text-slate-950 shadow-md transition hover:scale-[1.02] flex items-center gap-1.5 cursor-pointer"
            >
              <span>➕</span> New Vendor Purchase
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats Grid (Finance Styling) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pending Purchases */}
        <div className="rounded-2xl border border-amber-500/30 bg-[#0C1420] p-5 shadow-lg relative overflow-hidden">
          <div className="absolute right-4 top-4 text-2xl leading-none opacity-100 brightness-150">⏳</div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
            Pending Vendor Purchases
          </span>
          <div className="mt-2 font-mono text-2xl sm:text-3xl font-black text-white">
            {pendingCount} Record{pendingCount === 1 ? '' : 's'}
          </div>
          <span className="text-xs text-amber-300/90 block font-medium mt-1">
            Required Capital: PKR {pendingCostSum.toLocaleString('en-PK')}
          </span>
        </div>

        {/* Purchased & Received */}
        <div className="rounded-2xl border border-emerald-500/30 bg-[#0C1420] p-5 shadow-lg relative overflow-hidden">
          <div className="absolute right-4 top-4 text-2xl leading-none opacity-100 brightness-150">✅</div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
            Purchased & Received
          </span>
          <div className="mt-2 font-mono text-2xl sm:text-3xl font-black text-white">
            {purchases.filter((p) => p.status === 'purchased').length} Record{purchases.filter((p) => p.status === 'purchased').length === 1 ? '' : 's'}
          </div>
          <span className="text-xs text-emerald-300/90 block font-medium mt-1">
            Fulfilled Capital: PKR {purchasedCostSum.toLocaleString('en-PK')}
          </span>
        </div>

        {/* Total Cost */}
        <div className="rounded-2xl border border-[#00C4CC]/30 bg-[#0C1420] p-5 shadow-lg relative overflow-hidden">
          <div className="absolute right-4 top-4 text-2xl leading-none opacity-100 brightness-150">💰</div>
          <span className="text-xs font-bold text-[#00C4CC] uppercase tracking-wider block">
            Total Purchase Cost
          </span>
          <div className="mt-2 font-mono text-2xl sm:text-3xl font-black text-[#00C4CC]">
            PKR {(pendingCostSum + purchasedCostSum).toLocaleString('en-PK')}
          </div>
          <span className="text-xs text-slate-400 block font-medium mt-1">
            Across {purchases.length} total procurement items
          </span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#0C1420] p-3.5">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'pending', 'purchased'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider transition ${
                statusFilter === st
                  ? 'bg-gradient-to-r from-[#00C4CC] to-cyan-600 text-slate-950 shadow-md'
                  : 'bg-[#080D15] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st === 'all' ? 'All Records' : st}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Order # or Product..."
            className="flex-1 rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-1.5 text-xs text-silver-bright placeholder:text-slate-500 focus:border-[#00C4CC] focus:outline-none font-medium"
          />
          <button
            type="submit"
            className="rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:border-[#00C4CC] hover:text-white transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Purchases Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#0C1420] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080D15] text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Vendor</th>
                <th className="py-3.5 px-4">Purchase / Order #</th>
                <th className="py-3.5 px-4">Product Name</th>
                <th className="py-3.5 px-4 text-center">Qty</th>
                <th className="py-3.5 px-4 text-right">Wholesale Cost</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Payment</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-silver-bright">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading Voltix Mobile purchase records...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No vendor purchase records found. Click <strong>"New Vendor Purchase"</strong> to add one.
                  </td>
                </tr>
              ) : (
                purchases.map((p) => {
                  const lineTotal = (Number(p.wholesale_cost) || 0) * (Number(p.quantity) || 1);

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      {/* Vendor Logo & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-[#00C4CC]/40 bg-black/60 p-0.5">
                            <Image
                              src={profile.logo_url || '/images/logo.png'}
                              alt={profile.name}
                              fill
                              className="object-contain p-0.5"
                            />
                          </div>
                          <span className="font-bold text-white text-xs">{profile.name}</span>
                        </div>
                      </td>

                      {/* Related Order Number */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-[#00C4CC] bg-[#00C4CC]/10 border border-[#00C4CC]/30 px-2.5 py-0.5 rounded-md text-[11px]">
                          {p.status === 'pending' ? 'Pending' : p.purchase_number}
                        </span>
                        <span className="block mt-1 text-[10px] text-slate-500 font-mono">
                          {p.status === 'pending' ? 'Vendor ID will activate after purchase' : `Order: ${p.order_number}`}
                        </span>
                      </td>

                      {/* Product Name */}
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {p.product_name}
                        {p.notes && (
                          <span className="block text-[11px] font-normal text-slate-400 truncate max-w-xs">
                            📝 {p.notes}
                          </span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-4 text-center font-bold font-mono">
                        {p.quantity}
                      </td>

                      {/* Wholesale Cost */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold font-mono text-white text-sm">
                          PKR {lineTotal.toLocaleString('en-PK')}
                        </div>
                        {p.quantity > 1 && (
                          <span className="text-[10px] text-slate-400 block font-mono">
                            ({p.quantity} × PKR {p.wholesale_cost.toLocaleString('en-PK')})
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className={`rounded-full px-3 py-1 font-display text-[10px] font-extrabold uppercase tracking-wider border shadow-sm transition ${
                            p.status === 'purchased'
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
                              : 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/30 animate-pulse'
                          }`}
                          title="Click to toggle status"
                        >
                          {p.status === 'purchased' ? '✓ Purchased' : '⏳ Pending'}
                        </button>
                      </td>

                      {/* Payment */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase border ${
                          p.payment_status === 'paid'
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                            : p.payment_status === 'partial'
                              ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                              : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                        }`}>
                          {p.payment_status || 'unpaid'}
                        </span>
                        <span className="block mt-1 text-[10px] text-slate-500">{p.payment_method || 'cash'}</span>
                        {p.payment_due_date && (
                          <span className="mt-1 block text-[10px] font-semibold text-orange-300">Due: {p.payment_due_date}</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono whitespace-nowrap">
                        {p.purchase_date}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openWhatsApp(p)}
                            className="rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 p-1.5 text-[#25D366] hover:bg-[#25D366] hover:text-white transition text-xs"
                            title="Send vendor message on WhatsApp"
                          >
                            💬
                          </button>
                          <button
                            onClick={() => openEditModal(p)}
                            className="rounded-lg border border-slate-700 bg-[#080D15] p-1.5 text-slate-300 hover:border-[#00C4CC] hover:text-white transition text-xs"
                            title="Edit purchase record"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeletePurchase(p.id)}
                            className="rounded-lg border border-slate-700 bg-[#080D15] p-1.5 text-rose-400 hover:border-rose-500 transition text-xs"
                            title="Delete record"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT PURCHASE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setIsCreateOpen(false)} />

          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-[22px] border border-orange-400/45 bg-[#0b111b] text-[#C9D2DB] shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_40px_rgba(251,146,60,0.14)]">
            <div className="relative flex items-center justify-between overflow-hidden border-b border-orange-400/20 bg-[radial-gradient(circle_at_0%_0%,rgba(251,146,60,0.24),transparent_38%),linear-gradient(120deg,#25170d,#111827_65%)] px-5 pb-4 pt-5">
              <div className="absolute -right-8 -top-12 h-32 w-32 rounded-full border border-yellow-300/20" />
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-orange-400 bg-black/70 p-1 shadow-[0_0_18px_rgba(251,146,60,0.42)]">
                  <Image src={profile.logo_url || '/images/logo.png'} alt={profile.name} fill className="object-contain" sizes="48px" />
                </div>
                <div className="relative">
                  <span className="text-[10px] font-black text-yellow-300 uppercase tracking-[0.16em] block">
                    VENDOR: VOLTIX MOBILE
                  </span>
                  <h2 className="font-display text-lg font-black text-white">
                    {editingPurchase ? 'Edit Vendor Purchase Record' : 'New Vendor Purchase Record'}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="relative rounded-xl border border-orange-200/20 bg-black/20 p-2 text-slate-400 transition hover:border-yellow-300/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4 p-5 text-xs sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Auto-generated Vendor Purchase ID */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Vendor Purchase ID
                  </label>
                  <div className="w-full rounded-xl border border-yellow-300/70 bg-yellow-300/5 px-3 py-2 text-xs font-mono font-bold text-yellow-300">
                    {editingPurchase?.whatsapp_sent_at ? editingPurchase.purchase_number : 'Pending'}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">The ID is generated after the WhatsApp message is opened.</p>
                </div>

                {/* Purchase Status */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Purchase Status *
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e: any) => setFormStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs font-bold text-white focus:border-[#00C4CC] focus:outline-none"
                  >
                    <option value="pending">⏳ Pending (To Buy from Voltix)</option>
                    <option value="purchased">✅ Purchased & Received</option>
                  </select>
                </div>

              </div>

              {/* Product Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formProductName}
                  onChange={(e) => setFormProductName(e.target.value)}
                  placeholder="E.G. P9 Wireless Headphones"
                  className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs font-semibold text-white focus:border-[#00C4CC] focus:outline-none"
                />
                {storeProducts.length > 0 && (
                  <div className="mt-1 flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                    <span className="text-[10px] text-slate-500 shrink-0">Store Items:</span>
                    {storeProducts.slice(0, 4).map((sp) => (
                      <button
                        type="button"
                        key={sp.id}
                        onClick={() => {
                          setFormProductName(sp.name);
                          if (sp.wholesale_price) setFormWholesaleCost(sp.wholesale_price);
                        }}
                        className="text-[10px] font-medium text-[#00C4CC] hover:underline px-1 shrink-0 truncate max-w-[120px]"
                      >
                        {sp.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {/* Quantity */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs font-mono font-bold text-white focus:border-[#00C4CC] focus:outline-none"
                  />
                </div>

                {/* Payment Status */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Payment Status *
                  </label>
                  <select
                    value={formPaymentStatus}
                    onChange={(e) => setFormPaymentStatus(e.target.value as 'unpaid' | 'partial' | 'paid')}
                    className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs font-bold text-white focus:border-[#00C4CC] focus:outline-none"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial Payment</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs font-bold text-white focus:border-[#00C4CC] focus:outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="easypaisa">Easypaisa</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Payment Due Date */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-yellow-200 mb-1">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={formPaymentDueDate}
                    onChange={(e) => setFormPaymentDueDate(e.target.value)}
                    className="w-full rounded-xl border border-orange-400/50 bg-[#080D15] px-3 py-2 text-xs font-mono font-bold text-orange-300 focus:border-yellow-300 focus:outline-none"
                  />
                  <span className="mt-1 block text-[10px] text-slate-500">Date you plan to pay the balance</span>
                </div>

                {/* Amount Paid */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Amount Paid (PKR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formAmountPaid}
                    onChange={(e) => setFormAmountPaid(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:border-[#00C4CC] focus:outline-none"
                  />
                </div>

                {/* Wholesale Purchase Cost */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Wholesale Cost (PKR) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formWholesaleCost}
                    onChange={(e) => setFormWholesaleCost(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs font-mono font-bold text-[#00C4CC] focus:border-[#00C4CC] focus:outline-none"
                  />
                </div>

                {/* Purchase Date */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    value={formPurchaseDate}
                    onChange={(e) => setFormPurchaseDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs font-mono font-bold text-white focus:border-[#00C4CC] focus:outline-none"
                  />
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="flex items-center justify-between rounded-xl border border-orange-400/35 bg-[linear-gradient(100deg,rgba(251,146,60,0.14),rgba(253,224,71,0.07))] p-3 text-xs font-bold text-orange-300">
                <span>Total Voltix Purchase Cost:</span>
                <span className="font-mono text-sm font-black text-white">
                  PKR {(formQuantity * formWholesaleCost).toLocaleString('en-PK')}
                </span>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Notes / Supplier Specs (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="E.G. Black color model, deliver before 5 PM"
                  className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs text-white focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer rounded-xl bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-300 px-5 py-2 text-xs font-black text-slate-950 shadow-[0_8px_22px_rgba(251,146,60,0.22)] transition hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingPurchase ? 'Update Record' : 'Save Purchase Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WHATSAPP MESSAGE OPTIONS MODAL */}
      {whatsAppPurchase && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#02050a]/85 p-4 backdrop-blur-lg animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setWhatsAppPurchase(null)} />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[22px] border border-[#00AEEF]/45 bg-[#07101B] text-[#C9D2DB] shadow-[0_0_0_1px_rgba(0,174,239,0.08),0_24px_80px_rgba(0,0,0,0.7),0_0_42px_rgba(0,174,239,0.16)]">
            <div className="relative border-b border-[#1a4057] bg-[radial-gradient(circle_at_18%_0%,rgba(0,174,239,0.24),transparent_42%),linear-gradient(135deg,#0b2234,#07101b_70%)] px-5 pb-5 pt-5">
              <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full border border-[#00AEEF]/20" />
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[#00AEEF] bg-[#02050a] p-1 shadow-[0_0_18px_rgba(0,174,239,0.55)]">
                    <Image src={profile.logo_url || '/images/logo.png'} alt="STH Gadgets" fill className="object-contain" sizes="56px" />
                  </div>
                  <div>
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#36C5FF]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#25D366] shadow-[0_0_8px_#25D366]" /> WhatsApp dispatch
                    </span>
                    <h2 className="mt-1 font-display text-lg font-black tracking-wide text-white">Vendor message</h2>
                    <p className="mt-0.5 text-[11px] text-[#8fb6c9]">Voltix Mobile · choose a template</p>
                  </div>
                </div>
                <button onClick={() => setWhatsAppPurchase(null)} className="rounded-xl border border-white/10 bg-black/15 p-2 text-slate-400 transition hover:border-[#36C5FF]/50 hover:text-white" title="Close">
                ✕
                </button>
              </div>
              <div className="relative mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                <div className="min-w-0">
                  <span className="block truncate text-xs font-black text-white">{whatsAppPurchase.product_name}</span>
                  <span className="mt-0.5 block text-[10px] font-mono text-[#8fb6c9]">{whatsAppPurchase.purchase_number} · Qty {whatsAppPurchase.quantity}</span>
                </div>
                <span className="ml-3 shrink-0 rounded-full border border-[#00AEEF]/30 bg-[#00AEEF]/10 px-2 py-1 text-[10px] font-bold text-[#36C5FF]">PKR {(Number(whatsAppPurchase.wholesale_cost) * Number(whatsAppPurchase.quantity)).toLocaleString('en-PK')}</span>
              </div>
            </div>

            <div className="space-y-2.5 p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-300">Select purpose</span>
                <span className="text-[10px] text-slate-500">Message preview ready</span>
              </div>
              {([
                ['due_date', 'Payment Due Date', 'Tell the vendor when the remaining amount will be paid.', '📅'],
                ['partial_payment', 'Partial Payment', 'Send paid and remaining balance details.', '💳'],
                ['payment_confirmation', 'Payment Confirmation', 'Confirm the current payment record.', '✓'],
              ] as const).map(([value, label, description, icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setWhatsAppAction(value)}
                  className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${whatsAppAction === value ? 'border-[#00AEEF] bg-[linear-gradient(105deg,rgba(0,174,239,0.18),rgba(0,174,239,0.04))] shadow-[0_0_18px_rgba(0,174,239,0.12)]' : 'border-[#173447] bg-[#08131f] hover:border-[#00AEEF]/60 hover:bg-[#0b1d2b]'}`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${whatsAppAction === value ? 'bg-[#00AEEF]/20 text-[#36C5FF]' : 'bg-[#102638] text-slate-400 group-hover:text-[#36C5FF]'}`}>{icon}</span>
                  <span className="min-w-0 flex-1"><span className="block text-xs font-black text-white">{label}</span><span className="mt-0.5 block text-[11px] text-slate-400">{description}</span></span>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${whatsAppAction === value ? 'border-[#00AEEF] bg-[#00AEEF] text-[#021019]' : 'border-slate-600 text-transparent'}`}>✓</span>
                </button>
              ))}

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#173447] pt-4">
                <span className="text-[10px] leading-4 text-slate-500">The selected message will open in WhatsApp with details filled in.</span>
                <button type="button" onClick={() => setWhatsAppPurchase(null)} className="shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-400 hover:text-white">
                Cancel
                </button>
                <button type="button" onClick={sendWhatsAppMessage} className="flex shrink-0 items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-black text-white shadow-[0_8px_20px_rgba(37,211,102,0.2)] transition hover:bg-[#20BD5A] hover:shadow-[0_8px_26px_rgba(37,211,102,0.35)]">
                  <span className="text-base">↗</span> Open WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT VENDOR PROFILE MODAL WITH GALLERY LOGO UPLOAD */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setIsProfileOpen(false)} />

          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#00C4CC]/40 bg-gradient-to-b from-[#0F1C2D] via-[#0C1420] to-[#080D15] text-[#C9D2DB] p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🏬</span>
                <h2 className="font-display text-base font-black text-white">
                  Voltix Mobile Vendor Profile
                </h2>
              </div>
              <button
                onClick={() => setIsProfileOpen(false)}
                className="rounded-lg border border-slate-800 p-1 text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Vendor Name
                </label>
                <input
                  type="text"
                  disabled
                  value="Voltix Mobile"
                  className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-xs font-bold text-[#00C4CC] opacity-80 cursor-not-allowed"
                />
              </div>

              {/* Gallery Logo File Upload */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Vendor Logo (Upload from Device Gallery)
                </label>
                <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-800 bg-[#080D15]">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[#00C4CC]/40 bg-black/60 p-1">
                    <Image src={profLogoUrl || '/images/logo.png'} alt="Logo Preview" fill className="object-contain" sizes="48px" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="w-full rounded-xl border border-[#00C4CC] bg-[#00C4CC]/10 hover:bg-[#00C4CC] text-[#00C4CC] hover:text-slate-950 px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>📷</span>
                      <span>{uploadingLogo ? 'Uploading from Gallery...' : 'Upload Logo from Gallery'}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/avif"
                      className="hidden"
                      onChange={handleLogoFileUpload}
                    />
                    <input
                      type="text"
                      value={profLogoUrl}
                      onChange={(e) => setProfLogoUrl(e.target.value)}
                      placeholder="Or paste image URL / path..."
                      className="w-full rounded-lg border border-slate-800 bg-[#0C1420] px-2.5 py-1 text-[11px] font-mono text-slate-400 focus:border-[#00C4CC] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Phone / WhatsApp Number
                </label>
                <input
                  type="text"
                  value={profPhone}
                  onChange={(e) => setProfPhone(e.target.value)}
                  placeholder="+92 348 9593671"
                  className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs text-white focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={profEmail}
                  onChange={(e) => setProfEmail(e.target.value)}
                  placeholder="voltix@sthgadgets.com"
                  className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs text-white focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Vendor Address / Market Location
                </label>
                <input
                  type="text"
                  value={profAddress}
                  onChange={(e) => setProfAddress(e.target.value)}
                  placeholder="Mobile Market, Lahore"
                  className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs text-white focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Vendor Notes
                </label>
                <textarea
                  rows={2}
                  value={profNotes}
                  onChange={(e) => setProfNotes(e.target.value)}
                  placeholder="Primary supplier for chargers, earbuds & watches"
                  className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs text-white focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(false)}
                  className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-[#00C4CC] to-cyan-600 hover:brightness-110 px-5 py-2 text-xs font-black text-slate-950 shadow transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
