'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import InvoiceView from '@/components/admin/InvoiceView';
import type { Invoice, Settings } from '@/types/database';

export default function AdminInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Fetch invoice
        const invRes = await fetch(`/api/admin/invoices/${id}`);
        if (!invRes.ok) {
          setError('Invoice not found');
          setLoading(false);
          return;
        }
        const invData = await invRes.json();
        setInvoice(invData.invoice);

        // Fetch settings for logo & business info
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: setts } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
        if (setts) setSettings(setts as Settings);
      } catch (err: any) {
        console.error('Invoice detail error:', err);
        setError('Failed to load invoice details');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="py-24 text-center text-silver-dim">
        <span className="inline-block animate-pulse text-sm">⏳ Loading invoice details...</span>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-rose-400 font-bold text-sm">{error || 'Invoice not found'}</p>
        <Link
          href="/admin/invoices"
          className="inline-block px-4 py-2 bg-slate-800 rounded-xl text-xs text-white hover:bg-slate-700"
        >
          ← Return to Invoices List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#C9D2DB] pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <Link href="/admin/invoices" className="text-xs text-silver-dim hover:text-white mb-1 block">
            ← Back to Invoices List
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-white uppercase font-display">
              {invoice.invoice_number || `STH-INV-${invoice.id.slice(0, 8).toUpperCase()}`}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/invoices/${invoice.id}/edit`}
            className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white hover:bg-slate-700"
          >
            ✏️ Edit Invoice
          </Link>
          <Link
            href={`/invoice/${invoice.invoice_number || invoice.id}`}
            target="_blank"
            className="px-4 py-2 rounded-xl bg-[#00C4CC]/10 border border-[#00C4CC]/30 text-xs font-bold text-[#00C4CC] hover:bg-[#00C4CC]/20"
          >
            🔗 Customer Link
          </Link>
        </div>
      </div>

      {/* Shared Invoice Printable View Component */}
      <InvoiceView
        invoice={invoice}
        settings={settings}
        onEdit={() => router.push(`/admin/invoices/${invoice.id}/edit`)}
        showActions={true}
      />
    </div>
  );
}
