'use client';

import React, { useState } from 'react';
import { buildWhatsAppOrderLink } from '@/lib/utils';
import QuickWhatsAppModal from '@/components/cart/QuickWhatsAppModal';
import type { Settings } from '@/types/database';

export default function OrderOnWhatsAppButton({
  settings,
  productId,
  productName,
  price,
  quantity = 1,
  discount = 0,
  finalPrice,
  productUrl,
  className,
  compact = false,
}: {
  settings: Settings | null;
  productId: string;
  productName: string;
  price: number;
  quantity?: number;
  discount?: number;
  finalPrice?: number;
  productUrl: string;
  className?: string;
  compact?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const phone = settings?.whatsapp_number && settings.whatsapp_number.trim()
    ? settings.whatsapp_number
    : '+92 348 9593671';

  const defaultLink = buildWhatsAppOrderLink({
    whatsappNumber: phone,
    template: settings?.order_message_template || null,
    productName,
    price,
    quantity,
    discount,
    finalPrice: finalPrice ?? price,
    productUrl,
    currencySymbol: settings?.currency_symbol || 'Rs.',
  });

  async function executeOrderSubmit(
    customerName: string,
    customerPhone: string,
    customerAddress?: string,
    customerCity?: string
  ) {
    let targetUrl = defaultLink;

    try {
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          phone: customerPhone,
          city: customerCity || 'Pakistan',
          address: customerAddress || `Direct WhatsApp Order for "${productName}"`,
          coupon_code: null,
          items: [{ product_id: productId, quantity: quantity || 1 }],
        }),
      });

      const data = await res.json();
      if (data.success && data.whatsappUrl) {
        targetUrl = data.whatsappUrl;
      }
    } catch (err) {
      console.error('Order submit error:', err);
    } finally {
      if (typeof window !== 'undefined') {
        window.location.href = targetUrl;
      }
    }
  }

  async function handleOrderClick(e: React.MouseEvent) {
    e.preventDefault();
    if (loading) return;

    if (typeof window !== 'undefined') {
      const savedPhone = localStorage.getItem('sth_customer_phone');
      const savedName = localStorage.getItem('sth_customer_name') || 'WhatsApp Customer';
      const savedAddress = localStorage.getItem('sth_customer_address');
      const savedCity = localStorage.getItem('sth_customer_city') || 'Pakistan';

      if (savedPhone && savedPhone.trim() && savedAddress && savedAddress.trim()) {
        setLoading(true);
        try {
          await executeOrderSubmit(savedName, savedPhone.trim(), savedAddress.trim(), savedCity);
        } finally {
          setLoading(false);
        }
        return;
      }
    }

    // If no saved phone number or address, open quick modal
    setShowModal(true);
  }

  return (
    <>
      <a
        href={defaultLink}
        onClick={handleOrderClick}
        target="_blank"
        rel="noopener noreferrer"
        className={
          className ||
          `flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] font-display font-bold text-white shadow-sm transition hover:scale-[1.01] ${
            compact ? 'px-3 py-2 text-xs' : 'px-5 py-3 text-sm'
          }`
        }
      >
        <svg viewBox="0 0 32 32" className={compact ? 'h-4 w-4 fill-white' : 'h-5 w-5 fill-white'}>
          <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.34.687 4.52 1.872 6.35L4 29l7.86-1.83A11.94 11.94 0 0016 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3z" />
        </svg>
        <span>{loading ? 'Processing Order...' : 'Order on WhatsApp'}</span>
      </a>

      {showModal && (
        <QuickWhatsAppModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={async (name, phone, address, city) => {
            await executeOrderSubmit(name, phone, address, city);
          }}
          title={`Order ${productName}`}
        />
      )}
    </>
  );
}
