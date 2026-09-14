'use client';

import { useEffect, useState } from 'react';
import type { Coupon } from '@/types/database';
import { useToast } from '@/context/ToastContext';

// In-memory cache for instant module opening without blocking loading spinner
let cachedCoupons: Coupon[] | null = null;

export default function AdminCouponsPage() {
  const { success, error: showErrorToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>(cachedCoupons || []);
  const [loading, setLoading] = useState(!cachedCoupons);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minimumOrder, setMinimumOrder] = useState('0');
  const [maximumDiscount, setMaximumDiscount] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!cachedCoupons) {
      setLoading(true);
    }
    try {
      const res = await fetch('/api/coupons');
      const data = await res.json();
      if (data.coupons) {
        cachedCoupons = data.coupons;
        setCoupons(data.coupons);
      }
    } catch {
      showErrorToast('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setCode('');
    setDiscountType('percentage');
    setDiscountValue('');
    setMinimumOrder('0');
    setMaximumDiscount('');
    setExpiryDate('');
    setUsageLimit('');
    setActive(true);
    setShowForm(true);
  }

  function openEdit(c: Coupon) {
    setEditing(c);
    setCode(c.code);
    setDiscountType(c.discount_type);
    setDiscountValue(String(c.discount_value));
    setMinimumOrder(String(c.minimum_order));
    setMaximumDiscount(c.maximum_discount != null ? String(c.maximum_discount) : '');
    setExpiryDate(c.expiry_date ? c.expiry_date.slice(0, 10) : '');
    setUsageLimit(c.usage_limit != null ? String(c.usage_limit) : '');
    setActive(c.active);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      code,
      discount_type: discountType,
      discount_value: Number(discountValue),
      minimum_order: Number(minimumOrder || 0),
      maximum_discount: maximumDiscount ? Number(maximumDiscount) : null,
      expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
      usage_limit: usageLimit ? Number(usageLimit) : null,
      active,
    };

    try {
      const res = await fetch(editing ? `/api/coupons/${editing.id}` : '/api/coupons', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to save coupon');

      success(editing ? `Coupon ${code} updated successfully!` : `Coupon ${code} created successfully!`);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message);
      showErrorToast(err.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: Coupon) {
    try {
      const res = await fetch(`/api/coupons/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !c.active }),
      });
      if (res.ok) {
        success(`Coupon ${c.code} status updated!`);
        load();
      } else {
        showErrorToast('Failed to update coupon status');
      }
    } catch {
      showErrorToast('Failed to update coupon status');
    }
  }

  async function confirmDeleteCoupon() {
    if (!couponToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/coupons/${couponToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        success(`Coupon "${couponToDelete.code}" deleted successfully!`);
        setCoupons((prev) => {
          const next = prev.filter((c) => c.id !== couponToDelete.id);
          cachedCoupons = next;
          return next;
        });
        setCouponToDelete(null);
      } else {
        showErrorToast('Failed to delete coupon');
      }
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to delete coupon');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-silver-bright">
            Coupons Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-silver-dim">
            Create promotional discount codes for marketing campaigns
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] px-4 py-2.5 font-display text-xs sm:text-sm font-bold text-black shadow-[0_0_15px_rgba(0,196,204,0.3)] transition hover:scale-[1.02]"
        >
          <span>+</span>
          <span>Add New Coupon</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setShowForm(false)} />
          <form
            onSubmit={handleSubmit}
            className="relative z-10 w-full max-w-xl max-h-[92vh] overflow-y-auto space-y-4 rounded-2xl border border-cyan-500/40 bg-[#0C1420] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-display text-base font-bold text-silver-bright">
                {editing ? 'Edit Coupon' : 'Create New Coupon'}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-silver-dim hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-silver-dim">Coupon Code (Uppercase)</label>
                <input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().trim())}
                  placeholder="e.g. STH10"
                  className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm uppercase font-mono tracking-wider text-[#00C4CC] font-bold focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-silver-dim">Discount Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (Rs.)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-silver-dim">
                  Discount Value {discountType === 'percentage' ? '(%)' : '(Rs.)'}
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="10"
                  className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-silver-dim">Minimum Order (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  value={minimumOrder}
                  onChange={(e) => setMinimumOrder(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-silver-dim">Max Discount Cap (optional)</label>
                <input
                  type="number"
                  min="0"
                  value={maximumDiscount}
                  onChange={(e) => setMaximumDiscount(e.target.value)}
                  placeholder="500"
                  className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-silver-dim">Total Usage Limit (optional)</label>
                <input
                  type="number"
                  min="1"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder="100"
                  className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-silver-dim">Expiry Date (optional)</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="activeCoupon"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded accent-[#00C4CC]"
              />
              <label htmlFor="activeCoupon" className="text-xs sm:text-sm font-semibold text-silver-bright cursor-pointer">
                Active (Can be applied by customers)
              </label>
            </div>

            {error && <p className="text-xs text-rose-400 font-semibold">{error}</p>}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 font-display text-xs sm:text-sm text-silver-dim hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] px-5 py-2 font-display text-xs sm:text-sm font-bold text-black shadow-sm transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Coupon'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {couponToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setCouponToDelete(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-rose-500/40 bg-[#0C1420] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-xl text-rose-400">
                🗑️
              </span>
              <div>
                <h3 className="font-display text-base font-bold text-rose-300">
                  Delete Coupon Permanently
                </h3>
                <span className="font-mono text-xs text-[#00C4CC]">{couponToDelete.code}</span>
              </div>
            </div>

            <p className="text-xs text-silver-dim leading-relaxed">
              Are you sure you want to delete coupon <strong className="text-white font-mono">{couponToDelete.code}</strong>? Customers will no longer be able to use this discount code.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCouponToDelete(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-700 bg-[#080D15] px-4 py-2 text-xs font-semibold text-silver-bright hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCoupon}
                disabled={deleting}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coupons Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0C1420] shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-silver-dim gap-2">
            <span className="h-5 w-5 rounded-full border-2 border-[#00C4CC] border-t-transparent animate-spin"></span>
            <span className="text-sm">Loading coupons...</span>
          </div>
        ) : coupons.length === 0 ? (
          <div className="py-20 text-center text-silver-dim">
            <p className="text-base font-semibold text-silver-bright">No coupons created yet</p>
            <p className="mt-1 text-xs">Click "Add New Coupon" above to create promotional codes.</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (< md screens) */}
            <div className="divide-y divide-slate-800/80 md:hidden">
              {coupons.map((c) => (
                <div key={c.id} className="p-4 space-y-2.5 hover:bg-[#00C4CC]/5 transition">
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-[#00C4CC]/10 border border-[#00C4CC]/30 px-3 py-1 font-mono text-xs font-bold text-[#00C4CC]">
                      {c.code}
                    </span>
                    <button
                      onClick={() => toggleActive(c)}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ${
                        c.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {c.active ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-silver-dim">Discount:</span>
                      <strong className="text-silver-bright">
                        {c.discount_type === 'percentage' ? `${c.discount_value}%` : `Rs. ${c.discount_value}`}
                        {c.maximum_discount ? ` (Max Rs. ${c.maximum_discount})` : ''}
                      </strong>
                    </div>
                    <div className="flex justify-between text-silver-dim">
                      <span>Min Order:</span>
                      <span className="font-mono">Rs. {c.minimum_order.toLocaleString('en-PK')}</span>
                    </div>
                    <div className="flex justify-between text-silver-dim">
                      <span>Usage:</span>
                      <span className="font-mono">{c.times_used} / {c.usage_limit ? c.usage_limit : '∞'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60 text-xs">
                    <button
                      onClick={() => openEdit(c)}
                      className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-1 text-silver-bright hover:text-[#00C4CC] transition font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setCouponToDelete(c)}
                      className="rounded-lg border border-rose-900/60 bg-rose-950/20 px-3 py-1 text-rose-400 hover:bg-rose-900/40 transition font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= md screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-slate-800 bg-[#080D15]/60 text-silver-dim uppercase text-[11px] font-semibold tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Code</th>
                    <th className="px-5 py-3.5">Discount</th>
                    <th className="px-5 py-3.5">Min Order</th>
                    <th className="px-5 py-3.5">Usage</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {coupons.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/25 transition">
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-[#00C4CC]/10 border border-[#00C4CC]/30 px-3 py-1 font-mono text-xs font-bold text-[#00C4CC]">
                          {c.code}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-silver-bright">
                        {c.discount_type === 'percentage' ? `${c.discount_value}%` : `Rs. ${c.discount_value}`}
                        {c.maximum_discount ? ` (Max Rs. ${c.maximum_discount})` : ''}
                      </td>
                      <td className="px-5 py-4 text-silver-dim font-mono">
                        Rs. {c.minimum_order.toLocaleString('en-PK')}
                      </td>
                      <td className="px-5 py-4 text-silver-dim font-mono">
                        {c.times_used} / {c.usage_limit ? c.usage_limit : '∞'}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => toggleActive(c)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ${
                            c.active
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${c.active ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                          <span>{c.active ? 'Active' : 'Disabled'}</span>
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(c)}
                            className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-1 text-xs font-semibold text-silver-bright hover:border-[#00C4CC] hover:text-[#00C4CC] transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setCouponToDelete(c)}
                            className="rounded-lg border border-slate-800 bg-slate-800/20 px-3 py-1 text-xs font-semibold text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/10 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
