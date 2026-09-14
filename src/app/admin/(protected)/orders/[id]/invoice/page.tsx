'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Order, Settings } from '@/types/database';
import InvoiceComponent from '@/components/admin/InvoiceComponent';

export default function AdminOrderInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!orderId) return;

    Promise.all([
      fetch(`/api/admin/orders/${orderId}`).then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ])
      .then(([orderRes, settingsRes]) => {
        if (orderRes.order) {
          setOrder(orderRes.order);
        } else {
          setErrorMsg(orderRes.error || 'Order not found');
        }

        if (settingsRes.settings) {
          setSettings(settingsRes.settings);
        }
      })
      .catch((err) => {
        setErrorMsg('Failed to load order invoice details.');
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-silver-dim gap-3">
        <span className="h-8 w-8 rounded-full border-3 border-[#00C4CC] border-t-transparent animate-spin"></span>
        <p className="text-sm font-semibold">Generating invoice document...</p>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="max-w-md mx-auto my-12 text-center space-y-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-400">
        <span className="text-3xl">⚠️</span>
        <h2 className="font-display text-lg font-bold">Invoice Not Found</h2>
        <p className="text-xs text-silver-dim">{errorMsg || 'The requested order could not be loaded.'}</p>
        <Link
          href="/admin/orders"
          className="inline-block rounded-xl bg-[#00C4CC] px-4 py-2 text-xs font-bold text-black hover:bg-[#00B2B9] transition"
        >
          ← Back to Orders List
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-4">
      <div className="no-print flex items-center justify-between">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#00C4CC] hover:underline"
        >
          <span>← Back to Orders List</span>
        </Link>
      </div>

      <InvoiceComponent order={order} settings={settings} showActions={true} />
    </div>
  );
}
