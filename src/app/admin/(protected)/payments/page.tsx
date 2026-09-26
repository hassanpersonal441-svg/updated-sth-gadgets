'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Payment, PaymentAccount, Settings } from '@/types/database';
import { useToast } from '@/context/ToastContext';
import { formatOrderDateTime, formatNumber } from '@/lib/utils';

const STATUS_FILTERS = [
  { id: 'all', label: 'All Payments' },
  { id: 'awaiting_payment', label: 'Awaiting Payment' },
  { id: 'screenshot_sent', label: 'Screenshot Sent' },
  { id: 'under_verification', label: 'Under Verification' },
  { id: 'paid', label: 'Paid' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'cancelled', label: 'Cancelled' },
];

const PRESET_METHODS = [
  { name: 'JazzCash', icon: '/images/payment-jazzcash.png', instructions: 'Transfer to JazzCash account and share screenshot on WhatsApp with your Order ID.' },
  { name: 'Easypaisa', icon: '/images/payment-easypaisa.png', instructions: 'Send amount via Easypaisa mobile app and share transaction screenshot on WhatsApp.' },
  { name: 'Meezan Bank', icon: '/images/payment-meezan.png', instructions: 'Transfer via online banking / Raast ID to Meezan Bank account and share confirmation screenshot.' },
  { name: 'SadaPay', icon: '/images/payment-sadapay.png', instructions: 'Send payment via SadaPay account / IBAN and share transaction screenshot on WhatsApp.' },
  { name: 'NayaPay', icon: '/images/payment-nayapay.png', instructions: 'Transfer via NayaPay app or Raast to NayaPay account and share screenshot.' },
  { name: 'Bank Transfer (Other)', icon: '🏛️', instructions: 'Transfer exact order amount to the bank account above and send proof to WhatsApp.' },
];

// Helper function to get logo path for payment methods
function getPaymentMethodLogo(methodName: string): string {
  const lowerName = (methodName || '').toLowerCase();
  if (lowerName.includes('jazz')) return '/images/payment-jazzcash.png';
  if (lowerName.includes('easy') || lowerName.includes('paisa')) return '/images/payment-easypaisa.png';
  if (lowerName.includes('meezan')) return '/images/payment-meezan.png';
  if (lowerName.includes('sada')) return '/images/payment-sadapay.png';
  if (lowerName.includes('naya')) return '/images/payment-nayapay.png';
  return ''; // Return empty string for others to fall back to emoji
}

// Helper function to get fallback emoji for payment methods
function getPaymentMethodEmoji(methodName: string): string {
  const lowerName = methodName.toLowerCase();
  if (lowerName.includes('jazz')) return '📱';
  if (lowerName.includes('easy')) return '📲';
  if (lowerName.includes('bank') || lowerName.includes('meezan')) return '🏦';
  if (lowerName.includes('sada')) return '💳';
  if (lowerName.includes('naya')) return '🟢';
  return '🏛️';
}

