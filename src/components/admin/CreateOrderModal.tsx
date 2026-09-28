'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/context/ToastContext';
import type { Product, Settings } from '@/types/database';
import { formatPrice } from '@/lib/utils';

interface OrderItem {
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
}

export default function CreateOrderModal({ isOpen, onClose, onOrderCreated }: CreateOrderModalProps) {
  const { success, error: showErrorToast } = useToast();

  // Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  // Order Items
  const [items, setItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Delivery & Payment
  const [deliveryCharges, setDeliveryCharges] = useState(200);
  const [actualCourierCost, setActualCourierCost] = useState(200);
  const [deliveryPaidBy, setDeliveryPaidBy] = useState<'customer' | 'store' | 'partial'>('customer');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [paymentStatus, setPaymentStatus] = useState('Unpaid');
  const [amountPaid, setAmountPaid] = useState(0);
  const [orderSource, setOrderSource] = useState<'web' | 'whatsapp' | 'random'>('web');

  // Loading & Submitting
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Portal mount state
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load products and settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Escape key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    },
    [onClose, submitting]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  async function loadProducts() {
    setLoading(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const [productsRes, settingsRes] = await Promise.all([
        supabase.from('products').select('*, product_images(*)').eq('active', true).order('name'),
        supabase.from('settings').select('*').single(),
      ]);

      if (productsRes.data) setProducts(productsRes.data as Product[]);
      if (settingsRes.data) setSettings(settingsRes.data as Settings);
    } catch (err) {
      console.error('Error loading data:', err);
      showErrorToast('Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  function resetForm() {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerCity('');
    setCustomerAddress('');
    setCustomerNotes('');
    setItems([]);
    setSelectedProduct('');
    setItemQuantity(1);
    setProductSearchQuery('');
    setShowProductDropdown(false);
    setDeliveryCharges(0);
    setPaymentMethod('Cash on Delivery');
    setPaymentStatus('Unpaid');
    setAmountPaid(0);
    setOrderSource('web');
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const totalAmount = subtotal + deliveryCharges;

  // Add item to order
  function handleAddItem() {
    if (!selectedProduct) {
      showErrorToast('Please select a product');
      return;
    }

    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    const newItem: OrderItem = {
      product_id: product.id,
      product_name: product.name,
      quantity: itemQuantity,
      unit_price: product.price,
      line_total: product.price * itemQuantity,
    };

    setItems([...items, newItem]);
    setSelectedProduct('');
    setItemQuantity(1);
    setProductSearchQuery('');
    setShowProductDropdown(false);
  }

  // Filter products based on search
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  // Handle product selection from dropdown
  function handleProductSelect(productId: string) {
    setSelectedProduct(productId);
    const product = products.find((p) => p.id === productId);
    if (product) {
      setProductSearchQuery(product.name);
    }
    setShowProductDropdown(false);
    setIsInputFocused(false);
  }

  // Handle input focus
  function handleInputFocus() {
    setIsInputFocused(true);
    setShowProductDropdown(true);
  }

  // Handle input blur
  function handleInputBlur() {
    setIsInputFocused(false);
  }

  // Handle dropdown mouse events
  function handleDropdownMouseDown() {
    // Prevent blur when clicking inside dropdown
  }

  // Remove item from order
  function handleRemoveItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  // Submit order
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!customerName.trim()) return showErrorToast('Please enter Customer Name');
    if (!customerPhone.trim()) return showErrorToast('Please enter Customer Phone');
    if (items.length === 0) return showErrorToast('Please add at least one product item');

    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          phone: customerPhone,
          city: customerCity,
          address: customerAddress,
          delivery_charges: deliveryCharges,
          actual_courier_cost: actualCourierCost,
          delivery_paid_by: deliveryPaidBy,
          payment_method: paymentMethod,
          payment_status: paymentStatus === 'Paid' ? 'paid' : 'unpaid',
          amount_paid: amountPaid,
          notes: customerNotes,
          order_items: items,
          order_source: orderSource,
        }),
      });

      const data = await res.json();
      if (res.ok && data.order) {
        success('Order created successfully!');
        resetForm();
        onClose();
        onOrderCreated();
      } else {
        showErrorToast(data.error || 'Failed to create order');
      }
    } catch (err) {
      console.error('Create order error:', err);
      showErrorToast('Network or server error');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-order-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={submitting ? undefined : onClose}
      />

      {/* Modal Panel */}
      <div className="relative z-10 flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#00C4CC]/30 bg-[#0b111b] text-[#C9D2DB] shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_40px_rgba(0,196,204,0.12)] mx-3 sm:mx-4 max-h-[92vh] animate-slideUp">
        {/* ─── Sticky Header ─── */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#00C4CC]/20 bg-[radial-gradient(circle_at_0%_0%,rgba(0,196,204,0.18),transparent_38%),linear-gradient(120deg,#0d1a25,#111827_65%)] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border-2 border-[#00C4CC] bg-black/70 p-1 shadow-[0_0_14px_rgba(0,196,204,0.35)]">
              <div className="flex h-full w-full items-center justify-center text-[#00C4CC] text-lg font-black">
                📦
              </div>
            </div>
            <div className="min-w-0">
              <h2 id="create-order-title" className="font-display text-base sm:text-lg font-black text-white truncate">
                Create Manual Order
              </h2>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Create orders for phone, WhatsApp, or in-store customers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="shrink-0 rounded-xl border border-[#00C4CC]/20 bg-black/20 p-2 text-slate-400 transition hover:border-[#00C4CC]/60 hover:text-white disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ─── Scrollable Body ─── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {/* ═══ Left Column — Customer + Payment ═══ */}
              <div className="space-y-4">
                {/* Customer Information */}
                <fieldset className="rounded-xl border border-slate-800/80 bg-[#080D15] p-4 space-y-3">
                  <legend className="sr-only">Customer Information</legend>
                  <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#00C4CC] flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#00C4CC]/10 text-[10px]">👤</span>
                    Customer Information
                  </h3>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Customer Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-[#0C1420] px-3 py-2.5 text-xs font-semibold text-white placeholder:text-slate-500 focus:border-[#00C4CC] focus:ring-1 focus:ring-[#00C4CC]/30 focus:outline-none transition"
                      placeholder="Enter customer name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Phone Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-[#0C1420] px-3 py-2.5 text-xs font-mono font-bold text-white placeholder:text-slate-500 focus:border-[#00C4CC] focus:ring-1 focus:ring-[#00C4CC]/30 focus:outline-none transition"
                      placeholder="03XX-XXXXXXX"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      City <span className="text-slate-500 font-normal normal-case">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={customerCity}
                      onChange={(e) => setCustomerCity(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-[#0C1420] px-3 py-2.5 text-xs font-semibold text-white placeholder:text-slate-500 focus:border-[#00C4CC] focus:ring-1 focus:ring-[#00C4CC]/30 focus:outline-none transition"
                      placeholder="Lahore, Karachi, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Address <span className="text-slate-500 font-normal normal-case">(Optional)</span>
                    </label>
                    <textarea
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-slate-700 bg-[#0C1420] px-3 py-2.5 text-xs font-semibold text-white placeholder:text-slate-500 focus:border-[#00C4CC] focus:ring-1 focus:ring-[#00C4CC]/30 focus:outline-none resize-none transition"
                      placeholder="Full delivery address"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Notes <span className="text-slate-500 font-normal normal-case">(Optional)</span>
                    </label>
                    <textarea
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-slate-700 bg-[#0C1420] px-3 py-2.5 text-xs font-semibold text-white placeholder:text-slate-500 focus:border-[#00C4CC] focus:ring-1 focus:ring-[#00C4CC]/30 focus:outline-none resize-none transition"
                      placeholder="Any special instructions"
                    />
                  </div>
                </fieldset>

                {/* Payment Details */}
                <fieldset className="rounded-xl border border-slate-800/80 bg-[#080D15] p-4 space-y-3">
                  <legend className="sr-only">Payment Details</legend>
                  <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#00C4CC] flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#00C4CC]/10 text-[10px]">💳</span>
                    Payment Details
                  </h3>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Order Source
                    </label>
                    <select
                      value={orderSource}
                      onChange={(e) => setOrderSource(e.target.value as 'web' | 'whatsapp' | 'random')}
                      className="w-full rounded-xl border border-slate-700 bg-[#0C1420] px-3 py-2.5 text-xs font-bold text-white focus:border-[#00C4CC] focus:ring-1 focus:ring-[#00C4CC]/30 focus:outline-none transition"
                    >
                      <option value="web">🌐 Website</option>
                      <option value="whatsapp">📱 WhatsApp</option>
                      <option value="random">🎲 Random/Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-[#0C1420] px-3 py-2.5 text-xs font-bold text-white focus:border-[#00C4CC] focus:ring-1 focus:ring-[#00C4CC]/30 focus:outline-none transition"
                    >
                      <option value="Cash on Delivery">Cash on Delivery</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="JazzCash">JazzCash</option>
                      <option value="EasyPaisa">EasyPaisa</option>
                      <option value="Credit Card">Credit Card</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-[#0C1420] px-3 py-2.5 text-xs font-bold text-white focus:border-[#00C4CC] focus:ring-1 focus:ring-[#00C4CC]/30 focus:outline-none transition"
                    >
                      <option value="Unpaid">Unpaid</option>
                      <option value="Paid">Paid</option>
                      <option value="Partial">Partial</option>
                    </select>
                  </div>

                  {paymentStatus !== 'Unpaid' && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                        Amount Paid (PKR)
                      </label>
                      <input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-700 bg-[#0C1420] px-3 py-2.5 text-xs font-mono font-bold text-emerald-400 placeholder:text-slate-500 focus:border-[#00C4CC] focus:ring-1 focus:ring-[#00C4CC]/30 focus:outline-none transition"
                        placeholder="Enter amount paid"
                        min={0}
                      />
                    </div>
                  )}

                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#00C4CC]">
                      🚚 Delivery & Courier Accounting
                    </label>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Delivery Paid By
                      </label>
                      <select
                        value={deliveryPaidBy}
                        onChange={(e) => {
                          const val = e.target.value as 'customer' | 'store' | 'partial';
                          setDeliveryPaidBy(val);
                          if (val === 'customer') {
                            setDeliveryCharges(200);
                            setActualCourierCost(200);
                          } else if (val === 'store') {
                            setDeliveryCharges(0);
                            setActualCourierCost(450);
                          } else if (val === 'partial') {
                            setDeliveryCharges(200);
                            setActualCourierCost(430);
                          }
                        }}
                        className="w-full rounded-xl border border-slate-700 bg-[#0C1420] px-3 py-2 text-xs font-bold text-white focus:border-[#00C4CC] focus:outline-none"
                      >
                        <option value="customer">👤 Customer Pays Delivery (Full)</option>
                        <option value="store">🏬 Paid by Me / Store (Free Shipping for Customer)</option>
                        <option value="partial">🤝 Subsidized / Partial (Customer pays part, Store pays rest)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                          Customer Fee (PKR)
                        </label>
                        <input
                          type="number"
                          value={deliveryCharges}
                          onChange={(e) => setDeliveryCharges(Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-700 bg-[#0C1420] px-3 py-2 text-xs font-mono font-bold text-white focus:border-[#00C4CC] focus:outline-none"
                          min={0}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">
                          Actual Courier Cost (PKR)
                        </label>
                        <input
                          type="number"
                          value={actualCourierCost}
                          onChange={(e) => setActualCourierCost(Number(e.target.value))}
                          className="w-full rounded-xl border border-slate-700 bg-[#0C1420] px-3 py-2 text-xs font-mono font-bold text-amber-300 focus:border-[#00C4CC] focus:outline-none"
                          min={0}
                        />
                      </div>
                    </div>

                    {Math.max(0, actualCourierCost - deliveryCharges) > 0 && (
                      <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-2 text-[11px] font-semibold text-orange-300 flex items-center justify-between">
                        <span>Store Net Delivery Expense:</span>
                        <span className="font-mono font-bold text-white">
                          PKR {(actualCourierCost - deliveryCharges).toLocaleString('en-PK')} (Deducted from Profit)
                        </span>
                      </div>
                    )}
                  </div>
                </fieldset>
              </div>

              {/* ═══ Right Column — Order Items ═══ */}
              <div className="space-y-4">
                <fieldset className="rounded-xl border border-slate-800/80 bg-[#080D15] p-4 space-y-3">
                  <legend className="sr-only">Order Items</legend>
                  <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#00C4CC] flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#00C4CC]/10 text-[10px]">🛒</span>
                    Order Items
                    {items.length > 0 && (
                      <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#00C4CC] px-1.5 text-[10px] font-black text-black">
                        {items.length}
                      </span>
                    )}
                  </h3>

                  {/* Add Item Form */}
                  <div className="space-y-2.5 rounded-xl border border-slate-700/60 bg-[#0C1420] p-3">
                    <div className="relative z-40">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                        Select Product
                      </label>
                      <input
                        type="text"
                        value={productSearchQuery}
                        onChange={(e) => {
                          setProductSearchQuery(e.target.value);
                          setShowProductDropdown(true);
                        }}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        placeholder="Search products..."
                        className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2.5 text-xs font-bold text-white placeholder:text-slate-500 focus:border-[#00C4CC] focus:ring-1 focus:ring-[#00C4CC]/30 focus:outline-none transition"
                        disabled={loading}
                      />

                      {/* Product Search Dropdown */}
                      {showProductDropdown && (
                        <div
                          className="absolute z-50 w-full mt-1 rounded-xl border border-slate-700 bg-[#080D15] shadow-2xl max-h-60 overflow-y-auto"
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {filteredProducts.length > 0 ? (
                            filteredProducts.slice(0, 8).map((product) => (
                              <button
                                type="button"
                                key={product.id}
                                onClick={() => handleProductSelect(product.id)}
                                className="w-full text-left px-3 py-2.5 text-xs text-white hover:bg-slate-800 transition border-b border-slate-800 last:border-b-0"
                              >
                                <div className="font-semibold">{product.name}</div>
                                <div className="text-[10px] text-slate-400">{formatPrice(product.price, settings)}</div>
                              </button>
                            ))
                          ) : (
                            <div className="p-3 text-center text-xs text-slate-400">
                              {loading ? 'Loading products...' : productSearchQuery.trim() ? 'No products found' : 'Start typing to search...'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(Number(e.target.value))}
                        min={1}
                        className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2.5 text-xs font-mono font-bold text-white focus:border-[#00C4CC] focus:ring-1 focus:ring-[#00C4CC]/30 focus:outline-none transition"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={loading || !selectedProduct}
                      className="w-full rounded-xl bg-gradient-to-r from-[#00C4CC] to-cyan-600 hover:brightness-110 py-2.5 text-xs font-black text-slate-950 shadow-md transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      + Add to Order
                    </button>
                  </div>

                  {/* Items List */}
                  {items.length > 0 ? (
                    <div className="space-y-2 max-h-52 overflow-y-auto overscroll-contain pr-1">
                      {items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-[#0C1420] p-2.5 group transition hover:border-slate-600"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{item.product_name}</p>
                            <p className="text-[10px] text-slate-400">
                              Qty: {item.quantity} × {formatPrice(item.unit_price, settings)} ={' '}
                              <span className="text-white font-semibold">{formatPrice(item.line_total, settings)}</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="ml-2 rounded-lg border border-rose-900/60 bg-rose-950/20 px-2 py-1 text-[10px] font-semibold text-rose-400 hover:border-rose-600 hover:bg-rose-900/40 transition opacity-70 group-hover:opacity-100"
                            aria-label={`Remove ${item.product_name}`}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-500">
                      <span className="text-2xl mb-1">📋</span>
                      <p className="text-xs">No items added yet</p>
                    </div>
                  )}
                </fieldset>

                {/* Order Summary */}
                {items.length > 0 && (
                  <div className="rounded-xl border border-[#00C4CC]/30 bg-gradient-to-br from-[#00C4CC]/10 via-transparent to-cyan-900/10 p-4 space-y-2">
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#00C4CC] flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#00C4CC]/10 text-[10px]">📊</span>
                      Order Summary
                    </h3>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>Subtotal ({items.length} item{items.length !== 1 ? 's' : ''}):</span>
                        <span className="font-semibold text-white">{formatPrice(subtotal, settings)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Delivery:</span>
                        <span className="font-semibold text-white">
                          {deliveryCharges > 0 ? formatPrice(deliveryCharges, settings) : 'FREE'}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-[#00C4CC]/25 pt-2 text-sm font-bold">
                        <span className="text-white">Total:</span>
                        <span className="text-[#00C4CC] font-mono text-base">{formatPrice(totalAmount, settings)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Sticky Footer ─── */}
          <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-slate-800/80 bg-[#0b111b]/95 backdrop-blur-sm px-5 py-3.5 sm:px-6">
            <div className="text-xs text-slate-400 hidden sm:block">
              {items.length > 0 ? (
                <span>
                  {items.length} item{items.length !== 1 ? 's' : ''} •{' '}
                  <span className="text-[#00C4CC] font-bold">{formatPrice(totalAmount, settings)}</span>
                </span>
              ) : (
                <span>Add items to continue</span>
              )}
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-slate-700 bg-[#080D15] px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-600 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || items.length === 0}
                className="rounded-xl bg-gradient-to-r from-[#00C4CC] to-cyan-600 hover:brightness-110 px-6 py-2.5 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(0,196,204,0.25)] transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating…
                  </span>
                ) : (
                  'Create Order'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
