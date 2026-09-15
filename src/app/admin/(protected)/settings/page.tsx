'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Settings } from '@/types/database';
import ImageUploader, { UploadedImage } from '@/components/admin/ImageUploader';
import { useToast } from '@/context/ToastContext';

// In-memory cache for instant module opening without blocking loading spinner
let cachedSettings: Settings | null = null;

export default function AdminSettingsPage() {
  const { success, error: showErrorToast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(cachedSettings);
  const [logo, setLogo] = useState<UploadedImage[]>(
    cachedSettings?.logo_url ? [{ image_url: cachedSettings.logo_url, is_primary: true }] : []
  );
  const [loading, setLoading] = useState(!cachedSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          cachedSettings = data.settings;
          setSettings(data.settings);
          if (data.settings?.logo_url) setLogo([{ image_url: data.settings.logo_url, is_primary: true }]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, logo_url: logo[0]?.image_url || null }),
      });
      if (res.ok) {
        cachedSettings = { ...settings, logo_url: logo[0]?.image_url || null };
        success('Store & operations settings saved successfully!');
        setMessage('Settings saved successfully!');
      } else {
        showErrorToast('Failed to save settings.');
        setMessage('Failed to save settings.');
      }
    } catch {
      showErrorToast('Failed to save settings.');
      setMessage('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-20 text-silver-dim gap-2">
        <span className="h-4 w-4 rounded-full border-2 border-[#00C4CC] border-t-transparent animate-spin"></span>
        <span className="text-sm">Loading store settings...</span>
      </div>
    );
  }

  const cleanPhone = settings.whatsapp_number.replace(/[^0-9]/g, '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-silver-bright">
          Store & Operations Settings
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-silver-dim">
          Configure WhatsApp order routing, business identity, delivery & promotional policies.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* Business Identity */}
        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800/80 pb-3">
            <span className="text-base">🏢</span>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-silver-bright">
              Brand & Currency
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-silver-dim">Store / Business Name</label>
              <input
                value={settings.business_name}
                onChange={(e) => update('business_name', e.target.value)}
                className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-silver-dim">Store Logo</label>
              <ImageUploader bucket="site-assets" images={logo} onChange={setLogo} multiple={false} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-silver-dim">Currency Code</label>
                <input
                  value={settings.currency}
                  onChange={(e) => update('currency', e.target.value)}
                  className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-silver-dim">Currency Symbol</label>
                <input
                  value={settings.currency_symbol}
                  onChange={(e) => update('currency_symbol', e.target.value)}
                  className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Header & Contact Information */}
        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📄</span>
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-silver-bright">
                Invoice Header & Store Contact Info
              </h2>
            </div>
            <span className="rounded-full bg-[#00C4CC]/10 border border-[#00C4CC]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#00C4CC]">
              Appears on Invoices
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-silver-dim">
                Business Location / Address (Shows on Invoice)
              </label>
              <input
                value={settings.address || ''}
                onChange={(e) => update('address', e.target.value)}
                placeholder="e.g. Lahore, Pakistan"
                className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-silver-dim">
                Printed on top-left of generated customer invoices (e.g. Lahore, Pakistan).
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-silver-dim">
                Phone / WhatsApp Number (Shows on Invoice & Storefront)
              </label>
              <input
                value={settings.whatsapp_number || ''}
                onChange={(e) => update('whatsapp_number', e.target.value)}
                placeholder="e.g. +92 348 9593671"
                className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none font-mono"
              />
              <p className="mt-1 text-[11px] text-silver-dim">
                Printed on invoices under Phone / WhatsApp and used for storefront WhatsApp ordering.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-silver-dim">
                Official Store Email (Shows on Invoice)
              </label>
              <input
                type="email"
                value={settings.email || ''}
                onChange={(e) => update('email', e.target.value)}
                placeholder="e.g. support@sthgadgets.com"
                className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-silver-dim">
                Printed on invoices under Email (e.g. support@sthgadgets.com).
              </p>
            </div>
          </div>
        </div>

        {/* WhatsApp Ordering & Greetings */}
        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800/80 pb-3">
            <span className="text-base">💬</span>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-silver-bright">
              WhatsApp Order Routing & Greeting
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-silver-dim">
                  WhatsApp Destination Number (with Country Code)
                </label>
                {cleanPhone && (
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
                  >
                    <span>📲 Test WhatsApp Chat</span>
                    <span>→</span>
                  </a>
                )}
              </div>
              <input
                value={settings.whatsapp_number}
                onChange={(e) => update('whatsapp_number', e.target.value)}
                placeholder="923489593671"
                className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm font-mono text-[#00C4CC] focus:border-[#00C4CC] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-silver-dim">
                All order chats generated at checkout will be sent directly to this WhatsApp number.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-silver-dim">
                Default Business Greeting / Welcome Message
              </label>
              <input
                value={settings.business_greeting || ''}
                onChange={(e) => update('business_greeting', e.target.value)}
                placeholder="e.g. Hello STH Gadgets! I want to order..."
                className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-silver-dim">
                Greeting used in header chat prompts and floating WhatsApp buttons.
              </p>
            </div>
          </div>
        </div>

        {/* Delivery & Shipping Operational Rules */}
        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🚚</span>
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-silver-bright">
                Delivery & Shipping Policies
              </h2>
            </div>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
              Editable & Live
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-silver-dim">
                Delivery Charges (PKR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-silver-dim">PKR</span>
                <input
                  type="number"
                  min="0"
                  value={settings.delivery_charges ?? 200}
                  onChange={(e) => update('delivery_charges', Number(e.target.value) || 0)}
                  placeholder="200"
                  className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] pl-12 pr-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-silver-dim">
                Standard flat delivery fee applied to orders nationwide.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-silver-dim">
                Free Shipping Threshold (PKR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-silver-dim">PKR</span>
                <input
                  type="number"
                  min="0"
                  value={settings.free_shipping_threshold ?? 5000}
                  onChange={(e) => update('free_shipping_threshold', Number(e.target.value) || 0)}
                  placeholder="5000"
                  className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] pl-12 pr-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-silver-dim">
                Orders equal or above this subtotal get 100% Free Shipping. (Set to 0 to disable).
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-silver-dim">
                Payment Method Title
              </label>
              <input
                type="text"
                value={settings.payment_method_title ?? 'Cash on Delivery (COD)'}
                onChange={(e) => update('payment_method_title', e.target.value)}
                placeholder="Cash on Delivery (COD)"
                className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-silver-dim">
                Primary payment method shown across storefront checkout & footers.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-silver-dim">
                Courier & Logistics Partners
              </label>
              <input
                type="text"
                value={settings.courier_partners ?? 'Trax, Leopard & TCS Couriers'}
                onChange={(e) => update('courier_partners', e.target.value)}
                placeholder="Trax, Leopard & TCS Couriers"
                className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-silver-dim">
                Courier companies used for customer order shipments.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-silver-dim">
                Dispatch Window / Delivery Timeline
              </label>
              <input
                type="text"
                value={settings.dispatch_window ?? '2 – 4 Working Days'}
                onChange={(e) => update('dispatch_window', e.target.value)}
                placeholder="2 – 4 Working Days"
                className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-silver-dim">
                Estimated delivery duration displayed to buyers.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-silver-dim">
                Dispatch & Verification Policy Note
              </label>
              <input
                type="text"
                value={settings.dispatch_note ?? 'Dispatched after WhatsApp verification'}
                onChange={(e) => update('dispatch_note', e.target.value)}
                placeholder="Dispatched after WhatsApp verification"
                className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-silver-dim">
                Order confirmation and dispatch policy note.
              </p>
            </div>
          </div>
        </div>

        {/* Promotions & Automatic Bundle Discounts */}
        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🎁</span>
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-silver-bright">
                Active Promotions & Discounts
              </h2>
            </div>
            <Link
              href="/admin/coupons"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#00C4CC] hover:underline"
            >
              <span>Manage Coupons</span>
              <span>→</span>
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#080D15] p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-base text-amber-400 border border-amber-500/30">
                  2x
                </span>
                <div>
                  <div className="font-semibold text-silver-bright">2 Items Bundle Discount</div>
                  <div className="text-[11px] text-silver-dim">Automatically applied to cart total for 2 items</div>
                </div>
              </div>
              <span className="font-display text-sm font-black text-amber-400">5% OFF</span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#080D15] p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-base text-emerald-400 border border-emerald-500/30">
                  3+
                </span>
                <div>
                  <div className="font-semibold text-silver-bright">3+ Items Bundle Discount</div>
                  <div className="text-[11px] text-silver-dim">Automatically applied to cart total for 3 or more items</div>
                </div>
              </div>
              <span className="font-display text-sm font-black text-emerald-400">10% OFF</span>
            </div>
          </div>
        </div>

        {/* Profit & Pricing Safeguards */}
        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="text-base">🛡️</span>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-silver-bright">
              Profit & Pricing Safeguards
            </h2>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#080D15] p-3.5 cursor-pointer hover:border-slate-700 transition">
            <input
              type="checkbox"
              checked={!!settings.prevent_negative_profit}
              onChange={(e) => update('prevent_negative_profit', e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-[#00C4CC]"
            />
            <div>
              <span className="font-semibold text-xs sm:text-sm text-silver-bright block">
                Prevent Negative-Profit Products
              </span>
              <p className="text-[11px] text-silver-dim mt-0.5">
                When enabled, the product editor will block saving any product where selling price is lower than purchase cost.
              </p>
            </div>
          </label>
        </div>

        {/* WhatsApp Order Template */}
        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2 border-b border-slate-800/80 pb-3">
            <span className="text-base">📝</span>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-silver-bright">
              WhatsApp Order Template
            </h2>
          </div>
          <p className="mb-3 text-xs text-silver-dim">
            Placeholders available: <code className="text-[#00C4CC]">{"{product_name}"}</code>,{' '}
            <code className="text-[#00C4CC]">{"{product_price}"}</code>, <code className="text-[#00C4CC]">{"{quantity}"}</code>,{' '}
            <code className="text-[#00C4CC]">{"{discount}"}</code>, <code className="text-[#00C4CC]">{"{final_price}"}</code>,{' '}
            <code className="text-[#00C4CC]">{"{product_url}"}</code>
          </p>
          <textarea
            rows={8}
            value={settings.order_message_template}
            onChange={(e) => update('order_message_template', e.target.value)}
            className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-3 font-mono text-xs sm:text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
          />
        </div>

        {/* Status Notification */}
        {message && (
          <div
            className={`rounded-xl border p-4 text-xs sm:text-sm font-semibold ${
              message.includes('success')
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
            }`}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] px-6 py-3 font-display text-sm font-bold text-black shadow-[0_0_15px_rgba(0,196,204,0.3)] transition hover:scale-[1.01] disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </form>
    </div>
  );
}
