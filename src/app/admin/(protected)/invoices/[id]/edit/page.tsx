'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import InvoiceView from '@/components/admin/InvoiceView';
import type { Product, Coupon, Invoice, InvoicePaymentMethod, InvoicePaymentStatus, InvoiceStatus } from '@/types/database';

interface InvoiceFormItem {
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

export default function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const [productSearch, setProductSearch] = useState('');

  // Customer State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');

  // Invoice Dates
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Invoice Items
  const [items, setItems] = useState<InvoiceFormItem[]>([]);

  // Delivery & Coupon
  const [deliveryCharges, setDeliveryCharges] = useState<number>(0);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');

  // Payment Details
  const [paymentMethod, setPaymentMethod] = useState<InvoicePaymentMethod>('Cash on Delivery');
  const [paymentStatus, setPaymentStatus] = useState<InvoicePaymentStatus>('Unpaid');
  const [amountPaid, setAmountPaid] = useState<number>(0);

  // Status & Notes
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>('Draft');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');

  // Tab mode: 'form' vs 'preview'
  const [viewMode, setViewMode] = useState<'form' | 'preview'>('form');

  // Load existing invoice and products/coupons
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        // Load products
        const { data: prods } = await supabase
          .from('products')
          .select('*, product_images(*)')
          .eq('active', true)
          .order('name');
        if (prods) setProducts(prods as unknown as Product[]);

        // Load coupons
        const { data: cps } = await supabase
          .from('coupons')
          .select('*')
          .eq('active', true);
        if (cps) setCoupons(cps as Coupon[]);