export default function AdminPaymentsPage() {
  const { success, error: showErrorToast } = useToast();
  const [activeTab, setActiveTab] = useState<'verifications' | 'accounts'>('verifications');
  
  // Verification states
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentToVerify, setPaymentToVerify] = useState<Payment | null>(null);
  const [paymentToReject, setPaymentToReject] = useState<Payment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [createInvoice, setCreateInvoice] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Settings & Payment Accounts states
  const [settings, setSettings] = useState<Settings | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [isSavingAccounts, setIsSavingAccounts] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);
  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number>(0);

  // Form State for Adding / Editing Account
  const [accountFormData, setAccountFormData] = useState<{
    id?: string;
    payment_method_name: string;
    account_name: string;
    account_number: string;
    bank_name: string;
    whatsapp_number: string;
    instructions: string;
    is_active: boolean;
  }>({
    payment_method_name: 'JazzCash',
    account_name: '',
    account_number: '',
    bank_name: '',
    whatsapp_number: '',
    instructions: 'Send payment to the account above and share screenshot to WhatsApp for verification.',
    is_active: true,
  });

  async function fetchPayments() {
    setLoading(true);
    try {
      const url = selectedFilter === 'all' 
        ? '/api/admin/payments' 
        : `/api/admin/payments?status=${selectedFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.payments) {
        setPayments(data.payments);
      }
    } catch {
      showErrorToast('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }

  async function fetchSettings() {
    setAccountsLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
        setFreeDeliveryThreshold(data.settings.online_payment_free_delivery_threshold ?? 0);
      }
    } catch {
      showErrorToast('Failed to load payment accounts');
    } finally {
      setAccountsLoading(false);
    }
  }

  useEffect(() => {
    fetchPayments();
  }, [selectedFilter]);

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save updated payment accounts
  async function handleSavePaymentAccounts(updatedAccounts: PaymentAccount[], onlineEnabled?: boolean) {
    setIsSavingAccounts(true);
    try {
      const payload: any = {
        payment_accounts: updatedAccounts,
      };
      if (onlineEnabled !== undefined) {
        payload.online_payment_enabled = onlineEnabled;
      }

      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update payment accounts');
      }

      setSettings((prev) => prev ? {
        ...prev,
        payment_accounts: updatedAccounts,
        online_payment_enabled: onlineEnabled !== undefined ? onlineEnabled : prev.online_payment_enabled,
      } : null);

      success('Payment accounts updated successfully!');
      return true;
    } catch (err: any) {
      showErrorToast(err.message || 'Error saving payment accounts');
      return false;
    } finally {
      setIsSavingAccounts(false);
    }
  }

  function openAddAccountModal() {
    setEditingAccount(null);
    setAccountFormData({
      payment_method_name: 'JazzCash',
      account_name: '',
      account_number: '',
      bank_name: '',
      whatsapp_number: '',
      instructions: 'Transfer payment to this account and share screenshot on WhatsApp with your Order ID.',
      is_active: true,
    });
    setShowAccountModal(true);
  }

  function openEditAccountModal(account: PaymentAccount) {
    setEditingAccount(account);
    setAccountFormData({
      id: account.id,
      payment_method_name: account.payment_method_name,
      account_name: account.account_name,
      account_number: account.account_number,
      bank_name: account.bank_name || '',
      whatsapp_number: account.whatsapp_number || '',
      instructions: account.instructions,
      is_active: account.is_active,
    });
    setShowAccountModal(true);
  }

  async function handleSaveAccountForm(e: React.FormEvent) {
    e.preventDefault();
    if (!accountFormData.payment_method_name.trim() || !accountFormData.account_name.trim() || !accountFormData.account_number.trim()) {
      showErrorToast('Please fill in Provider, Account Name, and Account Number.');
      return;
    }

    const currentAccounts = settings?.payment_accounts || [];
    let updatedAccounts: PaymentAccount[];

    if (editingAccount) {
      // Edit existing
      updatedAccounts = currentAccounts.map((acc) =>
        acc.id === editingAccount.id
          ? {
              ...acc,
              payment_method_name: accountFormData.payment_method_name.trim(),
              account_name: accountFormData.account_name.trim(),
              account_number: accountFormData.account_number.trim(),
              bank_name: accountFormData.bank_name.trim() || null,
              whatsapp_number: accountFormData.whatsapp_number.trim() || null,
              instructions: accountFormData.instructions.trim(),
              is_active: accountFormData.is_active,
            }
          : acc
      );
    } else {
      // Add new
      const newAccount: PaymentAccount = {
        id: crypto.randomUUID(),
        name: accountFormData.payment_method_name.trim(),
        payment_method_name: accountFormData.payment_method_name.trim(),
        account_name: accountFormData.account_name.trim(),
        account_number: accountFormData.account_number.trim(),
        bank_name: accountFormData.bank_name.trim() || null,
        whatsapp_number: accountFormData.whatsapp_number.trim() || null,
        instructions: accountFormData.instructions.trim(),
        is_active: accountFormData.is_active,
        sort_order: currentAccounts.length + 1,
      };
      updatedAccounts = [...currentAccounts, newAccount];
    }

    const ok = await handleSavePaymentAccounts(updatedAccounts);
    if (ok) {
      setShowAccountModal(false);
      setEditingAccount(null);
    }
  }

  async function handleDeleteAccount(accountId: string) {
    if (!confirm('Are you sure you want to remove this payment account?')) return;
    const currentAccounts = settings?.payment_accounts || [];
    const updatedAccounts = currentAccounts.filter((acc) => acc.id !== accountId);
    await handleSavePaymentAccounts(updatedAccounts);
  }

  async function handleToggleAccountActive(accountId: string) {
    const currentAccounts = settings?.payment_accounts || [];
    const updatedAccounts = currentAccounts.map((acc) =>
      acc.id === accountId ? { ...acc, is_active: !acc.is_active } : acc
    );
    await handleSavePaymentAccounts(updatedAccounts);
  }

  async function handleToggleGlobalOnlinePayment() {
    const newStatus = !settings?.online_payment_enabled;
    await handleSavePaymentAccounts(settings?.payment_accounts || [], newStatus);
  }

  async function handleSaveFreeDeliverySettings() {
    setIsSavingAccounts(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          online_payment_free_delivery_threshold: freeDeliveryThreshold,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update free delivery settings');
      }

      setSettings((prev) => prev ? {
        ...prev,
        online_payment_free_delivery_threshold: freeDeliveryThreshold,
      } : null);

      success('Free delivery settings updated successfully!');
    } catch (err: any) {
      showErrorToast(err.message || 'Error saving free delivery settings');
    } finally {
      setIsSavingAccounts(false);
    }
  }

  async function handleCopyNumber(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedAccountId(id);
    setTimeout(() => setCopiedAccountId(null), 2000);
  }

  // Payment verification actions
  async function handleVerifyPayment() {
    if (!paymentToVerify) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/payments/${paymentToVerify.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ create_invoice: createInvoice }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to verify payment');
      }

      const message = data.invoice 
        ? 'Payment verified successfully! Invoice created automatically.'
        : 'Payment verified successfully!';
      success(message);
      setPaymentToVerify(null);
      fetchPayments();
    } catch (err: any) {
      showErrorToast(err.message || 'Error verifying payment');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectPayment() {
    if (!paymentToReject) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/payments/${paymentToReject.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: rejectionReason }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reject payment');
      }

      success('Payment rejected successfully.');
      setPaymentToReject(null);
      setRejectionReason('');
      setShowRejectModal(false);
      fetchPayments();
    } catch (err: any) {
      showErrorToast(err.message || 'Error rejecting payment');
    } finally {
      setActionLoading(false);
    }
  }

  const filteredPayments = payments.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.customer_name.toLowerCase().includes(q) ||
      p.payment_reference.toLowerCase().includes(q) ||
      p.payment_method.toLowerCase().includes(q)
    );
  });

  const pendingVerificationCount = useMemo(() => {
    return payments.filter((p) => p.status === 'screenshot_sent' || p.status === 'under_verification').length;
  }, [payments]);

  const activeAccountsCount = useMemo(() => {
    return (settings?.payment_accounts || []).filter((a) => a.is_active).length;
  }, [settings?.payment_accounts]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
      case 'rejected': return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
      case 'under_verification': return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
      case 'screenshot_sent': return 'text-blue-400 bg-blue-500/15 border-blue-500/30';
      default: return 'text-slate-400 bg-slate-500/15 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-silver-bright">
            Online Payment Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-silver-dim">
            Add multiple payment accounts (JazzCash, Easypaisa, Banks) and verify customer payment screenshots
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openAddAccountModal}
            className="flex items-center gap-2 rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] px-4 py-2.5 text-xs sm:text-sm font-display font-black text-slate-950 shadow-md transition hover:scale-[1.02]"
          >
            <span>💳</span>
            <span>+ Add Payment Account</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('verifications')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
            activeTab === 'verifications'
              ? 'border-[#00C4CC] text-[#00C4CC] bg-[#00C4CC]/5'
              : 'border-transparent text-silver-dim hover:text-silver-bright'
          }`}
        >
          <span>🧾 Payment Verifications</span>
          {pendingVerificationCount > 0 && (
            <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold animate-pulse">
              {pendingVerificationCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
            activeTab === 'accounts'
              ? 'border-[#00C4CC] text-[#00C4CC] bg-[#00C4CC]/5'
              : 'border-transparent text-silver-dim hover:text-silver-bright'
          }`}
        >
          <span>💳 Payment Accounts ({settings?.payment_accounts?.length || 0})</span>
          {settings?.online_payment_enabled ? (
            <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">
              Enabled
            </span>
          ) : (
            <span className="rounded-full bg-slate-800 text-slate-400 px-2 py-0.5 text-[10px] font-bold">
              Disabled
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: PAYMENT ACCOUNTS MANAGEMENT */}
      {activeTab === 'accounts' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Global Online Payment Toggle Banner */}
          <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌐</span>
                <h3 className="font-display text-sm sm:text-base font-bold text-white">
                  Storefront & Checkout Online Payments
                </h3>
                {settings?.online_payment_enabled ? (
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                    Active on Storefront
                  </span>
                ) : (
                  <span className="rounded-full bg-rose-500/15 border border-rose-500/40 px-2.5 py-0.5 text-[11px] font-bold text-rose-300">
                    Offline / Disabled
                  </span>
                )}
              </div>
              <p className="text-xs text-silver-dim max-w-2xl">
                When enabled, customers can select from your configured online accounts (JazzCash, Easypaisa, Bank) in the checkout modal and product direct order flow.
              </p>
            </div>

            <button
              type="button"
              disabled={isSavingAccounts}
              onClick={handleToggleGlobalOnlinePayment}
              className={`px-5 py-2.5 rounded-xl font-display text-xs sm:text-sm font-bold transition shadow-md shrink-0 ${
                settings?.online_payment_enabled
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-[#00C4CC] text-slate-950 hover:bg-[#00B2B9]'
              }`}
            >
              {isSavingAccounts ? 'Saving...' : settings?.online_payment_enabled ? 'Disable Online Payments' : 'Enable Online Payments'}
            </button>
          </div>

          {/* Free Delivery for Online Payment Settings */}
          <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚚</span>
              <h3 className="font-display text-sm sm:text-base font-bold text-white">
                Free Delivery for Online Payment
              </h3>
            </div>
            <p className="text-xs text-silver-dim max-w-2xl">
              Set a threshold amount for free delivery when customers pay via online payment methods.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 max-w-sm">
                <label className="block text-xs font-semibold text-silver-dim mb-1.5">
                  Online Payment Free Delivery Threshold (PKR)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={freeDeliveryThreshold}
                    onChange={(e) => setFreeDeliveryThreshold(parseInt(e.target.value) || 0)}
                    disabled={isSavingAccounts}
                    className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-3.5 py-2 text-xs sm:text-sm text-silver-bright placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none"
                  />
                  <span className="text-xs text-silver-dim whitespace-nowrap">PKR</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveFreeDeliverySettings}
                disabled={isSavingAccounts}
                className="rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] px-4 py-2 font-display text-xs font-bold text-white shadow-md transition disabled:opacity-50"
              >
                {isSavingAccounts ? 'Saving...' : 'Save Threshold'}
              </button>
            </div>
            <div className="text-xs text-silver-dim">
              {settings?.online_payment_free_delivery_threshold && settings.online_payment_free_delivery_threshold > 0 ? (
                <span className="text-emerald-400">
                  ✓ Free delivery for orders over PKR {settings.online_payment_free_delivery_threshold.toLocaleString('en-PK')}
                </span>
              ) : (
                <span className="text-slate-400">
                  Standard delivery charges apply
                </span>
              )}
            </div>
          </div>



          {/* Payment Accounts Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-silver-bright flex items-center gap-2">
                <span>💳</span> Configured Payment Accounts ({settings?.payment_accounts?.length || 0})
              </h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPresetModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#00C4CC] hover:bg-[#00E0E8] px-3 py-1.5 text-xs font-display font-bold text-slate-950 shadow-md transition hover:scale-[1.02]"
                >
                  <span>⚡</span>
                  <span>Quick Add</span>
                </button>
                <button
                  onClick={openAddAccountModal}
                  className="text-xs font-bold text-[#00C4CC] hover:underline"
                >
                  + Add Custom Account
                </button>
              </div>
            </div>

            {accountsLoading ? (
              <div className="flex items-center justify-center py-16 text-silver-dim gap-2">
                <span className="h-5 w-5 rounded-full border-2 border-[#00C4CC] border-t-transparent animate-spin"></span>
                <span className="text-sm">Loading accounts...</span>
              </div>
            ) : !settings?.payment_accounts || settings.payment_accounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0C1420]/60 p-12 text-center space-y-4">
                <span className="text-4xl block">💳</span>
                <div>
                  <h4 className="font-display text-base font-bold text-silver-bright">No Payment Accounts Configured</h4>
                  <p className="text-xs text-silver-dim mt-1 max-w-md mx-auto">
                    Add your JazzCash, Easypaisa, Meezan Bank, or other bank account details so customers can transfer money directly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openAddAccountModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#00C4CC] px-5 py-2.5 font-display text-xs font-black text-slate-950 shadow-md hover:bg-[#00B2B9] transition"
                >
                  <span>+ Add First Payment Account</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {settings.payment_accounts.map((account) => (
                  <div
                    key={account.id}
                    className={`rounded-2xl border transition flex flex-col justify-between p-5 space-y-4 shadow-sm ${
                      account.is_active
                        ? 'border-slate-800 bg-[#0C1420] hover:border-[#00C4CC]/50'
                        : 'border-slate-800/60 bg-[#080D15] opacity-60'
                    }`}
                  >
                    <div>
                      {/* Top Row: Provider & Active Badge */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div className="flex items-center gap-2">
                          {getPaymentMethodLogo(account.payment_method_name) ? (
                            <Image 
                              src={getPaymentMethodLogo(account.payment_method_name)} 
                              alt={account.payment_method_name} 
                              width={36} 
                              height={36} 
                              className="rounded-lg object-contain shrink-0"
                            />
                          ) : (
                            <span className="text-xl">
                              {getPaymentMethodEmoji(account.payment_method_name)}
                            </span>
                          )}
                          <div>
                            <h4 className="font-display text-sm font-bold text-white leading-tight">
                              {account.payment_method_name}
                            </h4>
                            <span className="text-[10px] text-silver-dim">
                              {account.name || 'Online Transfer'}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            account.is_active
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {account.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </div>

                      {/* Account Details */}
                      <div className="mt-3.5 space-y-2 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-silver-dim block">
                            Account Title:
                          </span>
                          <span className="font-semibold text-silver-bright block text-sm mt-0.5">
                            {account.account_name}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-silver-dim block">
                            Account Number / IBAN:
                          </span>
                          <div className="flex items-center justify-between gap-2 rounded-lg bg-[#080D15] border border-slate-700/80 px-2.5 py-1.5 mt-0.5">
                            <span className="font-mono font-bold text-[#00C4CC] text-xs truncate">
                              {account.account_number}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyNumber(account.id, account.account_number)}
                              className="text-[10px] text-silver-dim hover:text-white shrink-0 font-semibold px-1.5 py-0.5 rounded bg-slate-800"
                            >
                              {copiedAccountId === account.id ? '✓ Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>

                        {account.bank_name && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-silver-dim block">
                              Bank Name:
                            </span>
                            <span className="font-semibold text-silver-bright block text-sm mt-0.5">
                              {account.bank_name}
                            </span>
                          </div>
                        )}

                        {account.whatsapp_number && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-silver-dim block">
                              WhatsApp Number:
                            </span>
                            <div className="flex items-center justify-between gap-2 rounded-lg bg-[#080D15] border border-slate-700/80 px-2.5 py-1.5 mt-0.5">
                              <span className="font-mono font-bold text-silver-bright text-xs truncate">
                                {account.whatsapp_number}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyNumber(account.id, account.whatsapp_number || '')}
                                className="text-[10px] text-silver-dim hover:text-white shrink-0 font-semibold px-1.5 py-0.5 rounded bg-slate-800"
                              >
                                {copiedAccountId === account.id ? '✓ Copied' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        )}

                        {account.instructions && (
                          <div className="pt-1">
                            <span className="text-[10px] uppercase font-bold text-silver-dim block mb-1">
                              Instructions:
                            </span>
                            <p className="text-[11px] text-silver-dim leading-relaxed bg-[#080D15]/60 rounded-lg p-2 border border-slate-800 line-clamp-3">
                              {account.instructions}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80 text-xs">
                      <button
                        type="button"
                        onClick={() => handleToggleAccountActive(account.id)}
                        className={`text-xs font-semibold transition ${
                          account.is_active ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'
                        }`}
                      >
                        {account.is_active ? 'Disable' : 'Enable'}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditAccountModal(account)}
                          className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-silver-bright hover:text-[#00C4CC] hover:border-[#00C4CC] transition"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(account.id)}
                          className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VERIFICATIONS LIST VIEW */}
      {activeTab === 'verifications' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-800 bg-[#0C1420] p-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, reference, or method..."
                className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] py-2 pl-4 pr-10 text-xs sm:text-sm text-silver-bright placeholder:text-silver-dim/50 focus:border-[#00C4CC] focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-silver-dim hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-silver-dim">Status:</span>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="rounded-xl border border-slate-700/80 bg-[#080D15] px-3 py-2 text-xs font-semibold text-silver-bright focus:border-[#00C4CC] focus:outline-none"
              >
                {STATUS_FILTERS.map((filter) => (
                  <option key={filter.id} value={filter.id}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payments List */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0C1420] shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-silver-dim gap-2">
                <span className="h-5 w-5 rounded-full border-2 border-[#00C4CC] border-t-transparent animate-spin"></span>
                <span className="text-sm">Loading payments...</span>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="py-20 text-center text-silver-dim space-y-2">
                <span className="text-3xl block">🧾</span>
                <p className="text-base font-semibold text-silver-bright">No payments found</p>
                <p className="mt-1 text-xs">Try adjusting your filters or check back later.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-slate-800 bg-[#080D15]/60 text-silver-dim uppercase text-[11px] font-semibold tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Reference</th>
                      <th className="px-5 py-3.5">Customer</th>
                      <th className="px-5 py-3.5">Amount</th>
                      <th className="px-5 py-3.5">Method</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-800/25">
                        <td className="px-5 py-4">
                          <div className="font-mono text-xs text-[#00C4CC]">{payment.payment_reference}</div>
                          {payment.order?.order_number && (
                            <div className="text-xs text-silver-dim mt-1">Order: #{payment.order.order_number}</div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-silver-bright">{payment.customer_name}</div>
                          <div className="text-xs text-silver-dim">{payment.customer_phone}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-display font-bold text-silver-bright">
                            PKR {formatNumber(payment.amount)}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-silver-bright">{payment.payment_method}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusColor(payment.status)}`}>
                            {payment.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-silver-dim">{formatOrderDateTime(payment.created_at).full}</div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {payment.status === 'screenshot_sent' || payment.status === 'under_verification' ? (
                              <>
                                <button
                                  onClick={() => setPaymentToVerify(payment)}
                                  className="rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-500/30 transition"
                                >
                                  Verify
                                </button>
                                <button
                                  onClick={() => {
                                    setPaymentToReject(payment);
                                    setShowRejectModal(true);
                                  }}
                                  className="rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 text-xs font-semibold hover:bg-rose-500/30 transition"
                                >
                                  Reject
                                </button>
                              </>
                            ) : payment.status === 'paid' ? (
                              <span className="text-emerald-400 text-xs font-semibold">✓ Verified</span>
                            ) : payment.status === 'rejected' ? (
                              <span className="text-rose-400 text-xs font-semibold">✗ Rejected</span>
                            ) : (
                              <span className="text-slate-400 text-xs">Waiting</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PAYMENT ACCOUNT */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setShowAccountModal(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0C1420] text-[#C9D2DB] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💳</span>
                <h3 className="font-display text-base font-black tracking-wide text-white">
                  {editingAccount ? 'Edit Payment Account' : 'Add New Payment Account'}
                </h3>
              </div>
              <button
                onClick={() => setShowAccountModal(false)}
                className="text-silver-dim hover:text-white text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAccountForm} className="space-y-4">
              {/* Payment Method Name */}
              <div>
                <label className="block text-xs font-semibold text-silver-dim mb-1">
                  Payment Method / Provider Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JazzCash, Easypaisa, Meezan Bank, SadaPay"
                  value={accountFormData.payment_method_name}
                  onChange={(e) => setAccountFormData({ ...accountFormData, payment_method_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-3.5 py-2 text-xs sm:text-sm text-silver-bright placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none"
                />
              </div>

              {/* Account Title & Account Number Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-silver-dim mb-1">
                    Account Title / Beneficiary Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Muhammad Hassan"
                    value={accountFormData.account_name}
                    onChange={(e) => setAccountFormData({ ...accountFormData, account_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-3.5 py-2 text-xs sm:text-sm text-silver-bright placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-silver-dim mb-1">
                    Account Number / IBAN *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0348-9593671 / PK36MEZN..."
                    value={accountFormData.account_number}
                    onChange={(e) => setAccountFormData({ ...accountFormData, account_number: e.target.value })}
                    className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-3.5 py-2 font-mono text-xs sm:text-sm text-[#00C4CC] placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none"
                  />
                </div>
              </div>

              {/* Bank Name & WhatsApp Number Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-silver-dim mb-1">
                    Bank Name (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Meezan Bank, HBL"
                    value={accountFormData.bank_name}
                    onChange={(e) => setAccountFormData({ ...accountFormData, bank_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-3.5 py-2 text-xs sm:text-sm text-silver-bright placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-silver-dim mb-1">
                    WhatsApp Number (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0326422743"
                    value={accountFormData.whatsapp_number}
                    onChange={(e) => setAccountFormData({ ...accountFormData, whatsapp_number: e.target.value })}
                    className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-3.5 py-2 font-mono text-xs sm:text-sm text-silver-bright placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-semibold text-silver-dim mb-1">
                  Instructions for Customers (shown at checkout & direct purchase)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Send payment and share screenshot on WhatsApp..."
                  value={accountFormData.instructions}
                  onChange={(e) => setAccountFormData({ ...accountFormData, instructions: e.target.value })}
                  className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-3.5 py-2 text-xs text-silver-bright placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none resize-none"
                />
              </div>

              {/* Active Toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={accountFormData.is_active}
                  onChange={(e) => setAccountFormData({ ...accountFormData, is_active: e.target.checked })}
                  className="h-4 w-4 rounded accent-[#00C4CC]"
                />
                <span className="text-xs font-semibold text-silver-bright">
                  Enable this account for customers
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="rounded-xl border border-slate-700 bg-[#080D15] hover:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAccounts}
                  className="rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] px-5 py-2 font-display text-xs font-black text-slate-950 shadow-md transition disabled:opacity-50"
                >
                  {isSavingAccounts ? 'Saving...' : editingAccount ? 'Save Changes' : '+ Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRESET SELECTION */}
      {showPresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setShowPresetModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-[#0C1420] text-[#C9D2DB] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h3 className="font-display text-base font-black tracking-wide text-white">
                  Quick Add Payment Account
                </h3>
              </div>
              <button
                onClick={() => setShowPresetModal(false)}
                className="text-silver-dim hover:text-white text-base"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-silver-dim">
                Select a payment method preset to quickly add a new account
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_METHODS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setEditingAccount(null);
                      setAccountFormData({
                        payment_method_name: preset.name,
                        account_name: '',
                        account_number: '',
                        bank_name: '',
                        whatsapp_number: '',
                        instructions: preset.instructions,
                        is_active: true,
                      });
                      setShowPresetModal(false);
                      setShowAccountModal(true);
                    }}
                    className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-[#080D15] p-3 text-xs font-semibold text-silver-bright hover:border-[#00C4CC] hover:text-[#00C4CC] transition hover:scale-[1.02]"
                  >
                    {preset.icon.startsWith('/') ? (
                      <Image 
                        src={preset.icon} 
                        alt={preset.name} 
                        width={24} 
                        height={24} 
                        className="rounded object-contain shrink-0"
                      />
                    ) : (
                      <span className="text-lg">{preset.icon}</span>
                    )}
                    <span className="truncate">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowPresetModal(false)}
                className="rounded-xl border border-slate-700 bg-[#080D15] hover:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Payment Modal */}
      {paymentToVerify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setPaymentToVerify(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-[#0C1420] text-[#C9D2DB] shadow-2xl p-6 space-y-4">
            <h3 className="font-display text-base font-black tracking-wide text-white">
              Confirm Payment Verification
            </h3>
            <p className="text-xs text-silver-dim">
              Verify payment of PKR {formatNumber(paymentToVerify.amount)} from {paymentToVerify.customer_name} (Ref: {paymentToVerify.payment_reference})
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-silver-bright">
                <input
                  type="checkbox"
                  checked={createInvoice}
                  onChange={(e) => setCreateInvoice(e.target.checked)}
                  className="accent-[#00C4CC]"
                />
                <span>Auto-create Invoice after verification</span>
              </label>
              <p className="text-[11px] text-silver-dim">
                Automatically generate a paid invoice with payment reference for this order
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setPaymentToVerify(null)}
                className="rounded-xl border border-slate-700 bg-[#080D15] hover:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleVerifyPayment}
                className="rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] px-5 py-2 font-display text-xs font-black text-slate-950 shadow-md transition disabled:opacity-50"
              >
                {actionLoading ? 'Verifying...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Payment Modal */}
      {showRejectModal && paymentToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setShowRejectModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-[#0C1420] text-[#C9D2DB] shadow-2xl p-6 space-y-4">
            <h3 className="font-display text-base font-black tracking-wide text-white">
              Reject Payment
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-silver-dim">Customer:</span>
                <span className="font-semibold text-silver-bright">{paymentToReject.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-silver-dim">Amount:</span>
                <span className="font-display font-bold text-[#00C4CC]">PKR {formatNumber(paymentToReject.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-silver-dim">Payment Reference:</span>
                <span className="font-mono text-[#00C4CC]">{paymentToReject.payment_reference}</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-silver-dim mb-2">
                  Rejection Reason (optional):
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-3 py-2 text-xs text-silver-bright focus:border-[#00C4CC] focus:outline-none"
                >
                  <option value="">Select a reason...</option>
                  <option value="Payment not received">Payment not received</option>
                  <option value="Incorrect amount">Incorrect amount</option>
                  <option value="Invalid transaction">Invalid transaction</option>
                  <option value="Screenshot unclear">Screenshot unclear</option>
                  <option value="Duplicate payment">Duplicate payment</option>
                  <option value="Payment could not be verified">Payment could not be verified</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setShowRejectModal(false);
                  setPaymentToReject(null);
                  setRejectionReason('');
                }}
                className="rounded-xl border border-slate-700 bg-[#080D15] hover:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleRejectPayment}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-5 py-2 font-display text-xs font-black text-white shadow-md transition disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
