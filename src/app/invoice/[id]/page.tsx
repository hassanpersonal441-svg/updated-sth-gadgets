import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicClient } from '@/lib/supabase/server';
import { getSettings } from '@/lib/data';
import InvoiceView from '@/components/admin/InvoiceView';
import type { Invoice } from '@/types/database';

interface PublicInvoicePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PublicInvoicePageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Invoice ${id} — STH Gadgets`,
    description: `Official digital invoice from STH Gadgets for invoice ${id}.`,
  };
}

export default async function PublicInvoicePage({ params }: PublicInvoicePageProps) {
  const { id } = await params;
  const supabase = getPublicClient();

  let query = supabase.from('invoices').select('*, invoice_items(*)');

  if (id.startsWith('STH-INV-')) {
    query = query.eq('invoice_number', id);
  } else {
    query = query.eq('id', id);
  }

  const { data: invoice } = await query.maybeSingle();

  if (!invoice) {
    notFound();
  }

  const settings = await getSettings();

  const typedInvoice = invoice as unknown as Invoice;

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Simple Customer Header (No admin links or sidebars) */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 text-white">
          <div className="flex items-center gap-3">
            <span className="font-display font-black text-lg tracking-wider text-[#00C4CC] uppercase">
              STH Gadgets
            </span>
            <span className="text-xs text-slate-400">| Customer Invoice Portal</span>
          </div>

          <span className="font-mono text-xs font-bold text-slate-300">
            {typedInvoice.invoice_number}
          </span>
        </div>

        {/* Invoice Printable View */}
        <InvoiceView
          invoice={typedInvoice}
          settings={settings}
          showActions={true}
        />
      </div>
    </div>
  );
}