        // Load invoice details
        const res = await fetch(`/api/admin/invoices/${id}`);
        if (res.ok) {
          const data = await res.json();
          const inv: Invoice = data.invoice;

          setInvoiceNumber(inv.invoice_number);
          setCustomerName(inv.customer_name);
          setCustomerPhone(inv.customer_phone);
          setCustomerWhatsapp(inv.customer_whatsapp || inv.customer_phone);
          setCustomerEmail(inv.customer_email || '');
          setCustomerAddress(inv.customer_address);
          setCustomerCity(inv.customer_city);

          if (inv.invoice_date) {
            setInvoiceDate(new Date(inv.invoice_date).toISOString().split('T')[0]);
          }
          if (inv.due_date) {
            setDueDate(new Date(inv.due_date).toISOString().split('T')[0]);
          }

          setDeliveryCharges(Number(inv.delivery_charges || 0));
          setCouponCode(inv.coupon_code || '');
          setPaymentMethod(inv.payment_method);
          setPaymentStatus(inv.payment_status);
          setAmountPaid(Number(inv.amount_paid || 0));
          setInvoiceStatus(inv.invoice_status);
          setNotes(inv.notes || '');
          setTerms(inv.terms || '');

          if (inv.invoice_items && inv.invoice_items.length > 0) {
            const mappedItems: InvoiceFormItem[] = inv.invoice_items.map((it) => ({
              product_id: it.product_id || null,
              product_name: it.product_name,
              product_image: it.product_image || null,
              quantity: it.quantity,
              unit_price: Number(it.unit_price),
              discount: Number(it.discount),
              total: Number(it.total),
            }));
            setItems(mappedItems);
          }
        }
      } catch (err) {
        console.error('Edit invoice load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  const handleAddProduct = (prod: Product) => {
    const primaryImg = prod.product_images?.find((i) => i.is_primary)?.image_url || prod.product_images?.[0]?.image_url || null;

    const newItem: InvoiceFormItem = {
      product_id: prod.id,
      product_name: prod.name,
      product_image: primaryImg,
      quantity: 1,
      unit_price: Number(prod.price || 0),
      discount: 0,
      total: Number(prod.price || 0),
    };

    setItems((prev) => [...prev, newItem]);
    setProductSearch('');
  };

  const handleUpdateItem = (index: number, field: keyof InvoiceFormItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };

      const qty = Math.max(1, parseInt(item.quantity as any) || 1);
      const unitPrice = Math.max(0, parseFloat(item.unit_price as any) || 0);
      const discount = Math.max(0, parseFloat(item.discount as any) || 0);

      item.quantity = qty;
      item.unit_price = unitPrice;
      item.discount = discount;
      item.total = Math.max(0, (unitPrice * qty) - discount);

      copy[index] = item;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  }, [items]);

  const itemDiscountTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.discount, 0);
  }, [items]);

  const handleApplyCoupon = () => {
    setCouponError('');
    if (!couponCode.trim()) {
      setAppliedCoupon(null);
      return;
    }

    const code = couponCode.trim().toUpperCase();
    const found = coupons.find((c) => c.code.toUpperCase() === code && c.active);

    if (!found) {
      setCouponError('Invalid or expired coupon code');
      setAppliedCoupon(null);
      return;
    }

    const effectiveSubtotal = subtotal - itemDiscountTotal;
    if (effectiveSubtotal < (found.minimum_order || 0)) {
      setCouponError(`Minimum order amount of Rs. ${found.minimum_order} required for this coupon`);
      setAppliedCoupon(null);
      return;
    }

    setAppliedCoupon(found);
  };

  const couponDiscountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const effectiveSubtotal = subtotal - itemDiscountTotal;
    if (effectiveSubtotal <= 0) return 0;

    if (appliedCoupon.discount_type === 'percentage') {
      let calc = (effectiveSubtotal * appliedCoupon.discount_value) / 100;
      if (appliedCoupon.maximum_discount && appliedCoupon.maximum_discount > 0) {
        calc = Math.min(calc, appliedCoupon.maximum_discount);
      }
      return calc;
    } else {
      return Math.min(appliedCoupon.discount_value, effectiveSubtotal);
    }
  }, [appliedCoupon, subtotal, itemDiscountTotal]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - itemDiscountTotal - couponDiscountAmount + Number(deliveryCharges || 0));
  }, [subtotal, itemDiscountTotal, couponDiscountAmount, deliveryCharges]);

  const remainingAmount = useMemo(() => {
    return Math.max(0, grandTotal - Number(amountPaid || 0));
  }, [grandTotal, amountPaid]);

  const previewInvoice: Invoice = useMemo(() => {
    return {
      id,
      invoice_number: invoiceNumber || 'STH-INV-EDIT',
      customer_name: customerName || 'Customer Name',
      customer_phone: customerPhone || 'Phone Number',
      customer_whatsapp: customerWhatsapp || customerPhone,
      customer_email: customerEmail,
      customer_address: customerAddress || 'Customer Address',
      customer_city: customerCity || 'City',
      invoice_date: invoiceDate,
      due_date: dueDate || null,
      subtotal,
      item_discount: itemDiscountTotal,
      coupon_discount: couponDiscountAmount,
      delivery_charges: deliveryCharges,
      grand_total: grandTotal,
      coupon_code: appliedCoupon?.code || couponCode || null,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      amount_paid: amountPaid,
      remaining_amount: remainingAmount,
      invoice_status: invoiceStatus,
      notes,
      terms,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      invoice_items: items,
    };
  }, [
    id,
    invoiceNumber,
    customerName,
    customerPhone,
    customerWhatsapp,
    customerEmail,
    customerAddress,
    customerCity,
    invoiceDate,
    dueDate,
    subtotal,
    itemDiscountTotal,
    couponDiscountAmount,
    deliveryCharges,
    grandTotal,
    appliedCoupon,
    couponCode,
    paymentMethod,
    paymentStatus,
    amountPaid,
    remainingAmount,
    invoiceStatus,
    notes,
    terms,
    items,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) return alert('Please enter Customer Name');
    if (!customerPhone.trim()) return alert('Please enter Customer Phone Number');
    if (!customerAddress.trim()) return alert('Please enter Customer Address');
    if (!customerCity.trim()) return alert('Please enter Customer City');
    if (items.length === 0) return alert('Please add at least one product item');

    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_whatsapp: customerWhatsapp || customerPhone,
          customer_email: customerEmail,
          customer_address: customerAddress,
          customer_city: customerCity,
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          delivery_charges: deliveryCharges,
          coupon_code: appliedCoupon?.code || couponCode || null,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          amount_paid: amountPaid,
          invoice_status: invoiceStatus,
          notes,
          terms,
          items,
        }),
      });

      const data = await res.json();
      if (res.ok && data.invoice) {
        alert(`Invoice ${data.invoice.invoice_number} updated successfully!`);
        router.push(`/admin/invoices/${data.invoice.id}`);
      } else {
        alert(`Failed to update invoice: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Update invoice error:', err);
      alert('Network or server error while updating invoice');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-silver-dim">
        <span className="inline-block animate-pulse text-sm">⏳ Loading invoice data for editing...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#C9D2DB] pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <Link href={`/admin/invoices/${id}`} className="text-xs text-silver-dim hover:text-white">
            ← Cancel & Return to Invoice
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase font-display mt-1">
            Edit Invoice: <span className="text-[#00C4CC] font-mono">{invoiceNumber}</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 bg-[#0C1420] p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('form')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              viewMode === 'form'
                ? 'bg-[#00C4CC] text-black shadow'
                : 'text-silver-dim hover:text-white'
            }`}
          >
            ✏️ Form Builder
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              viewMode === 'preview'
                ? 'bg-[#00C4CC] text-black shadow'
                : 'text-silver-dim hover:text-white'
            }`}
          >
            👁️ Preview Changes
          </button>
        </div>
      </div>

      {viewMode === 'preview' ? (
        <div className="space-y-4">
          <InvoiceView invoice={previewInvoice} showActions={false} />
          <div className="flex justify-end gap-3 max-w-4xl mx-auto">
            <button
              type="button"
              onClick={() => setViewMode('form')}
              className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-bold text-white hover:bg-slate-700"
            >
              ← Return to Form
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00C4CC] to-cyan-600 text-xs font-bold text-black hover:brightness-110 shadow-lg disabled:opacity-50"
            >
              {submitting ? 'Saving...' : '💾 Update Invoice'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Details */}
          <div className="rounded-2xl border border-slate-800/80 bg-[#0C1420] p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#00C4CC] border-b border-slate-800 pb-2">
              1. Customer Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-silver-dim mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-silver-dim mb-1">Customer Phone *</label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-silver-dim mb-1">WhatsApp Number</label>
                <input
                  type="text"
                  value={customerWhatsapp}
                  onChange={(e) => setCustomerWhatsapp(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-silver-dim mb-1">Customer Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-silver-dim mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-silver-dim mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white focus:border-[#00C4CC] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <label className="block font-bold text-silver-dim mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-silver-dim mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white focus:border-[#00C4CC] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="rounded-2xl border border-slate-800/80 bg-[#0C1420] p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#00C4CC] border-b border-slate-800 pb-2">
              2. Invoice Items
            </h2>

            {/* Product Lookup */}
            <div className="relative space-y-2">
              <label className="block text-xs font-bold text-silver-dim">
                Add More Products from Database
              </label>
              <input
                type="text"
                placeholder="Search product..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2.5 text-xs text-white focus:border-[#00C4CC] focus:outline-none"
              />

              {productSearch.trim() && (
                <div className="absolute z-20 w-full max-h-60 overflow-y-auto rounded-xl border border-slate-700 bg-[#080D15] shadow-2xl divide-y divide-slate-800">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddProduct(p)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-[#121D2D] transition"
                    >
                      <span className="text-xs font-bold text-white">{p.name}</span>
                      <span className="font-mono text-xs font-bold text-[#00C4CC]">
                        Rs. {p.price.toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#080D15]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-[#0C1420] font-bold text-silver-bright uppercase text-[11px]">
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3 text-center w-24">Qty</th>
                    <th className="p-3 text-right w-32">Unit Price (Rs.)</th>
                    <th className="p-3 text-right w-28">Discount (Rs.)</th>
                    <th className="p-3 text-right w-32">Line Total</th>
                    <th className="p-3 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#0E1624]">
                      <td className="p-3 font-bold text-white">
                        <input
                          type="text"
                          value={item.product_name}
                          onChange={(e) => handleUpdateItem(idx, 'product_name', e.target.value)}
                          className="w-full rounded border border-slate-800 bg-transparent px-2 py-1 text-white text-xs focus:border-[#00C4CC] focus:outline-none"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                          className="w-full text-center rounded border border-slate-800 bg-[#0C1420] px-2 py-1 text-white font-mono focus:border-[#00C4CC] focus:outline-none"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min={0}
                          value={item.unit_price}
                          onChange={(e) => handleUpdateItem(idx, 'unit_price', e.target.value)}
                          className="w-full text-right rounded border border-slate-800 bg-[#0C1420] px-2 py-1 text-white font-mono focus:border-[#00C4CC] focus:outline-none"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min={0}
                          value={item.discount}
                          onChange={(e) => handleUpdateItem(idx, 'discount', e.target.value)}
                          className="w-full text-right rounded border border-slate-800 bg-[#0C1420] px-2 py-1 text-rose-400 font-mono focus:border-[#00C4CC] focus:outline-none"
                        />
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-[#00C4CC]">
                        Rs. {item.total.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-rose-400 hover:text-rose-300 font-bold px-1"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Statuses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-800/80 bg-[#0C1420] p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#00C4CC] border-b border-slate-800 pb-2">
                3. Shipping & Coupon
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-silver-dim mb-1">
                    Delivery / Shipping Charges (Rs.)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={deliveryCharges}
                    onChange={(e) => setDeliveryCharges(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white font-mono focus:border-[#00C4CC] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-silver-dim mb-1">Coupon Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="COUPON CODE"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white font-mono uppercase focus:border-[#00C4CC] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white hover:bg-slate-700"
                    >
                      Verify
                    </button>
                  </div>
                  {couponError && <p className="text-[11px] text-rose-400 mt-1">{couponError}</p>}
                </div>

                <div>
                  <label className="block font-bold text-silver-dim mb-1">Admin Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white text-xs focus:border-[#00C4CC] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-[#0C1420] p-6 space-y-4 flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#00C4CC] border-b border-slate-800 pb-2 mb-3">
                  4. Payment & Totals Breakdown
                </h2>

                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div>
                    <label className="block font-bold text-silver-dim mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as InvoicePaymentMethod)}
                      className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white focus:border-[#00C4CC] focus:outline-none"
                    >
                      <option value="Cash on Delivery">Cash on Delivery</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Easypaisa">Easypaisa</option>
                      <option value="JazzCash">JazzCash</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-silver-dim mb-1">Payment Status</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as InvoicePaymentStatus)}
                      className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white focus:border-[#00C4CC] focus:outline-none"
                    >
                      <option value="Unpaid">Unpaid</option>
                      <option value="Partial">Partial</option>
                      <option value="Paid">Paid</option>
                      <option value="Refunded">Refunded</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-silver-dim mb-1">Invoice Status</label>
                    <select
                      value={invoiceStatus}
                      onChange={(e) => setInvoiceStatus(e.target.value as InvoiceStatus)}
                      className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white focus:border-[#00C4CC] focus:outline-none"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Paid">Paid</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-silver-dim mb-1">Amount Paid (Rs.)</label>
                    <input
                      type="number"
                      min={0}
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white font-mono focus:border-[#00C4CC] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#080D15] p-4 text-xs space-y-2 font-mono">
                  <div className="flex justify-between text-silver-dim">
                    <span>Subtotal:</span>
                    <span>Rs. {subtotal.toLocaleString()}</span>
                  </div>
                  {itemDiscountTotal > 0 && (
                    <div className="flex justify-between text-rose-400">
                      <span>Item Discounts:</span>
                      <span>-Rs. {itemDiscountTotal.toLocaleString()}</span>
                    </div>
                  )}
                  {couponDiscountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Coupon Discount:</span>
                      <span>-Rs. {couponDiscountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-silver-dim">
                    <span>Delivery Charges:</span>
                    <span>Rs. {deliveryCharges.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-bold text-white">
                    <span>Grand Total:</span>
                    <span className="text-[#00C4CC]">Rs. {grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 text-xs">
                    <span>Amount Paid:</span>
                    <span>Rs. {amountPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-rose-400 font-bold text-xs pt-1 border-t border-slate-800/60">
                    <span>Remaining Balance:</span>
                    <span>Rs. {remainingAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className="flex-1 py-3 rounded-xl border border-slate-700 bg-slate-800 text-xs font-bold text-white hover:bg-slate-700"
                >
                  👁️ Preview Changes
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00C4CC] to-cyan-600 text-xs font-bold text-black hover:brightness-110 shadow-lg disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : '💾 Update Invoice'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
