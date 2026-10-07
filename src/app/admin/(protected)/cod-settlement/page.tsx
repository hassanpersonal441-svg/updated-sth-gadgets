'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import type { Order } from '@/types/database';
import { useToast } from '@/context/ToastContext';
import { formatNumber } from '@/lib/utils';

type SettlementTab = 'all' | 'pending' | 'received';

const COUNTED_STATUSES = ['approved', 'processing', 'shipped', 'delivered'];

function isCodOrder(o: Order) {
  return o.payment_method === 'Cash on Delivery' || !o.payment_method;
}

function getReceived(o: Order) {
  return Number(o.settlement_amount_received) || 0;
}

function isSettled(o: Order) {
  return getReceived(o) > 0 || o.settlement_status === 'received' || o.settlement_status === 'reconciled';
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function CodSettlementPage() {
  const { success, error: showErrorToast, admin } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tab, setTab] = useState<SettlementTab>('pending');
  const [search, setSearch] = useState('');

  // Modal state
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [settlementDate, setSettlementDate] = useState<string>(todayStr());
  const [saving, setSaving] = useState(false);

  async function fetchOrders() {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/admin/orders', { headers: { 'Cache-Control': 'no-cache' } });
      const data = await res.json();
      if (!res.ok || !data.orders) throw new Error(data.error || 'Failed to load orders');
      setOrders(data.orders);
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  // Only COD orders that are actually going out / delivered
  const codOrders = useMemo(
    () => orders.filter((o) => isCodOrder(o) && COUNTED_STATUSES.includes(o.status)),
    [orders]
  );

  const filtered = useMemo(() => {
    return codOrders.filter((o) => {
      if (tab === 'pending' && isSettled(o)) return false;
      if (tab === 'received' && !isSettled(o)) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          (o.customer_name || '').toLowerCase().includes(q) ||
          (o.phone || '').toLowerCase().includes(q) ||
          (o.city || '').toLowerCase().includes(q) ||
          (o.order_number || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [codOrders, tab, search]);

  const stats = useMemo(() => {
    const settled = codOrders.filter(isSettled);
    const pending = codOrders.filter((o) => !isSettled(o));
    const expectedAll = codOrders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
    const expectedSettled = settled.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
    const received = settled.reduce((s, o) => s + getReceived(o), 0);
    return {
      expectedAll,
      received,
      deducted: Math.max(0, expectedSettled - received),
      waiting: pending.reduce((s, o) => s + (Number(o.total_amount) || 0), 0),
      pendingCount: pending.length,
      settledCount: settled.length,
    };
  }, [codOrders]);

  function openModal(order: Order) {
    setActiveOrder(order);
    const already = getReceived(order);
    setAmountReceived(already > 0 ? String(already) : '');
    setSettlementDate(
      order.settlement_date ? String(order.settlement_date).split('T')[0] : todayStr()
    );
  }

  function closeModal() {
    if (saving) return;
    setActiveOrder(null);
  }

  async function saveSettlement(reset = false) {
    if (!activeOrder) return;
    const amount = reset ? 0 : Math.max(0, parseFloat(amountReceived) || 0);
    if (!reset && amount <= 0) {
      showErrorToast('Please enter the amount received.');
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, any> = reset
        ? { settlement_amount_received: 0, settlement_status: 'pending', settlement_date: null }
        : {
            settlement_amount_received: amount,
            settlement_status: 'received',
            settlement_date: settlementDate || todayStr(),
          };

      const res = await fetch(`/api/admin/orders/${activeOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save settlement');

      setOrders((prev) => prev.map((o) => (o.id === data.order.id ? { ...o, ...data.order } : o)));
      if (reset) {
        admin(`Settlement for ${activeOrder.order_number || 'order'} reset to pending.`, 'Settlement Reset');
      } else {
        success(`Recorded PKR ${formatNumber(amount)} received for ${activeOrder.order_number || 'order'}.`);
      }
      setActiveOrder(null);
    } catch (err: any) {
      showErrorToast(err.message || 'Error saving settlement');
    } finally {
      setSaving(false);
    }
  }

  const modalExpected = activeOrder ? Number(activeOrder.total_amount) || 0 : 0;
  const modalReceived = Math.max(0, parseFloat(amountReceived) || 0);
  const modalDiff = modalExpected - modalReceived;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="font-display text-2xl font-black text-silver-bright sm:text-3xl">COD Settlement</h1>
          <p className="mt-1 text-xs sm:text-sm text-silver-dim">
            Courier se jitni amount mili, order select karke record karein. Profit khud adjust ho jayega.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#0C1420] px-3.5 py-2 text-xs font-semibold text-silver-bright hover:border-[#00C4CC] hover:text-[#00C4CC] transition shadow-sm"
        >
          <span className={loading ? 'animate-spin' : ''}>↻</span>
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-4">
          <span className="text-xs text-silver-dim">Total COD Expected</span>
          <div className="mt-1 font-display text-lg sm:text-2xl font-black text-silver-bright">
            PKR {stats.expectedAll.toLocaleString('en-PK')}
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <span className="text-xs text-emerald-400 font-semibold">Actual Received ({stats.settledCount})</span>
          <div className="mt-1 font-display text-lg sm:text-2xl font-black text-emerald-300">
            PKR {stats.received.toLocaleString('en-PK')}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <span className="text-xs text-amber-400 font-semibold">Waiting from Courier ({stats.pendingCount})</span>
          <div className="mt-1 font-display text-lg sm:text-2xl font-black text-amber-300">
            PKR {stats.waiting.toLocaleString('en-PK')}
          </div>
        </div>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
          <span className="text-xs text-rose-400 font-semibold">Deducted by Courier</span>
          <div className="mt-1 font-display text-lg sm:text-2xl font-black text-rose-300">
            PKR {stats.deducted.toLocaleString('en-PK')}
          </div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5">
          {([
            { id: 'pending', label: `Pending (${stats.pendingCount})` },
            { id: 'received', label: `Received (${stats.settledCount})` },
            { id: 'all', label: 'All COD Orders' },
          ] as { id: SettlementTab; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                tab === t.id
                  ? 'bg-[#00C4CC] text-black font-bold shadow-sm'
                  : 'border border-slate-800 bg-[#0C1420] text-silver-dim hover:text-silver-bright hover:border-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer, phone, STH #..."
          className="w-full sm:w-72 rounded-xl border border-slate-800 bg-[#080D15] px-3.5 py-2 text-xs text-silver-bright placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none"
        />
      </div>

      {/* List */}
      <div className="rounded-2xl border border-slate-800 bg-[#0C1420] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-silver-dim flex flex-col items-center gap-2">
            <span className="h-6 w-6 rounded-full border-2 border-[#00C4CC] border-t-transparent animate-spin"></span>
            <span className="font-semibold text-slate-300">Loading orders...</span>
          </div>
        ) : fetchError ? (
          <div className="py-16 text-center text-xs text-rose-300">{fetchError}</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-xs text-silver-dim">No COD orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-[#070D18] text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">Order #</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Expected</th>
                  <th className="px-4 py-3.5">Received</th>
                  <th className="px-4 py-3.5">Difference</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filtered.map((o) => {
                  const expected = Number(o.total_amount) || 0;
                  const received = getReceived(o);
                  const settled = isSettled(o);
                  const diff = expected - received;
                  return (
                    <tr
                      key={o.id}
                      onClick={() => openModal(o)}
                      className="cursor-pointer hover:bg-[#0E1A2C] transition-colors"
                    >
                      <td className="px-4 py-3.5 font-mono">
                        <span className="inline-flex rounded-lg bg-[#00C4CC]/10 px-2.5 py-1 text-xs font-bold text-[#00C4CC] border border-[#00C4CC]/25">
                          {o.order_number || 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-silver-bright">{o.customer_name}</div>
                        <div className="text-[11px] text-silver-dim">
                          {o.city} • {o.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-silver-bright">
                        PKR {formatNumber(expected)}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-emerald-400">
                        {settled ? `PKR ${formatNumber(received)}` : '—'}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold">
                        {settled ? (
                          <span className={diff > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                            {diff > 0 ? '-' : ''}PKR {formatNumber(Math.abs(diff))}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {settled ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Received
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(o);
                          }}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                            settled
                              ? 'border border-slate-700 text-silver-bright hover:border-[#00C4CC] hover:text-[#00C4CC]'
                              : 'bg-[#00C4CC] hover:bg-[#00B2B9] text-black'
                          }`}
                        >
                          {settled ? 'Edit' : 'Record Payment'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settlement Modal */}
      {activeOrder && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0C1420] p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-black text-silver-bright">Record COD Payment</h3>
                <p className="text-xs text-silver-dim mt-0.5">
                  <span className="font-mono text-[#00C4CC] font-bold">{activeOrder.order_number || 'Order'}</span> •{' '}
                  {activeOrder.customer_name} • {activeOrder.city}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-white text-lg leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#080D15] p-3 flex items-center justify-between">
              <span className="text-xs text-silver-dim">Expected COD Amount</span>
              <span className="font-mono font-black text-silver-bright">PKR {formatNumber(modalExpected)}</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-emerald-400 mb-1">
                Actual Amount Received (PKR)
              </label>
              <input
                type="number"
                min={0}
                autoFocus
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveSettlement(false);
                }}
                placeholder={String(modalExpected)}
                className="w-full rounded-lg border border-emerald-500/40 bg-[#0C1420] px-3 py-2.5 font-mono text-base font-bold text-emerald-400 focus:border-emerald-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setAmountReceived(String(modalExpected))}
                className="mt-1.5 text-[11px] text-[#00C4CC] hover:underline"
              >
                Full amount mili (PKR {formatNumber(modalExpected)})
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-silver-dim mb-1">Settlement Date</label>
              <input
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-[#0C1420] px-3 py-2 text-xs text-silver-bright focus:border-[#00C4CC] focus:outline-none"
              />
            </div>

            {modalReceived > 0 && (
              <div
                className={`rounded-xl border p-3 text-xs flex items-center justify-between ${
                  modalDiff > 0
                    ? 'border-rose-500/30 bg-rose-500/5 text-rose-300'
                    : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
                }`}
              >
                <span className="font-semibold">
                  {modalDiff > 0 ? 'Courier deduction (profit se minus)' : modalDiff < 0 ? 'Extra received' : 'No deduction'}
                </span>
                <span className="font-mono font-black">
                  {modalDiff > 0 ? '-' : modalDiff < 0 ? '+' : ''}PKR {formatNumber(Math.abs(modalDiff))}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              {isSettled(activeOrder) ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveSettlement(true)}
                  className="rounded-xl border border-rose-900/80 bg-rose-950/30 hover:bg-rose-900/50 px-3 py-2 text-xs font-semibold text-rose-300 transition disabled:opacity-50"
                >
                  Reset to Pending
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-silver-bright hover:border-slate-500 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveSettlement(false)}
                  disabled={saving}
                  className="rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] px-5 py-2 text-xs font-black text-black transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
