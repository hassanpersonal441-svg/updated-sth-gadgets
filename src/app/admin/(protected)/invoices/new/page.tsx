'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

function CreateInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const [loading, setLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Customer State with SearchParams auto-fill
  const [customerName, setCustomerName] = useState(searchParams.get('customer_name') || '');
  const [customerPhone, setCustomerPhone] = useState(searchParams.get('customer_phone') || '');
  const [customerWhatsapp, setCustomerWhatsapp] = useState(searchParams.get('customer_phone') || '');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState(searchParams.get('customer_address') || '');
  const [customerCity, setCustomerCity] = useState(searchParams.get('customer_city') || '');

  // Invoice Dates
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');

  // Invoice Items
  const [items, setItems] = useState<InvoiceFormItem[]>([]);

  // Delivery & Coupon
  const [deliveryCharges, setDeliveryCharges] = useState<number>(
    parseFloat(searchParams.get('delivery') || '0') || 0
  );
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
  const [terms, setTerms] = useState(
    'Thank you for your business! Items once sold can be claimed under standard STH Gadgets warranty where applicable. Please retain this invoice for your records.'
  );

  // Tab mode: 'form' vs 'preview'
  const [viewMode, setViewMode] = useState<'form' | 'preview'>('form');

  // Load products and coupons on mount
  useEffect(() => {
    async function loadData() {
      try {
        const prodRes = await fetch('/api/admin/orders'); // Or products endpoint
        const prodsRes = await fetch('/api/categories'); // let's fetch active products directly
        // Fetch products directly from public client or endpoint
        const resProds = await fetch('/api/admin/profit'); // profit route has product list or we can fetch products
        // Let's use standard Supabase client directly or create client endpoint
      } catch (err) {
        console.error('Data load error:', err);
      }
    }
    loadData();
  }, []);

  const [existingOrders, setExistingOrders] = useState<any[]>([]);
  const [selectedImportOrderId, setSelectedImportOrderId] = useState('');

  // Fetch active products, coupons & orders using browser client
  useEffect(() => {
    async function initClientData() {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // Fetch products
      const { data: prods } = await supabase
        .from('products')
        .select('*, product_images(*)')
        .eq('active', true)
        .order('name');
      if (prods) setProducts(prods as unknown as Product[]);

      // Fetch coupons
      const { data: cps } = await supabase
        .from('coupons')
        .select('*')
        .eq('active', true);
      if (cps) setCoupons(cps as Coupon[]);

      // Fetch existing orders for import dropdown
      const { data: ords } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (ords) setExistingOrders(ords);
    }
    initClientData();
  }, []);

  const handleImportOrder = (orderId: string) => {
    setSelectedImportOrderId(orderId);
    if (!orderId) return;
    const ord = existingOrders.find((o) => o.id === orderId);
    if (!ord) return;

    setCustomerName(ord.customer_name || '');
    setCustomerPhone(ord.phone || '');
    setCustomerWhatsapp(ord.phone || '');
    setCustomerCity(ord.city || '');
    setCustomerAddress(ord.address || '');
    setDeliveryCharges(Number(ord.delivery_charges || 0));
    setPaymentStatus(ord.payment_status === 'paid' ? 'Paid' : 'Unpaid');
    if (ord.payment_status === 'paid') {
      setAmountPaid(Number(ord.total_amount || 0));
    } else {
      setAmountPaid(0);
    }

    if (ord.order_items && ord.order_items.length > 0) {
      const importedItems: InvoiceFormItem[] = ord.order_items.map((i: any) => ({
        product_id: i.product_id || null,
        product_name: i.product_name + (i.variant_name ? ` (${i.variant_name})` : ''),
        product_image: null,
        quantity: i.quantity,
        unit_price: Number(i.unit_price),
        discount: 0,
        total: Number(i.line_total),
      }));
      setItems(importedItems);
    }
  };

  // Filter products for dropdown lookup
  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  // Handle adding selected product to items table
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

  // Calculate live monetary totals
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  }, [items]);

  const itemDiscountTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.discount, 0);
  }, [items]);

  // Coupon application logic
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

    if (found.expiry_date && new Date(found.expiry_date) < new Date()) {
      setCouponError('This coupon has expired');
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

  // Construct draft object for live preview
  const previewInvoice: Invoice = useMemo(() => {
    return {
      id: 'draft-preview-id',
      invoice_number: 'STH-INV-PREVIEW',
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
      coupon_code: appliedCoupon?.code || null,
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

    setLoading(true);

    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
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
          coupon_code: appliedCoupon?.code || null,
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
        alert(`Invoice ${data.invoice.invoice_number} created successfully!`);
        router.push(`/admin/invoices/${data.invoice.id}`);
      } else {
        alert(`Failed to create invoice: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Submit invoice error:', err);
      alert('Network or server error while creating invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-[#C9D2DB] pb-12">
      {/* Module Switcher Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-[#0C1420] p-1.5 rounded-2xl border border-slate-800">
        <Link
          href="/admin/orders"
          className="px-4 py-2 rounded-xl text-xs font-bold text-silver-dim hover:text-white hover:bg-slate-800 transition"
        >
          📦 Orders List
        </Link>
        <Link
          href="/admin/invoices"
          className="px-4 py-2 rounded-xl text-xs font-bold text-silver-dim hover:text-white hover:bg-slate-800 transition"
        >
          📄 Invoices List & Dashboard
        </Link>
      </div>

      {/* Top Header & View Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase font-display mt-1">
            Create New Invoice
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
            👁️ Live Invoice Preview
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
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00C4CC] to-cyan-600 text-xs font-bold text-black hover:brightness-110 shadow-lg disabled:opacity-50"
            >
              {loading ? 'Saving Invoice...' : '💾 Save Invoice Now'}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 0: Import from Approved Order */}
          {existingOrders.length > 0 && (
            <div className="rounded-2xl border border-[#00C4CC]/30 bg-[#00C4CC]/5 p-4 space-y-2">
              <label className="block text-xs font-bold text-[#00C4CC] uppercase tracking-wider">
                📦 Import Details from Existing Order (Optional)
              </label>
              <select
                value={selectedImportOrderId}
                onChange={(e) => handleImportOrder(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs text-white focus:border-[#00C4CC] focus:outline-none"
              >
                <option value="">-- Select an Order to Auto-Fill Invoice --</option>
                {existingOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.order_number || 'STH-PENDING'} — {o.customer_name} ({o.city}) — PKR {Number(o.total_amount).toLocaleString()} ({o.status})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-silver-dim">
                Selecting an order auto-fills customer details, address, delivery charges, and order items.
              </p>
            </div>
          )}

          {/* Section 1: Customer Information */}
          <div className="rounded-2xl border border-slate-800/80 bg-[#0C1420] p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#00C4CC] border-b border-slate-800 pb-2">
              1. Customer Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-silver-dim mb-1">
                  Customer Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ali Khan"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white placeholder-slate-600 focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-silver-dim mb-1">
                  Customer Phone <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="0300 1234567"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    if (!customerWhatsapp) setCustomerWhatsapp(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white placeholder-slate-600 focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-silver-dim mb-1">WhatsApp Number</label>
                <input
                  type="text"
                  placeholder="0300 1234567"
                  value={customerWhatsapp}
                  onChange={(e) => setCustomerWhatsapp(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white placeholder-slate-600 focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-silver-dim mb-1">Customer Email</label>
                <input
                  type="email"
                  placeholder="customer@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white placeholder-slate-600 focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-silver-dim mb-1">
                  City <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Lahore, Karachi, Islamabad..."
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white placeholder-slate-600 focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block font-bold text-silver-dim mb-1">
                  Full Shipping / Billing Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="House #, Street, Sector, Area..."
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white placeholder-slate-600 focus:border-[#00C4CC] focus:outline-none"
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
                <label className="block font-bold text-silver-dim mb-1">Due Date (Optional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white focus:border-[#00C4CC] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Product Selector & Items Table */}
          <div className="rounded-2xl border border-slate-800/80 bg-[#0C1420] p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#00C4CC] border-b border-slate-800 pb-2">
              2. Invoice Items
            </h2>

            {/* Select Product Search Field */}
            <div className="relative space-y-2">
              <label className="block text-xs font-bold text-silver-dim">
                Select Product from Database
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search products by name or SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              {/* Product Search Dropdown Popup */}
              {productSearch.trim() && (
                <div className="absolute z-20 w-full max-h-60 overflow-y-auto rounded-xl border border-slate-700 bg-[#080D15] shadow-2xl divide-y divide-slate-800">
                  {filteredProducts.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500">No matching products found.</div>
                  ) : (
                    filteredProducts.map((p) => {
                      const pImg = p.product_images?.find((i) => i.is_primary)?.image_url || p.product_images?.[0]?.image_url;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleAddProduct(p)}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-[#121D2D] transition"
                        >
                          <div className="flex items-center gap-3">
                            {pImg ? (
                              <img src={pImg} alt={p.name} className="h-8 w-8 object-cover rounded" />
                            ) : (
                              <div className="h-8 w-8 bg-slate-800 rounded flex items-center justify-center text-[10px]">📦</div>
                            )}
                            <div>
                              <div className="text-xs font-bold text-white">{p.name}</div>
                              <div className="text-[10px] text-silver-dim font-mono">
                                Stock: {p.stock_status}
                              </div>
                            </div>
                          </div>
                          <div className="font-mono text-xs font-bold text-[#00C4CC]">
                            Rs. {p.price.toLocaleString()}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Added Items Table */}
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
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-silver-dim">
                        No products added yet. Search and select products above.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#0E1624]">
                        <td className="p-3 font-bold text-white">
                          <div className="flex items-center gap-2">
                            {item.product_image && (
                              <img src={item.product_image} alt="" className="h-7 w-7 object-cover rounded border border-slate-700" />
                            )}
                            <input
                              type="text"
                              value={item.product_name}
                              onChange={(e) => handleUpdateItem(idx, 'product_name', e.target.value)}
                              className="w-full rounded border border-slate-800 bg-transparent px-2 py-1 text-white text-xs focus:border-[#00C4CC] focus:outline-none"
                            />
                          </div>
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Delivery, Coupon & Payment Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Delivery & Coupons */}
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
                  <label className="block font-bold text-silver-dim mb-1">Apply Coupon Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ENTER COUPON CODE"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white font-mono uppercase focus:border-[#00C4CC] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white hover:bg-slate-700"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="text-[11px] text-rose-400 mt-1">{couponError}</p>}
                  {appliedCoupon && (
                    <p className="text-[11px] text-emerald-400 mt-1 font-mono">
                      ✓ Coupon Applied: {appliedCoupon.code} (-Rs. {couponDiscountAmount.toLocaleString()})
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-silver-dim mb-1">Admin Notes (Internal or Invoice Note)</label>
                  <textarea
                    rows={2}
                    placeholder="Add special instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-3 py-2 text-white text-xs focus:border-[#00C4CC] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Payment & Totals Summary */}
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

                {/* Monetary Breakdown Table */}
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

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className="flex-1 py-3 rounded-xl border border-slate-700 bg-slate-800 text-xs font-bold text-white hover:bg-slate-700 transition"
                >
                  👁️ Preview Invoice
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00C4CC] to-cyan-600 text-xs font-bold text-black hover:brightness-110 shadow-lg transition disabled:opacity-50"
                >
                  {loading ? 'Creating...' : '💾 Create Invoice'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default function CreateInvoicePage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-silver-dim">Loading invoice editor...</div>}>
      <CreateInvoiceContent />
    </Suspense>
  );
}
