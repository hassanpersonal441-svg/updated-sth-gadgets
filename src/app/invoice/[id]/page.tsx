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

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  let query = supabase.from('invoices').select('*, invoice_items(*)');

  if (isUuid) {
    query = query.eq('id', id);
  } else {
    const invVariant = id.startsWith('STH-') && !id.startsWith('STH-INV-') ? id.replace('STH-', 'STH-INV-') : id;
    query = query.or(`invoice_number.ilike.${id},invoice_number.ilike.${invVariant},notes.ilike.%${id}%`);
  }

  let { data: invoice } = await query.maybeSingle();

  // If not found in invoices, fallback to orders table
  if (!invoice) {
    let orderQuery = supabase.from('orders').select('*, order_items(*)');
    if (isUuid) {
      orderQuery = orderQuery.eq('id', id);
    } else {
      orderQuery = orderQuery.ilike('order_number', id);
    }
    const { data: orderData } = await orderQuery.maybeSingle();
    const order: any = orderData;

    if (order) {
      const invNum = order.order_number 
        ? order.order_number.replace(/^STH-/i, 'STH-INV-') 
        : `STH-INV-${order.id.slice(0, 8).toUpperCase()}`;

      invoice = {
        id: order.id,
        invoice_number: invNum,
        customer_name: order.customer_name,
        customer_phone: order.phone,
        customer_whatsapp: order.phone,
        customer_address: order.address,
        customer_city: order.city,
        invoice_date: order.created_at,
        subtotal: order.subtotal || order.total_amount,
        coupon_discount: (order.coupon_discount || 0) + (order.bundle_discount || 0),
        delivery_charges: order.delivery_charges || 0,
        actual_courier_cost: order.actual_courier_cost || 0,
        delivery_paid_by: order.delivery_paid_by || 'customer',
        grand_total: order.total_amount,
        payment_method: order.payment_method || 'Cash on Delivery',
        payment_status: order.payment_status === 'paid' ? 'Paid' : 'Unpaid',
        invoice_status: 'Confirmed',
        amount_paid: order.payment_status === 'paid' ? order.total_amount : (order.amount_paid || 0),
        remaining_amount: order.payment_status === 'paid' ? 0 : Math.max(0, order.total_amount - (order.amount_paid || 0)),
        notes: `Order ${order.order_number || order.id}`,
        invoice_items: (order.order_items || []).map((it: any) => ({
          product_name: it.product_name + (it.variant_name ? ` (${it.variant_name})` : ''),
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount: 0,
          total: it.line_total,
        })),
      } as any;
    }
  }

  if (!invoice) {
    notFound();
  }

  const settings = await getSettings();

  const typedInvoice = invoice as unknown as Invoice;
  const displayInvoiceNumber = typedInvoice.invoice_number || `STH-INV-${typedInvoice.id.slice(0, 8).toUpperCase()}`;

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
            {displayInvoiceNumber}
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
