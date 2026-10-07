'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { VendorProfile, VendorPurchase } from '@/types/database';
import { useToast } from '@/context/ToastContext';
import { createWhatsAppUrl } from '@/lib/whatsapp';
import AiProductGenerationModal from '@/components/admin/AiProductGenerationModal';

export default function VendorPurchasesPage() {
  const { success, error: showErrorToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productNameInputRef = useRef<HTMLInputElement>(null);

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
  const [whatsAppPurchase, setWhatsAppPurchase] = useState<VendorPurchase | null>(null);
  const [whatsAppAction, setWhatsAppAction] = useState<'due_date' | 'partial_payment' | 'payment_confirmation' | 'purchase_order' | 'due_date_reminder'>('due_date');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Form State
  const [formOrderNumber, setFormOrderNumber] = useState('');
  const [formProductName, setFormProductName] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formWholesaleCost, setFormWholesaleCost] = useState(0);
  const [formStatus, setFormStatus] = useState<'pending' | 'purchased'>('pending');
  const [formPaymentStatus, setFormPaymentStatus] = useState<'unpaid' | 'partial' | 'paid'>('unpaid');
  const [formPaymentMethod, setFormPaymentMethod] = useState('cash');
  const [formAmountPaid, setFormAmountPaid] = useState(0);
  const [formPaymentDueDate, setFormPaymentDueDate] = useState('');
  const [formPurchaseDate, setFormPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [formProductNotes, setFormProductNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiGeneratedInfo, setAiGeneratedInfo] = useState<any>(null);

  // Multiple products support
  const [purchaseItems, setPurchaseItems] = useState<Array<{
    product_name: string;
    quantity: number;
    wholesale_cost: number;
    notes?: string;
  }>>([]);

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
  const [productSearchResults, setProductSearchResults] = useState<Array<{ id: string; name: string; wholesale_price?: number }>>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const suggestionsLoaded = useRef(false);

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
    setFormPaymentStatus('unpaid');
    setFormPaymentMethod('cash');
    setFormAmountPaid(0);
    setFormPaymentDueDate('');
    setFormPurchaseDate(new Date().toISOString().split('T')[0]);
    setFormProductNotes('');
    setPurchaseItems([]);
    setEditingPurchase(null);
  }

  function openCreateModal() {
    resetForm();
    loadSuggestions();
    setIsCreateOpen(true);
  }

  function handleAiProductCreated(product: any) {
    // Set the form product name to the newly created product
    setFormProductName(product.name);
    // Reload suggestions to include the new product
    suggestionsLoaded.current = false;
    loadSuggestions();
  }

  async function handleAiGenerateInfo(productName: string) {
    if (!productName.trim()) return;
    
    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/admin/ai/generate-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: productName,
          categoryName: 'Mobile Accessories',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to generate product info');
      }

      setAiGeneratedInfo(json.data);
      
      // Auto-fill fields with AI data
      if (json.data.short_description) {
        setFormProductNotes(json.data.short_description);
      }
      
      success('AI product information generated successfully!');
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to generate product info');
    } finally {
      setIsAiGenerating(false);
    }
  }

  function openEditModal(p: VendorPurchase) {
    loadSuggestions();
    setEditingPurchase(p);
    setFormOrderNumber(p.order_number);
    setFormProductName(p.product_name);
    setFormQuantity(p.quantity);
    setFormWholesaleCost(p.wholesale_cost);
    setFormStatus(p.status);
    setFormPaymentStatus(p.payment_status || 'unpaid');
    setFormPaymentMethod(p.payment_method || 'cash');
    setFormAmountPaid(Number(p.amount_paid) || 0);
    setFormPaymentDueDate(p.payment_due_date || '');
    setFormPurchaseDate(p.purchase_date);
    setFormProductNotes(p.notes || '');
    setIsCreateOpen(true);
  }

  async function loadSuggestions() {
    if (suggestionsLoaded.current) return;
    suggestionsLoaded.current = true;
    const [productsResult, ordersResult] = await Promise.allSettled([
      fetch('/api/products').then((response) => response.json()),
      fetch('/api/admin/orders?limit=20').then((response) => response.json()),
    ]);
    if (productsResult.status === 'fulfilled' && productsResult.value.products) {
      setStoreProducts(productsResult.value.products);
      setProductSearchResults(productsResult.value.products);
    }
    if (ordersResult.status === 'fulfilled' && ordersResult.value.orders) {
      setRecentOrders(ordersResult.value.orders.filter((order: any) => order.order_number));
    }
  }

  function handleProductSearch(value: string) {
    setFormProductName(value);
    if (!value.trim()) {
      setProductSearchResults(storeProducts);
      setShowProductDropdown(true);
      return;
    }

    const searchTerm = value.toLowerCase();
    const matches = storeProducts.filter((p) =>
      p.name.toLowerCase().includes(searchTerm)
    );
    setProductSearchResults(matches);
    setShowProductDropdown(true);
  }

  // Add current product to purchase items list
  function handleAddProductToPurchase() {
    if (!formProductName.trim()) {
      showErrorToast('Please enter a product name');
      return;
    }

    const newItem = {
      product_name: formProductName.trim(),
      quantity: formQuantity,
      wholesale_cost: formWholesaleCost,
      notes: formProductNotes.trim() || undefined,
    };

    setPurchaseItems((prev) => [...prev, newItem]);

    // Reset product-specific fields for next item
    setFormProductName('');
    setFormQuantity(1);
    setFormWholesaleCost(0);
    setFormProductNotes('');
    setShowProductDropdown(false);

    if (productNameInputRef.current) {
      productNameInputRef.current.value = '';
    }

    success(`Added "${newItem.product_name}" to purchase list!`);

    // Focus back to product name field for next entry
    setTimeout(() => {
      productNameInputRef.current?.focus();
    }, 100);
  }

  // Select a product directly from dropdown or quick store item pill
  function handleSelectProductFromList(name: string, defaultWholesalePrice?: number) {
    const cost = defaultWholesalePrice && defaultWholesalePrice > 0 
      ? defaultWholesalePrice 
      : formWholesaleCost;

    if (editingPurchase) {
      setFormProductName(name);
      if (cost > 0) setFormWholesaleCost(cost);
      setShowProductDropdown(false);
      return;
    }

    const newItem = {
      product_name: name.trim(),
      quantity: formQuantity > 0 ? formQuantity : 1,
      wholesale_cost: cost,
      notes: formProductNotes.trim() || undefined,
    };

    setPurchaseItems((prev) => [...prev, newItem]);

    // Reset product-specific fields to blank for the next product
    setFormProductName('');
    setFormQuantity(1);
    setFormWholesaleCost(0);
    setFormProductNotes('');
    setShowProductDropdown(false);

    if (productNameInputRef.current) {
      productNameInputRef.current.value = '';
    }

    success(`Added "${name.trim()}" to purchase list!`);

    setTimeout(() => {
      productNameInputRef.current?.focus();
    }, 100);
  }

  // Update specific item in purchase items list
  function handleUpdatePurchaseItem(index: number, field: string, value: any) {
    setPurchaseItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  // Remove item from purchase items list
  function handleRemovePurchaseItem(index: number) {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  }

  // Calculate total cost for all items
  const currentFormCost = formProductName.trim() ? (formWholesaleCost * formQuantity) : 0;
  const totalPurchaseCost = purchaseItems.reduce((sum, item) => sum + (item.wholesale_cost * item.quantity), 0) + currentFormCost;

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

    // For new purchases, use the items list
    // For editing, use the single product form
    if (!editingPurchase) {
      // New purchase - check if we have items in the list or if we need to add the current form as an item
      const itemsToSubmit = [...purchaseItems];
      if (formProductName.trim()) {
        itemsToSubmit.push({
          product_name: formProductName.trim(),
          quantity: formQuantity,
          wholesale_cost: formWholesaleCost,
          notes: formProductNotes.trim() || undefined,
        });
      }

      if (itemsToSubmit.length === 0) {
        showErrorToast('Please add at least one product to the purchase');
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch('/api/admin/vendor-purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_number: formOrderNumber || 'STH-GENERAL',
            status: formStatus,
            payment_status: formPaymentStatus,
            payment_method: formPaymentMethod,
            amount_paid: formAmountPaid,
            payment_due_date: formPaymentDueDate || null,
            purchase_date: formPurchaseDate,
            items: itemsToSubmit.map(item => ({
              product_name: item.product_name,
              quantity: item.quantity,
              wholesale_cost: item.wholesale_cost,
              notes: item.notes,
            })),
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to save purchase record');
        }

        const itemCount = itemsToSubmit.length;
        success(`${itemCount} product${itemCount > 1 ? 's' : ''} added to vendor purchase!`);
        setIsCreateOpen(false);
        resetForm();
        loadData();
      } catch (err: any) {
        showErrorToast(err.message || 'Error saving purchase record');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Edit mode - update single record
      if (!formProductName.trim()) {
        showErrorToast('Please enter a product name');
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch(`/api/admin/vendor-purchases/${editingPurchase.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_number: formOrderNumber || 'STH-GENERAL',
            product_name: formProductName,
            quantity: formQuantity,
            wholesale_cost: formWholesaleCost,
            status: formStatus,
            payment_status: formPaymentStatus,
            payment_method: formPaymentMethod,
            amount_paid: formAmountPaid,
            payment_due_date: formPaymentDueDate || null,
            purchase_date: formPurchaseDate,
            notes: formProductNotes,
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to save purchase record');
        }

        success('Purchase record updated!');
        setIsCreateOpen(false);
        resetForm();
        loadData();
      } catch (err: any) {
        showErrorToast(err.message || 'Error saving purchase record');
      } finally {
        setSubmitting(false);
      }
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

  function openWhatsApp(purchase: VendorPurchase) {
    setWhatsAppPurchase(purchase);
    setWhatsAppAction('purchase_order');
  }

  async function sendWhatsAppMessage() {
    if (!whatsAppPurchase || !profile.phone) {
      showErrorToast('Please add a vendor WhatsApp number in the vendor profile first');
      return;
    }

    const total = Number(whatsAppPurchase.wholesale_cost) * Number(whatsAppPurchase.quantity);
    const paid = Number(whatsAppPurchase.amount_paid) || 0;
    const remaining = Math.max(0, total - paid);
    const greeting = `Assalam-o-Alaikum ${profile.name},`;
    const dueDate = whatsAppPurchase.payment_due_date || 'Not set';
    const record = `Purchase ID: ${whatsAppPurchase.purchase_number}\nProduct: ${whatsAppPurchase.product_name}\nQuantity: ${whatsAppPurchase.quantity}\nTotal Amount: PKR ${total.toLocaleString('en-PK')}\nPurchase Date: ${whatsAppPurchase.purchase_date}`;
    const messages = {
      due_date: `${greeting}\n\nPayment due date update for vendor purchase ${whatsAppPurchase.purchase_number}.\n\n${record}\nPayment Due Date: ${dueDate}\nPaid Amount: PKR ${paid.toLocaleString('en-PK')}\nRemaining Amount: PKR ${remaining.toLocaleString('en-PK')}\nPayment Status: ${(whatsAppPurchase.payment_status || 'unpaid').toUpperCase()}\nPayment Method: ${whatsAppPurchase.payment_method || 'cash'}\n\nI will pay the remaining amount on the due date. Please confirm.`,
      partial_payment: `${greeting}\n\nThis is a partial payment update for vendor purchase ${whatsAppPurchase.purchase_number}.\n\n${record}\nPaid Amount: PKR ${paid.toLocaleString('en-PK')}\nRemaining Amount: PKR ${remaining.toLocaleString('en-PK')}\nPayment Method: ${whatsAppPurchase.payment_method || 'cash'}\n\nPlease confirm receipt of the partial payment.`,
      payment_confirmation: `${greeting}\n\nPayment confirmation for vendor purchase ${whatsAppPurchase.purchase_number}:\n\n${record}\nPaid Amount: PKR ${paid.toLocaleString('en-PK')}\nPayment Status: ${(whatsAppPurchase.payment_status || 'unpaid').toUpperCase()}\nPayment Method: ${whatsAppPurchase.payment_method || 'cash'}\n\nPlease confirm receipt. Thank you.`,
      purchase_order: `${greeting}\n\nNew Purchase Order for Voltix Mobile:\n\n${record}\nPurchase Date: ${whatsAppPurchase.purchase_date}\nStatus: ${whatsAppPurchase.status.toUpperCase()}\nExpected Delivery: Please confirm availability and delivery timeline.\n\nPlease process this order and confirm when items will be ready.`,
      due_date_reminder: `${greeting}\n\nPayment Due Date Reminder for Purchase ${whatsAppPurchase.purchase_number}:\n\n${record}\nPayment Due Date: ${dueDate}\nPaid Amount: PKR ${paid.toLocaleString('en-PK')}\nRemaining Amount: PKR ${remaining.toLocaleString('en-PK')}\nPayment Status: ${(whatsAppPurchase.payment_status || 'unpaid').toUpperCase()}\n\nPlease confirm this due date is acceptable. We will make payment on the specified date.`,
    };

    window.open(createWhatsAppUrl(profile.phone, messages[whatsAppAction]), '_blank');
    try {
      await fetch(`/api/admin/vendor-purchases/${whatsAppPurchase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_sent_at: new Date().toISOString() }),
      });
      success('WhatsApp message opened. Purchase ID is now active.');
      loadData();
    } catch {
      showErrorToast('Message opened, but the WhatsApp sent status could not be saved');
    }
    setWhatsAppPurchase(null);
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

  const totalCostOverall = pendingCostSum + purchasedCostSum;
  const totalPaidSum = purchases.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0);
  const totalRemainingSum = Math.max(0, totalCostOverall - totalPaidSum);

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
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Pending Purchases */}
          <div className="rounded-2xl border border-amber-500/30 bg-[#0C1420] p-5 shadow-lg relative overflow-hidden">
            <div className="absolute right-4 top-4 text-2xl leading-none opacity-100 brightness-150">⏳</div>
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
            <div className="absolute right-4 top-4 text-2xl leading-none opacity-100 brightness-150">✅</div>
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
            <div className="absolute right-4 top-4 text-2xl leading-none opacity-100 brightness-150">💰</div>
            <span className="text-xs font-bold text-[#00C4CC] uppercase tracking-wider block">
              Total Purchase Cost
            </span>
            <div className="mt-2 font-mono text-2xl sm:text-3xl font-black text-[#00C4CC]">
              PKR {totalCostOverall.toLocaleString('en-PK')}
            </div>
            <span className="text-xs text-slate-400 block font-medium mt-1">
              Across {purchases.length} total procurement items
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Total Paid */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-lg relative overflow-hidden">
            <div className="absolute right-4 top-4 text-2xl leading-none opacity-100 brightness-150">💸</div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
              Total Amount Paid
            </span>
            <div className="mt-2 font-mono text-2xl sm:text-3xl font-black text-emerald-400">
              PKR {totalPaidSum.toLocaleString('en-PK')}
            </div>
            <span className="text-xs text-emerald-400/80 block font-medium mt-1">
              Sum of all cleared vendor payments
            </span>
          </div>

          {/* Remaining Balance */}
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 shadow-lg relative overflow-hidden">
            <div className="absolute right-4 top-4 text-2xl leading-none opacity-100 brightness-150">📉</div>
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">
              Remaining Vendor Balance
            </span>
            <div className="mt-2 font-mono text-2xl sm:text-3xl font-black text-rose-400">
              PKR {totalRemainingSum.toLocaleString('en-PK')}
            </div>
            <span className="text-xs text-rose-400/80 block font-medium mt-1">
              Total outstanding balance to clear
            </span>
          </div>
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
                <th className="py-3.5 px-4">Purchase / Order #</th>
                <th className="py-3.5 px-4">Product Name</th>
                <th className="py-3.5 px-4 text-center">Qty</th>
                <th className="py-3.5 px-4 text-right">Wholesale Cost</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Payment</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-silver-bright">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading Voltix Mobile purchase records...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No vendor purchase records found. Click <strong>"New Vendor Purchase"</strong> to add one.
                  </td>
                </tr>
              ) : (
                (() => {
                  const groups: (typeof purchases)[] = [];
                  let currentGroup: typeof purchases = [];
                  
                  purchases.forEach((p, i) => {
                    if (i === 0) {
                      currentGroup.push(p);
                    } else {
                      const prev = purchases[i - 1];
                      if (p.purchase_number === prev.purchase_number && p.purchase_number && p.purchase_number.startsWith('STH-VNR')) {
                        currentGroup.push(p);
                      } else {
                        groups.push(currentGroup);
                        currentGroup = [p];
                      }
                    }
                  });
                  if (currentGroup.length > 0) {
                    groups.push(currentGroup);
                  }

                  return groups.map((group, groupIdx) => {
                    return group.map((p, itemIdx) => {
                      const lineTotal = (Number(p.wholesale_cost) || 0) * (Number(p.quantity) || 1);
                      const isFirst = itemIdx === 0;
                      const rowSpan = group.length;

                      return (
                        <tr key={p.id} className={`hover:bg-slate-800/40 transition ${rowSpan > 1 && itemIdx === rowSpan - 1 ? 'border-b-2 border-slate-700/80' : ''}`}>
                          {/* Vendor Logo & Name */}
                          {isFirst && (
                            <td rowSpan={rowSpan} className={`py-3.5 px-4 ${rowSpan > 1 ? 'border-r border-slate-700/40 bg-slate-900/20' : ''}`}>
                              <div className="flex flex-col items-center justify-center gap-2">
                                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#00C4CC]/40 bg-black/60 p-0.5">
                                  <Image
                                    src={profile.logo_url || '/images/logo.png'}
                                    alt={profile.name}
                                    fill
                                    className="object-contain p-0.5"
                                  />
                                </div>
                                <span className="font-bold text-white text-[10px] text-center max-w-[60px] leading-tight">{profile.name}</span>
                              </div>
                            </td>
                          )}

                          {/* Related Order Number */}
                          {isFirst && (
                            <td rowSpan={rowSpan} className={`py-3.5 px-4 text-center ${rowSpan > 1 ? 'border-r border-slate-700/40 bg-slate-900/20' : ''}`}>
                              <span className="font-mono font-bold text-[#00C4CC] bg-[#00C4CC]/10 border border-[#00C4CC]/30 px-3 py-1 rounded-md text-xs block mx-auto w-max">
                                {p.status === 'pending' ? 'Pending' : p.purchase_number}
                              </span>
                              <span className="block mt-2 text-[10px] text-slate-500 font-mono">
                                {p.status === 'pending' ? 'Vendor ID will activate after purchase' : `Order: ${p.order_number}`}
                              </span>
                            </td>
                          )}

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

                      {/* Payment */}
                      <td className="py-3.5 px-4 text-center">
                        {(() => {
                          const paidAmt = Number(p.amount_paid || 0);
                          let displayStatus = p.payment_status || 'unpaid';
                          if (paidAmt >= lineTotal && lineTotal > 0) displayStatus = 'paid';
                          else if (paidAmt > 0 && paidAmt < lineTotal) displayStatus = 'partial';
                          else if (paidAmt === 0) displayStatus = 'unpaid';

                          return (
                            <>
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase border ${
                                displayStatus === 'paid'
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                                  : displayStatus === 'partial'
                                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                                    : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                              }`}>
                                {displayStatus}
                              </span>
                              <div className="mt-2 text-[10px] font-mono leading-tight">
                                <div className="text-emerald-400">Paid: {paidAmt.toLocaleString('en-PK')}</div>
                                <div className="text-rose-400">Bal: {Math.max(0, lineTotal - paidAmt).toLocaleString('en-PK')}</div>
                              </div>
                              {p.payment_due_date && displayStatus !== 'paid' && (
                                <span className="mt-1 block text-[10px] font-semibold text-orange-300">Due: {p.payment_due_date}</span>
                              )}
                            </>
                          );
                        })()}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono whitespace-nowrap">
                        {p.purchase_date}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openWhatsApp(p)}
                            className="rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 p-1.5 text-[#25D366] hover:bg-[#25D366] hover:text-white transition text-xs"
                            title="Send vendor message on WhatsApp"
                          >
                            💬
                          </button>
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
                });
              });
            })()
          )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT PURCHASE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setIsCreateOpen(false)} />

          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[22px] border border-orange-400/45 bg-[#0b111b] text-[#C9D2DB] shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_40px_rgba(251,146,60,0.14)] max-h-[90vh] overflow-y-auto">
            <div className="relative flex items-center justify-between overflow-hidden border-b border-orange-400/20 bg-[radial-gradient(circle_at_0%_0%,rgba(251,146,60,0.24),transparent_38%),linear-gradient(120deg,#25170d,#111827_65%)] px-5 pb-4 pt-5">
              <div className="absolute -right-8 -top-12 h-32 w-32 rounded-full border border-yellow-300/20" />
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-orange-400 bg-black/70 p-1 shadow-[0_0_18px_rgba(251,146,60,0.42)]">
                  <Image src={profile.logo_url || '/images/logo.png'} alt={profile.name} fill className="object-contain" sizes="48px" />
                </div>
                <div className="relative">
                  <span className="text-[10px] font-black text-yellow-300 uppercase tracking-[0.16em] block">
                    VENDOR: VOLTIX MOBILE
                  </span>
                  <h2 className="font-display text-lg font-black text-white">
                    {editingPurchase ? 'Edit Vendor Purchase Record' : 'New Vendor Purchase Record'}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="relative rounded-xl border border-orange-200/20 bg-black/20 p-2 text-slate-400 transition hover:border-yellow-300/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4 p-5 text-xs sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Auto-generated Vendor Purchase ID */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Vendor Purchase ID
                  </label>
                  <div className="w-full rounded-xl border border-yellow-300/70 bg-yellow-300/5 px-3 py-2 text-xs font-mono font-bold text-yellow-300">
                    {editingPurchase?.whatsapp_sent_at ? editingPurchase.purchase_number : 'Pending'}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">The ID is generated after the WhatsApp message is opened.</p>
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
              <div className="relative">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Product Name *
                </label>
                <input
                  ref={productNameInputRef}
                  type="text"
                  value={formProductName}
                  onChange={(e) => handleProductSearch(e.target.value)}
                  onFocus={() => {
                    const currentVal = productNameInputRef.current?.value || '';
                    if (currentVal.trim()) {
                      const searchTerm = currentVal.toLowerCase();
                      const matches = storeProducts.filter((p) =>
                        p.name.toLowerCase().includes(searchTerm)
                      );
                      setProductSearchResults(matches);
                    } else {
                      setProductSearchResults(storeProducts);
                    }
                    setShowProductDropdown(true);
                  }}
                  onBlur={() => {
                    // Delay hiding dropdown to allow click on dropdown items
                    setTimeout(() => setShowProductDropdown(false), 200);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (showProductDropdown && productSearchResults.length > 0) {
                        const topMatch = productSearchResults[0];
                        handleSelectProductFromList(topMatch.name, topMatch.wholesale_price);
                      } else {
                        handleAddProductToPurchase();
                      }
                    }
                  }}
                  placeholder="E.G. P9 Wireless Headphones (Search or Type & Press Enter)"
                  className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs font-semibold text-white focus:border-[#00C4CC] focus:outline-none"
                />
                
                {/* Product Search Dropdown */}
                {showProductDropdown && (
                  <div className="absolute z-20 w-full mt-1 rounded-xl border border-slate-700 bg-[#080D15] shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-800/80">
                    <div className="px-3 py-1.5 bg-[#0C1420] text-[10px] font-bold text-[#00C4CC] uppercase tracking-wider sticky top-0 border-b border-slate-800 flex justify-between items-center z-10">
                      <span>Available Products ({productSearchResults.length})</span>
                      <span className="text-slate-400 font-normal">Click any item to add</span>
                    </div>
                    {productSearchResults.length > 0 ? (
                      productSearchResults.map((sp) => (
                        <button
                          type="button"
                          key={sp.id}
                          onMouseDown={(e) => {
                            e.preventDefault(); // Prevents onBlur from closing before click
                            handleSelectProductFromList(sp.name, sp.wholesale_price);
                          }}
                          className="w-full text-left px-3 py-2.5 text-xs text-white hover:bg-slate-800/80 transition flex items-center justify-between group"
                        >
                          <div>
                            <div className="font-semibold text-white group-hover:text-[#00C4CC] transition">{sp.name}</div>
                            {sp.wholesale_price ? (
                              <div className="text-[10px] text-slate-400">Wholesale: PKR {sp.wholesale_price.toLocaleString()}</div>
                            ) : null}
                          </div>
                          <span className="text-[10px] font-bold text-[#00C4CC] bg-[#00C4CC]/10 border border-[#00C4CC]/30 px-2 py-0.5 rounded-lg group-hover:bg-[#00C4CC] group-hover:text-black transition shrink-0 ml-2">
                            + Add Item
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center">
                        <div className="text-xs text-slate-400 mb-2">Product not found in database</div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAiModalOpen(true);
                            setShowProductDropdown(false);
                          }}
                          className="w-full rounded-xl border border-[#00C4CC]/50 bg-[#00C4CC]/10 px-3 py-2 text-xs font-bold text-[#00C4CC] hover:bg-[#00C4CC]/20 transition flex items-center justify-center gap-2"
                        >
                          <span>✨</span>
                          <span>Generate New Product with AI</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddProductToPurchase();
                      }
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs font-mono font-bold text-white focus:border-[#00C4CC] focus:outline-none"
                  />
                </div>

                {/* Payment Status */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Payment Status *
                  </label>
                  <select
                    value={formPaymentStatus}
                    onChange={(e) => setFormPaymentStatus(e.target.value as 'unpaid' | 'partial' | 'paid')}
                    className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs font-bold text-white focus:border-[#00C4CC] focus:outline-none"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial Payment</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs font-bold text-white focus:border-[#00C4CC] focus:outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="easypaisa">Easypaisa</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Payment Due Date */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-yellow-200 mb-1">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={formPaymentDueDate}
                    onChange={(e) => setFormPaymentDueDate(e.target.value)}
                    className="w-full rounded-xl border border-orange-400/50 bg-[#080D15] px-3 py-2 text-xs font-mono font-bold text-orange-300 focus:border-yellow-300 focus:outline-none"
                  />
                  <span className="mt-1 block text-[10px] text-slate-500">Date you plan to pay the balance</span>
                </div>

                {/* Amount Paid */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Amount Paid (PKR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formAmountPaid}
                    onChange={(e) => setFormAmountPaid(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:border-[#00C4CC] focus:outline-none"
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddProductToPurchase();
                      }
                    }}
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

              {/* Product Notes */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Product Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formProductNotes}
                  onChange={(e) => setFormProductNotes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddProductToPurchase();
                    }
                  }}
                  placeholder="E.G. Black color model, deliver before 5 PM (Press Enter to add to list)"
                  className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3 py-2 text-xs text-white focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              {/* Multiple Products Section */}
              {purchaseItems.length > 0 && (
                <div className="rounded-xl border border-[#00C4CC]/30 bg-[#00C4CC]/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#00C4CC] flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#00C4CC]/10 text-[10px]">📦</span>
                      Products in This Purchase ({purchaseItems.length})
                    </h3>
                    <span className="text-xs font-mono font-bold text-[#00C4CC]">
                      Total: PKR {purchaseItems.reduce((sum, item) => sum + (item.wholesale_cost * item.quantity), 0).toLocaleString('en-PK')}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {purchaseItems.map((item, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-700 bg-[#080D15] p-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={item.product_name}
                            onChange={(e) => handleUpdatePurchaseItem(index, 'product_name', e.target.value)}
                            className="font-semibold text-white text-xs bg-transparent border-b border-slate-800 hover:border-slate-600 focus:border-[#00C4CC] focus:outline-none w-full py-0.5"
                            placeholder="Product Name"
                          />
                          {item.notes && (
                            <div className="text-[10px] text-slate-400 truncate mt-1">📝 {item.notes}</div>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                          {/* Quantity Controls */}
                          <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden bg-[#0C1420]">
                            <button
                              type="button"
                              onClick={() => handleUpdatePurchaseItem(index, 'quantity', Math.max(1, item.quantity - 1))}
                              className="px-2 py-1 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => handleUpdatePurchaseItem(index, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                              className="w-10 text-center text-xs font-mono font-bold text-white bg-transparent focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdatePurchaseItem(index, 'quantity', item.quantity + 1)}
                              className="px-2 py-1 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            >
                              +
                            </button>
                          </div>

                          {/* Wholesale Price Input */}
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 font-mono">PKR</span>
                            <input
                              type="number"
                              min={0}
                              value={item.wholesale_cost}
                              onChange={(e) => handleUpdatePurchaseItem(index, 'wholesale_cost', Math.max(0, Number(e.target.value) || 0))}
                              className="w-20 rounded-lg border border-slate-700 bg-[#0C1420] px-2 py-1 text-xs font-mono font-bold text-[#00C4CC] focus:border-[#00C4CC] focus:outline-none"
                              placeholder="Price"
                            />
                          </div>

                          {/* Line Total */}
                          <div className="text-right min-w-[75px]">
                            <div className="text-xs font-mono font-bold text-white">
                              PKR {(item.wholesale_cost * item.quantity).toLocaleString('en-PK')}
                            </div>
                          </div>

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => handleRemovePurchaseItem(index)}
                            className="rounded-lg border border-rose-900/60 bg-rose-950/20 p-1.5 text-xs font-semibold text-rose-400 hover:border-rose-600 hover:bg-rose-900/40 transition"
                            title="Remove item"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Calculation Display */}
              <div className="flex flex-col gap-2 rounded-xl border border-orange-400/35 bg-[linear-gradient(100deg,rgba(251,146,60,0.14),rgba(253,224,71,0.07))] p-3 text-xs font-bold text-orange-300">
                <div className="flex items-center justify-between">
                  <span>Total Bill Cost:</span>
                  <span className="font-mono text-sm font-black text-white">
                    PKR {totalPurchaseCost.toLocaleString('en-PK')}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-orange-400/20 pt-2">
                  <span className="text-emerald-400">Total Amount Paid:</span>
                  <span className="font-mono text-sm font-black text-emerald-400">
                    - PKR {(formAmountPaid || 0).toLocaleString('en-PK')}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-orange-400/20 pt-2">
                  <span className="text-rose-400">Pending Balance:</span>
                  <span className="font-mono text-sm font-black text-rose-400">
                    PKR {Math.max(0, totalPurchaseCost - (formAmountPaid || 0)).toLocaleString('en-PK')}
                  </span>
                </div>
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
                  className="cursor-pointer rounded-xl bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-300 px-5 py-2 text-xs font-black text-slate-950 shadow-[0_8px_22px_rgba(251,146,60,0.22)] transition hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingPurchase ? 'Update Record' : 'Save Purchase Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WHATSAPP MESSAGE OPTIONS MODAL */}
      {whatsAppPurchase && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#02050a]/85 p-4 backdrop-blur-lg animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setWhatsAppPurchase(null)} />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-[22px] border border-[#00AEEF]/45 bg-[#07101B] text-[#C9D2DB] shadow-[0_0_0_1px_rgba(0,174,239,0.08),0_24px_80px_rgba(0,0,0,0.7),0_0_42px_rgba(0,174,239,0.16)] max-h-[90vh] overflow-y-auto">
            <div className="relative border-b border-[#1a4057] bg-[radial-gradient(circle_at_18%_0%,rgba(0,174,239,0.24),transparent_42%),linear-gradient(135deg,#0b2234,#07101b_70%)] px-5 pb-5 pt-5">
              <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full border border-[#00AEEF]/20" />
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[#00AEEF] bg-[#02050a] p-1 shadow-[0_0_18px_rgba(0,174,239,0.55)]">
                    <Image src={profile.logo_url || '/images/logo.png'} alt="STH Gadgets" fill className="object-contain" sizes="56px" />
                  </div>
                  <div>
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#36C5FF]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#25D366] shadow-[0_0_8px_#25D366]" /> WhatsApp communication
                    </span>
                    <h2 className="mt-1 font-display text-lg font-black tracking-wide text-white">Vendor Message</h2>
                    <p className="mt-0.5 text-[11px] text-[#8fb6c9]">Voltix Mobile · Select message type</p>
                  </div>
                </div>
                <button onClick={() => setWhatsAppPurchase(null)} className="rounded-xl border border-white/10 bg-black/15 p-2 text-slate-400 transition hover:border-[#36C5FF]/50 hover:text-white" title="Close">
                ✕
                </button>
              </div>
              <div className="relative mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                <div className="min-w-0">
                  <span className="block truncate text-xs font-black text-white">{whatsAppPurchase.product_name}</span>
                  <span className="mt-0.5 block text-[10px] font-mono text-[#8fb6c9]">{whatsAppPurchase.purchase_number} · Qty {whatsAppPurchase.quantity}</span>
                </div>
                <span className="ml-3 shrink-0 rounded-full border border-[#00AEEF]/30 bg-[#00AEEF]/10 px-2 py-1 text-[10px] font-bold text-[#36C5FF]">PKR {(Number(whatsAppPurchase.wholesale_cost) * Number(whatsAppPurchase.quantity)).toLocaleString('en-PK')}</span>
              </div>
            </div>

            <div className="space-y-2.5 p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-300">Select Message Type</span>
                <span className="text-[10px] text-slate-500">Message ready to send</span>
              </div>
              {([
                ['purchase_order', 'Purchase Order', 'Send new purchase order to vendor with delivery timeline.', '📦'],
                ['due_date_reminder', 'Due Date Reminder', 'Remind vendor about payment due date and confirm.', '📅'],
                ['due_date', 'Payment Due Date', 'Tell the vendor when the remaining amount will be paid.', '📅'],
                ['partial_payment', 'Partial Payment', 'Send paid and remaining balance details.', '💳'],
                ['payment_confirmation', 'Payment Confirmation', 'Confirm the current payment record.', '✓'],
              ] as const).map(([value, label, description, icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setWhatsAppAction(value)}
                  className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${whatsAppAction === value ? 'border-[#00AEEF] bg-[linear-gradient(105deg,rgba(0,174,239,0.18),rgba(0,174,239,0.04))] shadow-[0_0_18px_rgba(0,174,239,0.12)]' : 'border-[#173447] bg-[#08131f] hover:border-[#00AEEF]/60 hover:bg-[#0b1d2b]'}`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${whatsAppAction === value ? 'bg-[#00AEEF]/20 text-[#36C5FF]' : 'bg-[#102638] text-slate-400 group-hover:text-[#36C5FF]'}`}>{icon}</span>
                  <span className="min-w-0 flex-1"><span className="block text-xs font-black text-white">{label}</span><span className="mt-0.5 block text-[11px] text-slate-400">{description}</span></span>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${whatsAppAction === value ? 'border-[#00AEEF] bg-[#00AEEF] text-[#021019]' : 'border-slate-600 text-transparent'}`}>✓</span>
                </button>
              ))}

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#173447] pt-4">
                <span className="text-[10px] leading-4 text-slate-500">The selected message will open in WhatsApp with details filled in.</span>
                <button type="button" onClick={() => setWhatsAppPurchase(null)} className="shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-400 hover:text-white">
                Cancel
                </button>
                <button type="button" onClick={sendWhatsAppMessage} className="flex shrink-0 items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-black text-white shadow-[0_8px_20px_rgba(37,211,102,0.2)] transition hover:bg-[#20BD5A] hover:shadow-[0_8px_26px_rgba(37,211,102,0.35)]">
                  <span className="text-base">↗</span> Open WhatsApp
                </button>
              </div>
            </div>
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
                    <Image src={profLogoUrl || '/images/logo.png'} alt="Logo Preview" fill className="object-contain" sizes="48px" />
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

      {/* AI Product Generation Modal */}
      <AiProductGenerationModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        productName={formProductName}
        onProductCreated={handleAiProductCreated}
      />
    </div>
  );
}
