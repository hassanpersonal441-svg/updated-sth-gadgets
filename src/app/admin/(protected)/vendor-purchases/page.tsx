'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { VendorProfile, VendorPurchase } from '@/types/database';
import { useToast } from '@/context/ToastContext';

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

  // Form State
  const [formOrderNumber, setFormOrderNumber] = useState('');
  const [formProductName, setFormProductName] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formWholesaleCost, setFormWholesaleCost] = useState(0);
  const [formStatus, setFormStatus] = useState<'pending' | 'purchased'>('pending');
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

    // Fetch store products & orders for suggestions
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => {
        if (d.products) setStoreProducts(d.products);
      })
      .catch(() => {});

    fetch('/api/admin/orders')
      .then((r) => r.json())
      .then((d) => {
        if (d.orders) setRecentOrders(d.orders.filter((o: any) => o.order_number));
      })
      .catch(() => {});
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
    setFormPurchaseDate(new Date().toISOString().split('T')[0]);
    setFormNotes('');
    setEditingPurchase(null);
  }

  function openCreateModal() {
    resetForm();
    setIsCreateOpen(true);
  }

  function openEditModal(p: VendorPurchase) {
    setEditingPurchase(p);
    setFormOrderNumber(p.order_number);
    setFormProductName(p.product_name);
    setFormQuantity(p.quantity);
    setFormWholesaleCost(p.wholesale_cost);
    setFormStatus(p.status);
    setFormPurchaseDate(p.purchase_date);
    setFormNotes(p.notes || '');
    setIsCreateOpen(true);
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
          <div className="absolute right-3 top-3 text-3xl opacity-10">⏳</div>
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
          <div className="absolute right-3 top-3 text-3xl opacity-10">✅</div>
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
          <div className="absolute right-3 top-3 text-3xl opacity-10">💰</div>
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
                <th className="py-3.5 px-4">Order #</th>
                <th className="py-3.5 px-4">Product Name</th>
                <th className="py-3.5 px-4 text-center">Qty</th>
                <th className="py-3.5 px-4 text-right">Wholesale Cost</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-silver-bright">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading Voltix Mobile purchase records...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
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
                          {p.order_number}
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

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono whitespace-nowrap">
                        {p.purchase_date}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
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

          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-[#00C4CC]/40 bg-gradient-to-b from-[#0F1C2D] via-[#0C1420] to-[#080D15] text-[#C9D2DB] p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[#00C4CC]/40 bg-black/60 p-0.5">
                  <Image src={profile.logo_url || '/images/logo.png'} alt={profile.name} fill className="object-contain" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#00C4CC] uppercase tracking-wider block">
                    VENDOR: VOLTIX MOBILE
                  </span>
                  <h2 className="font-display text-base font-black text-white">
                    {editingPurchase ? 'Edit Vendor Purchase Record' : 'New Vendor Purchase Record'}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg border border-slate-800 p-1 text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Related Order Number */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Related Order # *
                  </label>
                  <input
                    type="text"
                    value={formOrderNumber}
                    onChange={(e) => setFormOrderNumber(e.target.value.toUpperCase())}
                    placeholder="E.G. STH-1050"
                    className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs font-mono font-bold text-[#00C4CC] focus:border-[#00C4CC] focus:outline-none"
                  />
                  {recentOrders.length > 0 && (
                    <div className="mt-1 flex items-center gap-1 overflow-x-auto scrollbar-none">
                      <span className="text-[10px] text-slate-500">Quick:</span>
                      {recentOrders.slice(0, 3).map((o) => (
                        <button
                          type="button"
                          key={o.id}
                          onClick={() => setFormOrderNumber(o.order_number)}
                          className="text-[10px] font-mono text-[#00C4CC] hover:underline px-1 py-0.2"
                        >
                          {o.order_number}
                        </button>
                      ))}
                    </div>
                  )}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <div className="rounded-xl border border-[#00C4CC]/30 bg-[#00C4CC]/10 p-3 flex items-center justify-between text-xs font-bold text-[#00C4CC]">
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
                  className="rounded-xl bg-gradient-to-r from-[#00C4CC] to-cyan-600 hover:brightness-110 px-5 py-2 text-xs font-black text-slate-950 shadow transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingPurchase ? 'Update Record' : 'Save Purchase Record'}
                </button>
              </div>
            </form>
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
                    <Image src={profLogoUrl || '/images/logo.png'} alt="Logo Preview" fill className="object-contain" />
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
