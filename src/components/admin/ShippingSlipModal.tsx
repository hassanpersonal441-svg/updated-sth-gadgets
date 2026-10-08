'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Order } from '@/types/database';
import QRCode from 'react-qr-code';

interface ShippingSlipModalProps {
  order?: Order | null;
  orders?: Order[];
  allOrders?: Order[];
  onClose: () => void;
}

const DEFAULT_SENDER = {
  name: 'STH Gadgets',
  addressLine1: 'Al Makkah store chachu wali sectore 8 near ring road lahore',
  addressLine2: 'Lahore, Punjab, Pakistan - 54660',
  phone: '+92 348 9593671',
};

const COURIER_OPTIONS = [
  'Leopards Courier',
  'PostEx',
  'TCS Express',
];

// Single Slip Card Component matching the exact original screenshot proportions
function SingleSlipCard({
  order,
  sender,
  courier,
  showWeight,
  weightValue,
  getItemImage,
}: {
  order: Order;
  sender: typeof DEFAULT_SENDER;
  courier: string;
  showWeight: boolean;
  weightValue: string;
  getItemImage: (item: any) => string | null;
}) {
  const orderNumber = order.order_number || `STH-${order.id.slice(0, 4).toUpperCase()}`;
  const deliveryCharges = Number(order.delivery_charges) || 0;
  const isFreeShipping = deliveryCharges === 0 || order.delivery_paid_by === 'store';
  const totalAmount = Number(order.total_amount || 0);
  const orderItems = order.order_items || [];
  const itemCount = orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1;

  const paymentMethodDisplay = order.payment_status === 'paid'
    ? 'Prepaid (Paid Online)'
    : 'Cash on Delivery';

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: '#ffffff',
        color: '#0a192f',
        borderRadius: '16px',
        border: '1.5px solid #cbd5e1',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        boxSizing: 'border-box',
        position: 'relative',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
      }}
    >
      {/* 1. TOP HEADER */}
      <div
        style={{
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1.5px solid #e2e8f0',
          backgroundColor: '#ffffff',
          paddingRight: '18px',
          flexShrink: 0,
        }}
      >
        {/* Brand Box */}
        <div
          style={{
            backgroundColor: '#0a192f',
            height: '100%',
            padding: '0 20px 0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderTopLeftRadius: '14px',
            borderBottomRightRadius: '20px',
          }}
        >
          <img
            src="/images/logo.png"
            alt="STH Logo"
            style={{
              width: '38px',
              height: '38px',
              minWidth: '38px',
              maxWidth: '38px',
              borderRadius: '50%',
              border: '2px solid #00c4cc',
              objectFit: 'cover',
              boxShadow: '0 0 10px rgba(0, 196, 204, 0.4)',
              flexShrink: 0,
              display: 'block',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '20px',
                fontWeight: 900,
                letterSpacing: '-0.5px',
                color: '#ffffff',
                lineHeight: 1,
              }}
            >
              STH
            </div>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '8px',
                fontWeight: 800,
                letterSpacing: '3.5px',
                color: '#cbd5e1',
                textTransform: 'uppercase',
                marginTop: '1px',
              }}
            >
              GADGETS
            </div>
          </div>
        </div>

        {/* Courier Center */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <svg width="38" height="24" viewBox="0 0 48 30" fill="none">
            <line x1="2" y1="9" x2="14" y2="9" stroke="#00c4cc" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="0" y1="15" x2="10" y2="15" stroke="#0a192f" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="4" y1="21" x2="12" y2="21" stroke="#00c4cc" strokeWidth="2.5" strokeLinecap="round" />
            <rect x="15" y="4" width="18" height="18" rx="2" fill="#0a192f" />
            <path d="M33 9h7l4 6v7h-11V9z" fill="#0a192f" />
            <circle cx="21" cy="23" r="3.5" fill="#ffffff" stroke="#00c4cc" strokeWidth="2.5" />
            <circle cx="38" cy="23" r="3.5" fill="#ffffff" stroke="#00c4cc" strokeWidth="2.5" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '8px',
                fontWeight: 800,
                letterSpacing: '1px',
                color: '#00c4cc',
                textTransform: 'uppercase',
              }}
            >
              Fast & Secure
            </span>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '13.5px',
                fontWeight: 900,
                letterSpacing: '0.8px',
                color: '#0a192f',
                textTransform: 'uppercase',
                lineHeight: 1.1,
              }}
            >
              {courier}
            </span>
          </div>
        </div>

        {/* Order ID Pill */}
        <div
          style={{
            backgroundColor: '#0a192f',
            borderRadius: '12px',
            padding: '6px 16px',
            textAlign: 'center',
            minWidth: '110px',
            boxShadow: '0 2px 8px rgba(10, 25, 47, 0.18)',
          }}
        >
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '7.5px',
              fontWeight: 800,
              letterSpacing: '1px',
              color: '#38bdf8',
              textTransform: 'uppercase',
              display: 'block',
            }}
          >
            Order ID
          </span>
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '16px',
              fontWeight: 900,
              letterSpacing: '0.5px',
              color: '#ffffff',
              lineHeight: 1.1,
            }}
          >
            {orderNumber}
          </span>
        </div>
      </div>

      {/* 2. CONTENT GRID (2 COLUMNS) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          padding: '12px 18px 10px 18px',
          gap: '18px',
        }}
      >
        {/* Left Column: SHIP TO & FROM */}
        <div
          style={{
            borderRight: '1.5px solid #e2e8f0',
            paddingRight: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* SHIP TO */}
          <div>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '10.5px',
                fontWeight: 900,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: '#0a192f',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                marginBottom: '2px',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#0284c7">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
              </svg>
              SHIP TO
            </div>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '15px',
                fontWeight: 900,
                color: '#0a192f',
                marginBottom: '1px',
                lineHeight: 1.2,
              }}
            >
              {order.customer_name}
            </div>
            <div style={{ fontSize: '11px', color: '#334155', lineHeight: 1.35 }}>
              {order.address}
            </div>
            <div style={{ fontSize: '11px', color: '#334155', lineHeight: 1.35 }}>
              {order.city}, Pakistan
            </div>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 800,
                color: '#0a192f',
                marginTop: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#0284c7">
                <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
              </svg>
              {order.phone}
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '6px 0' }} />

          {/* FROM */}
          <div>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '10.5px',
                fontWeight: 900,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: '#0a192f',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                marginBottom: '2px',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#0284c7">
                <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z" />
              </svg>
              FROM
            </div>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '13.5px',
                fontWeight: 900,
                color: '#0a192f',
              }}
            >
              {sender.name}
            </div>
            <div style={{ fontSize: '11px', color: '#334155', lineHeight: 1.35 }}>
              {sender.addressLine1}
            </div>
            <div style={{ fontSize: '11px', color: '#334155', lineHeight: 1.35 }}>
              {sender.addressLine2}
            </div>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 800,
                color: '#0a192f',
                marginTop: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#0284c7">
                <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
              </svg>
              {sender.phone}
            </div>
          </div>
        </div>

        {/* Right Column: PACKAGE DETAILS & SHIPPING CHARGES */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* PACKAGE DETAILS */}
          <div>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '10.5px',
                fontWeight: 900,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: '#0a192f',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                marginBottom: '3px',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#0284c7">
                <path d="M21 16.5l-9 5.2-9-5.2V7.5l9-5.2 9 5.2v9zM12 4.1L5.3 8 12 11.9 18.7 8 12 4.1zm-7 5.7v6.4l7 4v-6.4l-7-4zm9 10.4l7-4V9.8l-7 4v6.4z" />
              </svg>
              PACKAGE DETAILS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5px', fontSize: '11px' }}>
              {showWeight && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Weight</span>
                  <span style={{ fontWeight: 800, color: '#0a192f' }}>{weightValue}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Items</span>
                <span style={{ fontWeight: 800, color: '#0a192f' }}>{itemCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Payment Method</span>
                <span style={{ fontWeight: 800, color: '#0a192f' }}>{paymentMethodDisplay}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Shipping Method</span>
                <span style={{ fontWeight: 800, color: '#0a192f' }}>{courier}</span>
              </div>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '6px 0' }} />

          {/* SHIPPING CHARGES */}
          <div>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '10.5px',
                fontWeight: 900,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: '#0a192f',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                marginBottom: '3px',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#0284c7">
                <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
              </svg>
              SHIPPING CHARGES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Shipping Fee</span>
                <span
                  style={{
                    fontWeight: 900,
                    color: isFreeShipping ? '#059669' : '#0a192f',
                  }}
                >
                  {isFreeShipping ? 'Free Shipping' : `PKR ${deliveryCharges.toLocaleString('en-PK')}`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Delivery Method</span>
                <span style={{ fontWeight: 800, color: '#0a192f' }}>{courier}</span>
              </div>
            </div>

            {/* Blue COD / Paid Pill */}
            <div
              style={{
                marginTop: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: '8px',
                backgroundColor: '#e0f2fe',
                border: '1px solid #7dd3fc',
                padding: '5px 12px',
              }}
            >
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  color: '#0284c7',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#0284c7">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
                </svg>
                <span>{order.payment_status === 'paid' ? 'Total Paid (Online)' : 'Total COD to Collect'}</span>
              </div>
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '14px',
                  fontWeight: 900,
                  color: '#0284c7',
                }}
              >
                PKR {totalAmount.toLocaleString('en-PK')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM ROW: ITEMS & THANK YOU */}
      <div
        style={{
          borderTop: '1.5px solid #e2e8f0',
          padding: '6px 16px',
          display: 'grid',
          gridTemplateColumns: '2.8fr 1.2fr',
          alignItems: 'center',
          gap: '14px',
          backgroundColor: '#ffffff',
          minHeight: '58px',
          flexShrink: 0,
        }}
      >
        {/* Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '9px',
              fontWeight: 900,
              letterSpacing: '0.8px',
              color: '#0a192f',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginBottom: '3px',
              textTransform: 'uppercase',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#0284c7">
              <path d="M21 16.5l-9 5.2-9-5.2V7.5l9-5.2 9 5.2v9z" />
            </svg>
            ITEMS IN PARCEL ({itemCount})
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'hidden', flexWrap: 'nowrap' }}>
            {orderItems.length > 0 ? (
              orderItems.map((item, idx) => {
                const img = getItemImage(item);
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '3px 6px',
                      maxWidth: '220px',
                      flexShrink: 0,
                    }}
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={item.product_name}
                        style={{
                          width: '30px',
                          height: '30px',
                          minWidth: '30px',
                          maxWidth: '30px',
                          borderRadius: '4px',
                          objectFit: 'cover',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          minWidth: '30px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#e2e8f0',
                          fontSize: '14px',
                          flexShrink: 0,
                        }}
                      >
                        📦
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', lineHeight: 1.15 }}>
                      <span
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontSize: '9.5px',
                          fontWeight: 800,
                          color: '#0a192f',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '140px',
                        }}
                      >
                        {item.product_name}
                      </span>
                      <span style={{ fontSize: '8px', color: '#64748b', marginTop: '1px' }}>
                        {item.variant_name ? `${item.variant_name} · ` : ''}
                        <strong style={{ color: '#0284c7' }}>Qty: {item.quantity || 1}</strong>
                        <strong style={{ color: '#0a192f', marginLeft: '4px' }}>
                          PKR {Number(item.line_total || (item.unit_price || 0) * (item.quantity || 1)).toLocaleString('en-PK')}
                        </strong>
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <span style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>No items recorded</span>
            )}
          </div>
        </div>

        {/* Thank You Note & Customer QR */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
            <span
              style={{
                fontFamily: "'Caveat', cursive, sans-serif",
                fontSize: '24px',
                fontWeight: 700,
                color: '#0284c7',
                lineHeight: 1,
              }}
            >
              Thank You!
            </span>
            <span style={{ fontSize: '8px', color: '#64748b', marginTop: '1px' }}>For Shopping With</span>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '10px',
                fontWeight: 900,
                color: '#0a192f',
              }}
            >
              {sender.name} ♡
            </span>
          </div>
        </div>
      </div>

      {/* 4. FOOTER STRIP */}
      <div
        style={{
          backgroundColor: '#0a192f',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '8px',
          fontWeight: 800,
          letterSpacing: '2px',
          color: '#ffffff',
          textTransform: 'uppercase',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <span>STH GADGETS &nbsp;|&nbsp; SMART GADGETS BETTER LIVING &nbsp;|&nbsp; sthgadgets.com</span>
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '45px',
            background:
              'linear-gradient(135deg, transparent 30%, #00c4cc 30%, #00c4cc 52%, transparent 52%, transparent 68%, #0284c7 68%)',
          }}
        />
      </div>
    </div>
  );
}

export default function ShippingSlipModal({ order, orders, allOrders, onClose }: ShippingSlipModalProps) {
  // Helper to determine if an order is eligible for shipping slip printing
  const isPrintable = (o: Order) =>
    o.status !== 'shipped' && o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'rejected';

  // Raw pool of orders
  const rawPool: Order[] = allOrders && allOrders.length > 0
    ? allOrders
    : orders && orders.length > 0
    ? orders
    : order
    ? [order]
    : [];

  // Available pool of orders (filter out already shipped/delivered orders, unless single order previewed)
  const availableOrders: Order[] = rawPool.filter((o) => isPrintable(o) || (order && o.id === order.id));

  // Normalize initially active/checked orders list
  const initialOrders: Order[] = orders && orders.length > 0
    ? orders.filter((o) => isPrintable(o))
    : order
    ? [order]
    : availableOrders.slice(0, 2);

  const [activeOrders, setActiveOrders] = useState<Order[]>(initialOrders.length > 0 ? initialOrders : availableOrders.slice(0, 2));
  const [printLayout, setPrintLayout] = useState<'a4_two_per_page' | 'thermal_single'>('a4_two_per_page');
  const [activePreviewPage, setActivePreviewPage] = useState(0);

  // Sender details state (persisted to localStorage)
  const [sender, setSender] = useState(DEFAULT_SENDER);
  const [isEditingSender, setIsEditingSender] = useState(false);
  const [tempSender, setTempSender] = useState(DEFAULT_SENDER);

  // Courier state (default Leopards Courier)
  const [courier, setCourier] = useState('Leopards Courier');

  // Weight state (optional)
  const [showWeight, setShowWeight] = useState(false);
  const [weightValue, setWeightValue] = useState('0.8 kg');

  // Missing product images cache
  const [resolvedImages, setResolvedImages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sth_slip_sender_info');
        if (saved) {
          const parsed = JSON.parse(saved);
          setSender(parsed);
          setTempSender(parsed);
        }
        const savedCourier = localStorage.getItem('sth_slip_courier');
        if (savedCourier) {
          setCourier(savedCourier);
        }
        const savedLayout = localStorage.getItem('sth_slip_layout');
        if (savedLayout === 'thermal_single' || savedLayout === 'a4_two_per_page') {
          setPrintLayout(savedLayout);
        } else if (initialOrders.length > 1) {
          setPrintLayout('a4_two_per_page');
        }
      } catch {}
    }
  }, []);

  function handleSaveSender() {
    setSender(tempSender);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sth_slip_sender_info', JSON.stringify(tempSender));
      } catch {}
    }
    setIsEditingSender(false);
  }

  function handleCourierChange(val: string) {
    setCourier(val);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sth_slip_courier', val);
      } catch {}
    }
  }

  function handleLayoutChange(val: 'a4_two_per_page' | 'thermal_single') {
    setPrintLayout(val);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sth_slip_layout', val);
      } catch {}
    }
  }

  function toggleOrderInSlip(ord: Order) {
    setActiveOrders((prev) => {
      const exists = prev.some((o) => o.id === ord.id);
      if (exists) {
        const next = prev.filter((o) => o.id !== ord.id);
        return next.length > 0 ? next : prev;
      } else {
        return [...prev, ord];
      }
    });
    setActivePreviewPage(0);
  }

  function handleSelectAllOrders() {
    setActiveOrders(availableOrders);
    setActivePreviewPage(0);
  }

  function handleSelectFirstTwoOrders() {
    setActiveOrders(availableOrders.slice(0, 2));
    setActivePreviewPage(0);
  }

  // Resolve missing product images across all active orders
  useEffect(() => {
    let isMounted = true;
    async function resolveMissingImages() {
      const allItems = activeOrders.flatMap((o) => o.order_items || []);
      const missingItems = allItems.filter((it) => !getItemImage(it));
      if (missingItems.length === 0) return;

      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        const productIds = missingItems
          .map((it) => it.product_id)
          .filter(Boolean) as string[];

        const newMap: Record<string, string> = {};

        if (productIds.length > 0) {
          const { data } = await supabase
            .from('product_images')
            .select('product_id, image_url, is_primary')
            .in('product_id', productIds);

          if (data && data.length > 0) {
            data.forEach((img: any) => {
              if (!newMap[img.product_id] || img.is_primary) {
                newMap[img.product_id] = img.image_url;
              }
            });
          }
        }

        // Also check if any item name can match product by name
        const stillMissing = missingItems.filter((it) => !newMap[it.product_id || '']);
        for (const item of stillMissing) {
          const prefix = (item.product_name || '').split('–')[0].split('-')[0].trim();
          if (prefix) {
            const { data: pData } = await supabase
              .from('products')
              .select('id, product_images(image_url, is_primary)')
              .ilike('name', `%${prefix}%`)
              .limit(1);

            const pImgs = (pData?.[0] as any)?.product_images;
            if (Array.isArray(pImgs) && pImgs.length > 0) {
              const prim = pImgs.find((x: any) => x.is_primary)?.image_url || pImgs[0]?.image_url;
              if (prim && item.product_id) {
                newMap[item.product_id] = prim;
              }
              if (prim && item.product_name) {
                newMap[item.product_name] = prim;
              }
            }
          }
        }

        if (isMounted && Object.keys(newMap).length > 0) {
          setResolvedImages((prev) => ({ ...prev, ...newMap }));
        }
      } catch (err) {
        console.error('Error resolving missing product images:', err);
      }
    }

    resolveMissingImages();
    return () => {
      isMounted = false;
    };
  }, [activeOrders]);

  function getItemImage(item: any): string | null {
    if (item.product_id && resolvedImages[item.product_id]) {
      return resolvedImages[item.product_id];
    }
    if (item.product_name && resolvedImages[item.product_name]) {
      return resolvedImages[item.product_name];
    }
    if (item.product_image && typeof item.product_image === 'string' && item.product_image.length > 5) {
      return item.product_image;
    }
    if (item.product?.image_url && typeof item.product.image_url === 'string') {
      return item.product.image_url;
    }
    if (Array.isArray(item.product?.product_images) && item.product.product_images.length > 0) {
      const primary = item.product.product_images.find((pi: any) => pi?.is_primary);
      if (primary?.image_url) return primary.image_url;
      const first = item.product.product_images[0];
      if (first?.image_url) return first.image_url;
      if (typeof first === 'string') return first;
    }
    if (Array.isArray(item.product?.images) && item.product.images.length > 0) {
      const first = item.product.images[0];
      if (typeof first === 'string') return first;
      if (first?.url) return first.url;
      if (first?.image_url) return first.image_url;
    }
    if (Array.isArray(item.images) && item.images.length > 0) {
      const first = item.images[0];
      if (typeof first === 'string') return first;
      if (first?.url) return first.url;
      if (first?.image_url) return first.image_url;
    }
    return null;
  }

  // Generate HTML for print output matching the exact original styling
  function renderSingleSlipHtml(ord: Order, origin: string) {
    const orderNumber = ord.order_number || `STH-${ord.id.slice(0, 4).toUpperCase()}`;
    const deliveryCharges = Number(ord.delivery_charges) || 0;
    const isFreeShipping = deliveryCharges === 0 || ord.delivery_paid_by === 'store';
    const totalAmount = Number(ord.total_amount || 0);
    const orderItems = ord.order_items || [];
    const itemCount = orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1;

    const paymentMethodDisplay = ord.payment_status === 'paid'
      ? 'Prepaid (Paid Online)'
      : 'Cash on Delivery';

    const logoUrl = `${origin}/images/logo.png`;

    const itemsHtml = orderItems.length > 0
      ? orderItems.map((item) => {
          const imgUrl = getItemImage(item);
          const fullImgUrl = imgUrl && imgUrl.startsWith('/') ? `${origin}${imgUrl}` : imgUrl;
          const linePrice = Number(item.line_total || (item.unit_price || 0) * (item.quantity || 1)).toLocaleString('en-PK');
          return `
            <div class="product-card">
              ${
                fullImgUrl
                  ? `<img class="product-thumb" src="${fullImgUrl}" alt="${item.product_name}" />`
                  : `<div class="product-thumb-placeholder">📦</div>`
              }
              <div class="product-meta">
                <div class="product-name" title="${item.product_name}">${item.product_name}</div>
                <div class="product-sub">
                  ${item.variant_name ? `<span class="product-variant">${item.variant_name}</span> · ` : ''}
                  <span class="product-qty">Qty: ${item.quantity || 1}</span>
                  <span class="product-price">PKR ${linePrice}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')
      : `<div style="font-size:10px;color:#64748b;font-style:italic;">No items recorded in order</div>`;

    return `
      <div class="slip-card">
        <!-- TOP HEADER -->
        <div class="top-header">
          <div class="brand-box">
            <img class="brand-logo-img" src="${logoUrl}" alt="STH Logo" />
            <div class="brand-title-wrap">
              <div class="brand-sth-text">STH</div>
              <div class="brand-gadgets-tag">GADGETS</div>
            </div>
          </div>

          <div class="delivery-center">
            <svg width="38" height="24" viewBox="0 0 48 30" fill="none">
              <line x1="2" y1="9" x2="14" y2="9" stroke="#00c4cc" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="0" y1="15" x2="10" y2="15" stroke="#0a192f" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="4" y1="21" x2="12" y2="21" stroke="#00c4cc" stroke-width="2.5" stroke-linecap="round"/>
              <rect x="15" y="4" width="18" height="18" rx="2" fill="#0a192f"/>
              <path d="M33 9h7l4 6v7h-11V9z" fill="#0a192f"/>
              <circle cx="21" cy="23" r="3.5" fill="#ffffff" stroke="#00c4cc" stroke-width="2.5"/>
              <circle cx="38" cy="23" r="3.5" fill="#ffffff" stroke="#00c4cc" stroke-width="2.5"/>
            </svg>
            <div>
              <div class="delivery-title-sub">Fast & Secure</div>
              <div class="delivery-title-bold">${courier}</div>
            </div>
          </div>

          <div class="order-pill">
            <span class="order-pill-lbl">Order ID</span>
            <span class="order-pill-val">${orderNumber}</span>
          </div>
        </div>

        <!-- CONTENT GRID -->
        <div class="content-grid">
          <!-- Left: SHIP TO & FROM -->
          <div class="col-left">
            <div>
              <div class="sec-head">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#0284c7"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg>
                SHIP TO
              </div>
              <div class="customer-name">${ord.customer_name}</div>
              <div class="text-dim">${ord.address}</div>
              <div class="text-dim">${ord.city}, Pakistan</div>
              <div class="phone-text">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#0284c7"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z"/></svg>
                ${ord.phone}
              </div>
            </div>

            <div class="divider-line"></div>

            <div>
              <div class="sec-head">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#0284c7"><path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/></svg>
                FROM
              </div>
              <div class="store-name">${sender.name}</div>
              <div class="text-dim">${sender.addressLine1}</div>
              <div class="text-dim">${sender.addressLine2}</div>
              <div class="phone-text">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#0284c7"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z"/></svg>
                ${sender.phone}
              </div>
            </div>
          </div>

          <!-- Right: PACKAGE DETAILS & SHIPPING CHARGES -->
          <div class="col-right">
            <div>
              <div class="sec-head">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#0284c7"><path d="M21 16.5l-9 5.2-9-5.2V7.5l9-5.2 9 5.2v9zM12 4.1L5.3 8 12 11.9 18.7 8 12 4.1zm-7 5.7v6.4l7 4v-6.4l-7-4zm9 10.4l7-4V9.8l-7 4v6.4z"/></svg>
                PACKAGE DETAILS
              </div>
              ${
                showWeight
                  ? `<div class="row-item"><span class="row-lbl">Weight</span><span class="row-val">${weightValue}</span></div>`
                  : ''
              }
              <div class="row-item"><span class="row-lbl">Items</span><span class="row-val">${itemCount}</span></div>
              <div class="row-item"><span class="row-lbl">Payment Method</span><span class="row-val">${paymentMethodDisplay}</span></div>
              <div class="row-item"><span class="row-lbl">Shipping Method</span><span class="row-val">${courier}</span></div>
            </div>

            <div class="divider-line"></div>

            <div>
              <div class="sec-head">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#0284c7"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                SHIPPING CHARGES
              </div>
              <div class="row-item">
                <span class="row-lbl">Shipping Fee</span>
                <span class="row-val" style="${isFreeShipping ? 'color:#059669 !important;font-weight:900;' : ''}">
                  ${isFreeShipping ? 'Free Shipping' : `PKR ${deliveryCharges.toLocaleString('en-PK')}`}
                </span>
              </div>
              <div class="row-item">
                <span class="row-lbl">Delivery Method</span>
                <span class="row-val">${courier}</span>
              </div>

              <div class="diff-pill">
                <div class="diff-lbl">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#0284c7"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg>
                  <span>${ord.payment_status === 'paid' ? 'Total Paid (Online)' : 'Total COD to Collect'}</span>
                </div>
                <div class="diff-val">PKR ${totalAmount.toLocaleString('en-PK')}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- BOTTOM ROW -->
        <div class="bottom-row">
          <div class="items-container">
            <div class="items-header">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#0284c7"><path d="M21 16.5l-9 5.2-9-5.2V7.5l9-5.2 9 5.2v9z"/></svg>
              ITEMS IN PARCEL (${itemCount})
            </div>
            <div class="products-list-wrap">
              ${itemsHtml}
            </div>
          </div>

          <div class="thank-you-box">
            <div class="thank-script">Thank You!</div>
            <div class="thank-sub">For Shopping With</div>
            <div class="thank-brand">${sender.name} ♡</div>
          </div>
        </div>

        <!-- FOOTER STRIP -->
        <div class="footer-bar">
          <span>STH GADGETS &nbsp;|&nbsp; SMART GADGETS BETTER LIVING &nbsp;|&nbsp; sthgadgets.com</span>
          <div class="footer-accents"></div>
        </div>
      </div>
    `;
  }

  // Build the complete printable HTML document
  function buildPrintHtml() {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const isA4 = printLayout === 'a4_two_per_page';

    let pagesHtml = '';

    if (isA4) {
      // Group orders by 2 (2 slips per A4 page: Upper & Lower with scissor space in between)
      for (let i = 0; i < activeOrders.length; i += 2) {
        const firstOrder = activeOrders[i];
        const secondOrder = activeOrders[i + 1] || null;

        pagesHtml += `
          <div class="a4-sheet">
            <!-- UPPER SLIP -->
            <div class="slip-half upper-half">
              ${renderSingleSlipHtml(firstOrder, origin)}
            </div>

            <!-- SCISSOR CUTTING MARGIN IN CENTER -->
            <div class="cut-divider">
              <span class="cut-scissors">✂</span>
              <span class="cut-line"></span>
              <span class="cut-text">CUT HERE / یہاں سے کاٹیں</span>
              <span class="cut-line"></span>
              <span class="cut-scissors">✂</span>
            </div>

            <!-- LOWER SLIP -->
            <div class="slip-half lower-half">
              ${
                secondOrder
                  ? renderSingleSlipHtml(secondOrder, origin)
                  : `<div class="empty-half-placeholder">
                      <div class="empty-box">
                        <span>✂ Blank Half Sheet for Next Order</span>
                      </div>
                    </div>`
              }
            </div>
          </div>
        `;
      }
    } else {
      // 6x4 Thermal single slip per page
      activeOrders.forEach((ord) => {
        pagesHtml += `
          <div class="thermal-sheet">
            ${renderSingleSlipHtml(ord, origin)}
          </div>
        `;
      });
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Shipping Slips - STH Gadgets</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      ${
        isA4
          ? `size: A4 portrait; margin: 6mm 8mm;`
          : `size: 6in 4in; margin: 0;`
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      color-scheme: light !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      color: #0a192f;
      -webkit-font-smoothing: antialiased;
    }

    /* A4 2-UP STYLES */
    .a4-sheet {
      width: 100%;
      height: 284mm;
      max-height: 284mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      break-after: page;
      position: relative;
      background: #ffffff;
    }
    .a4-sheet:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }
    .slip-half {
      display: flex;
      flex-direction: column;
    }
    .slip-card {
      width: 100%;
      background: #ffffff !important;
      border: 1.5px solid #cbd5e1;
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    /* THERMAL 6x4 STYLES */
    .thermal-sheet {
      width: 5.9in;
      height: 3.9in;
      page-break-after: always;
      break-after: page;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
    }
    .thermal-sheet:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }

    /* SCISSOR CUT DIVIDER */
    .cut-divider {
      padding: 12px 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #94a3b8;
      user-select: none;
    }
    .cut-scissors {
      font-size: 15px;
      color: #64748b;
    }
    .cut-line {
      flex: 1;
      border-bottom: 1.5px dashed #cbd5e1;
      height: 0;
    }
    .cut-text {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 8.5px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #64748b;
      text-transform: uppercase;
    }

    .empty-half-placeholder {
      width: 100%;
      height: 120mm;
      border: 1.5px dashed #e2e8f0;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fafafa;
    }
    .empty-box {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 12px;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 1px;
    }

    /* SLIP HEADER */
    .top-header {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1.5px solid #e2e8f0;
      background: #ffffff !important;
      padding-right: 18px;
      flex-shrink: 0;
    }
    .brand-box {
      background: #0a192f !important;
      height: 100%;
      padding: 0 20px 0 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-top-left-radius: 14px;
      border-bottom-right-radius: 20px;
    }
    .brand-logo-img {
      width: 38px !important;
      height: 38px !important;
      min-width: 38px !important;
      max-width: 38px !important;
      border-radius: 50%;
      border: 2px solid #00c4cc;
      object-fit: cover;
      box-shadow: 0 0 10px rgba(0, 196, 204, 0.4);
      flex-shrink: 0;
      display: block;
    }
    .brand-title-wrap {
      display: flex;
      flex-direction: column;
    }
    .brand-sth-text {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #ffffff !important;
      line-height: 1;
    }
    .brand-gadgets-tag {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 3.5px;
      color: #cbd5e1 !important;
      text-transform: uppercase;
      margin-top: 1px;
    }

    /* DELIVERY CENTER */
    .delivery-center {
      display: flex;
      align-items: center;
      gap: 9px;
    }
    .delivery-title-bold {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 13.5px;
      font-weight: 900;
      letter-spacing: 0.8px;
      color: #0a192f !important;
      text-transform: uppercase;
      line-height: 1.1;
    }
    .delivery-title-sub {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #00c4cc !important;
      text-transform: uppercase;
    }

    /* ORDER PILL */
    .order-pill {
      background: #0a192f !important;
      border-radius: 12px;
      padding: 6px 16px;
      text-align: center;
      min-width: 110px;
      box-shadow: 0 2px 8px rgba(10, 25, 47, 0.18);
    }
    .order-pill-lbl {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 7.5px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #38bdf8 !important;
      text-transform: uppercase;
      display: block;
    }
    .order-pill-val {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #ffffff !important;
      line-height: 1.1;
    }

    /* GRID */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      padding: 12px 18px 10px 18px;
      gap: 18px;
    }
    .col-left {
      border-right: 1.5px solid #e2e8f0;
      padding-right: 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .col-right {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .sec-head {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 10.5px;
      font-weight: 900;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #0a192f !important;
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 2px;
    }
    .customer-name {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 15px;
      font-weight: 900;
      color: #0a192f !important;
      margin-bottom: 1px;
      line-height: 1.2;
    }
    .text-dim {
      font-size: 11px;
      color: #334155 !important;
      line-height: 1.35;
    }
    .phone-text {
      font-size: 11.5px;
      font-weight: 800;
      color: #0a192f !important;
      margin-top: 3px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .store-name {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 13.5px;
      font-weight: 900;
      color: #0a192f !important;
    }
    .divider-line {
      height: 1px;
      background: #f1f5f9;
      margin: 6px 0;
    }

    .row-item {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin-bottom: 2.5px;
      line-height: 1.3;
    }
    .row-lbl {
      color: #64748b !important;
      font-weight: 500;
    }
    .row-val {
      font-weight: 800;
      color: #0a192f !important;
    }

    /* BLUE DIFFERENCE PILL */
    .diff-pill {
      background: #e0f2fe !important;
      border: 1px solid #7dd3fc;
      border-radius: 8px;
      padding: 5px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 5px;
    }
    .diff-lbl {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 10.5px;
      font-weight: 800;
      color: #0284c7 !important;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .diff-val {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 14px;
      font-weight: 900;
      color: #0284c7 !important;
    }

    /* BOTTOM ROW */
    .bottom-row {
      border-top: 1.5px solid #e2e8f0;
      padding: 6px 16px;
      display: grid;
      grid-template-columns: 2.8fr 1.2fr;
      align-items: center;
      gap: 14px;
      background: #ffffff !important;
      min-height: 58px;
      flex-shrink: 0;
    }
    .items-container {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .items-header {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #0a192f !important;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 3px;
    }
    .products-list-wrap {
      display: flex;
      gap: 8px;
      overflow-x: hidden;
      flex-wrap: nowrap;
    }
    .product-card {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 3px 6px;
      max-width: 220px;
      flex-shrink: 0;
    }
    .product-thumb {
      width: 30px !important;
      height: 30px !important;
      min-width: 30px !important;
      max-width: 30px !important;
      border-radius: 4px;
      object-fit: cover;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      flex-shrink: 0;
    }
    .product-thumb-placeholder {
      width: 30px !important;
      height: 30px !important;
      min-width: 30px !important;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e2e8f0;
      font-size: 14px;
      flex-shrink: 0;
    }
    .product-meta {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      line-height: 1.15;
    }
    .product-name {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 9.5px;
      font-weight: 800;
      color: #0a192f !important;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }
    .product-sub {
      font-size: 8px;
      color: #64748b !important;
      margin-top: 1px;
    }
    .product-qty {
      font-weight: 700;
      color: #0284c7 !important;
    }
    .product-price {
      font-weight: 800;
      color: #0a192f !important;
      margin-left: 4px;
    }

    .thank-you-box {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      text-align: right;
    }
    .thank-script {
      font-family: 'Caveat', cursive, sans-serif;
      font-size: 24px;
      font-weight: 700;
      color: #0284c7 !important;
      line-height: 1;
    }
    .thank-sub {
      font-size: 8px;
      color: #64748b !important;
      margin-top: 1px;
    }
    .thank-brand {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 10px;
      font-weight: 900;
      color: #0a192f !important;
    }

    /* FOOTER STRIP */
    .footer-bar {
      background: #0a192f !important;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #ffffff !important;
      text-transform: uppercase;
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
    }
    .footer-accents {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 45px;
      background: linear-gradient(135deg, transparent 30%, #00c4cc 30%, #00c4cc 52%, transparent 52%, transparent 68%, #0284c7 68%);
    }

    @media print {
      body {
        padding: 0 !important;
        background: transparent !important;
      }
      .a4-sheet {
        page-break-after: always !important;
        break-after: page !important;
      }
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
  }

  function handlePrint() {
    const html = buildPrintHtml();

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }
    };
  }

  // Calculate pages count for A4
  const totalA4Pages = Math.max(1, Math.ceil(activeOrders.length / 2));

  // Get orders for current preview page in A4 mode
  const currentPairOrders = printLayout === 'a4_two_per_page'
    ? [activeOrders[activePreviewPage * 2], activeOrders[activePreviewPage * 2 + 1]].filter(Boolean)
    : [activeOrders[activePreviewPage] || activeOrders[0]].filter(Boolean);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-md overflow-y-auto">
      {/* Google fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700;800;900&display=swap"
        rel="stylesheet"
      />

      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-700 bg-[#0C1420] text-silver-bright shadow-2xl my-auto max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-[#0F1E2E] via-[#0C1420] to-[#0F1E2E] px-4 sm:px-6 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 text-lg">
              🖨️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base sm:text-lg font-black text-white">Shipping Slips Print Center</h3>
                <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[11px] font-bold text-sky-300 border border-sky-500/30">
                  {activeOrders.length} Order{activeOrders.length > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {printLayout === 'a4_two_per_page'
                  ? `📄 A4 Mode: 2 Slips per page (Upper & Lower with ✂ Cut Line) · Total ${totalA4Pages} Page${totalA4Pages > 1 ? 's' : ''}`
                  : '🏷️ Single Mode: 6×4 Thermal Sticker per order'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Toolbar: Options for Layout, Courier, Weight, and Sender */}
        <div className="border-b border-slate-800/80 bg-[#080d15] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Paper Layout Switcher */}
            <div className="flex items-center gap-1 bg-[#0F1E2E] p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => {
                  handleLayoutChange('a4_two_per_page');
                  setActivePreviewPage(0);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                  printLayout === 'a4_two_per_page'
                    ? 'bg-gradient-to-r from-sky-600 to-cyan-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>📄</span>
                <span>A4 (2 Slips Per Page)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleLayoutChange('thermal_single');
                  setActivePreviewPage(0);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                  printLayout === 'thermal_single'
                    ? 'bg-gradient-to-r from-sky-600 to-cyan-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🏷️</span>
                <span>Thermal 6×4 (1 per page)</span>
              </button>
            </div>

            {/* Courier Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">Courier:</span>
              <select
                value={courier}
                onChange={(e) => handleCourierChange(e.target.value)}
                className="rounded-lg border border-slate-700 bg-[#0F1E2E] px-2.5 py-1 text-xs font-bold text-sky-400 focus:border-sky-500 focus:outline-none"
              >
                {COURIER_OPTIONS.map((c) => (
                  <option key={c} value={c} className="bg-[#0C1420] text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Weight Option Toggle */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 font-medium">
                <input
                  type="checkbox"
                  checked={showWeight}
                  onChange={(e) => setShowWeight(e.target.checked)}
                  className="rounded border-slate-700 bg-[#0F1E2E] text-sky-500 focus:ring-0"
                />
                <span>Include Weight</span>
              </label>
              {showWeight && (
                <input
                  type="text"
                  value={weightValue}
                  onChange={(e) => setWeightValue(e.target.value)}
                  placeholder="e.g. 0.8 kg"
                  className="w-20 rounded border border-slate-700 bg-[#0F1E2E] px-2 py-0.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Edit From Address Button */}
          <button
            type="button"
            onClick={() => setIsEditingSender(!isEditingSender)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0F1E2E] hover:border-sky-500/60 hover:text-sky-300 px-3 py-1 font-semibold text-slate-300 transition"
          >
            <span>🏪</span>
            <span>{isEditingSender ? 'Close Sender Settings' : 'Edit From Address'}</span>
          </button>
        </div>

        {/* Inline Drawer to Edit Sender Address */}
        {isEditingSender && (
          <div className="border-b border-slate-800 bg-[#0b1420] p-4 text-xs shrink-0">
            <div className="mb-2 font-display text-xs font-bold text-sky-400 uppercase tracking-wider">
              ⚙️ Customize Store Sender Details (Saved for all future slips)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Store / Sender Name</label>
                <input
                  type="text"
                  value={tempSender.name}
                  onChange={(e) => setTempSender({ ...tempSender, name: e.target.value })}
                  className="w-full rounded border border-slate-700 bg-[#080d15] px-2.5 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={tempSender.addressLine1}
                  onChange={(e) => setTempSender({ ...tempSender, addressLine1: e.target.value })}
                  className="w-full rounded border border-slate-700 bg-[#080d15] px-2.5 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">City / Postal Code</label>
                <input
                  type="text"
                  value={tempSender.addressLine2}
                  onChange={(e) => setTempSender({ ...tempSender, addressLine2: e.target.value })}
                  className="w-full rounded border border-slate-700 bg-[#080d15] px-2.5 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Contact Phone</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempSender.phone}
                    onChange={(e) => setTempSender({ ...tempSender, phone: e.target.value })}
                    className="w-full rounded border border-slate-700 bg-[#080d15] px-2.5 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveSender}
                    className="shrink-0 rounded bg-sky-600 hover:bg-sky-500 px-3 py-1.5 font-bold text-white transition"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Checklist Selector (Allows user to select 1, 2, 3 or any orders directly) */}
        {availableOrders.length > 1 && (
          <div className="border-b border-slate-800 bg-[#09111E] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                Select Orders ({activeOrders.length}/{availableOrders.length}):
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {availableOrders.map((ord) => {
                  const isChecked = activeOrders.some((o) => o.id === ord.id);
                  const ordNum = ord.order_number || `STH-${ord.id.slice(0, 4).toUpperCase()}`;
                  return (
                    <button
                      key={ord.id}
                      type="button"
                      onClick={() => toggleOrderInSlip(ord)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                        isChecked
                          ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-sm'
                          : 'bg-[#0C1420] border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                      }`}
                      title={`${ord.customer_name} (${ord.city}) - PKR ${Number(ord.total_amount || 0).toLocaleString('en-PK')}`}
                    >
                      <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-black ${isChecked ? 'bg-sky-400 text-black' : 'border border-slate-600'}`}>
                        {isChecked ? '✓' : ''}
                      </span>
                      <span>{ordNum}</span>
                      <span className="text-[10px] opacity-75 hidden sm:inline">({ord.city || ord.customer_name})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectFirstTwoOrders}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 transition"
              >
                Top 2 (1 A4)
              </button>
              <button
                type="button"
                onClick={handleSelectAllOrders}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 transition"
              >
                Select All
              </button>
            </div>
          </div>
        )}

        {/* Multi-Order Tab Bar (When multiple orders or pages exist) */}
        {((printLayout === 'a4_two_per_page' && totalA4Pages > 1) || (printLayout === 'thermal_single' && activeOrders.length > 1)) && (
          <div className="border-b border-slate-800 bg-[#080D15] px-4 py-2 flex items-center justify-between gap-3 text-xs shrink-0">
            <span className="text-slate-400 font-medium">
              Previewing {printLayout === 'a4_two_per_page' ? `Sheet ${activePreviewPage + 1} of ${totalA4Pages}` : `Order ${activePreviewPage + 1} of ${activeOrders.length}`}
            </span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: printLayout === 'a4_two_per_page' ? totalA4Pages : activeOrders.length }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivePreviewPage(idx)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    activePreviewPage === idx
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'border border-slate-700 bg-[#0C1420] text-slate-400 hover:text-white'
                  }`}
                >
                  {printLayout === 'a4_two_per_page' ? `Page ${idx + 1}` : `Order ${idx + 1}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modal Body: Live Visual Preview */}
        <div className="p-4 sm:p-6 bg-[#080d15] flex-1 overflow-y-auto flex flex-col items-center">
          {printLayout === 'a4_two_per_page' ? (
            /* A4 2-Up Sheet Live Preview */
            <div
              style={{
                width: '720px',
                backgroundColor: '#ffffff',
                color: '#0a192f',
                borderRadius: '16px',
                border: '1.5px solid #cbd5e1',
                boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.5)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: "'Inter', -apple-system, sans-serif",
                colorScheme: 'light',
                userSelect: 'none',
              }}
            >
              {/* UPPER ORDER SLIP */}
              {currentPairOrders[0] && (
                <SingleSlipCard
                  order={currentPairOrders[0]}
                  sender={sender}
                  courier={currentPairOrders[0].courier_name || courier}
                  showWeight={showWeight}
                  weightValue={weightValue}
                  getItemImage={getItemImage}
                />
              )}

              {/* ✂ SCISSOR CUTTING MARGIN & EXTRA BREATHING SPACE IN CENTER */}
              <div
                style={{
                  padding: '16px 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  color: '#94a3b8',
                }}
              >
                <span style={{ fontSize: '15px', color: '#64748b' }}>✂</span>
                <div style={{ flex: 1, borderBottom: '1.5px dashed #cbd5e1' }} />
                <span
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '8.5px',
                    fontWeight: 800,
                    letterSpacing: '2px',
                    color: '#64748b',
                    textTransform: 'uppercase',
                  }}
                >
                  CUT HERE / یہاں سے کاٹیں
                </span>
                <div style={{ flex: 1, borderBottom: '1.5px dashed #cbd5e1' }} />
                <span style={{ fontSize: '15px', color: '#64748b' }}>✂</span>
              </div>

              {/* LOWER ORDER SLIP */}
              {currentPairOrders[1] ? (
                <SingleSlipCard
                  order={currentPairOrders[1]}
                  sender={sender}
                  courier={currentPairOrders[1].courier_name || courier}
                  showWeight={showWeight}
                  weightValue={weightValue}
                  getItemImage={getItemImage}
                />
              ) : (
                <div
                  style={{
                    height: '160px',
                    border: '1.5px dashed #cbd5e1',
                    borderRadius: '16px',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '22px' }}>📄</span>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '11px', fontWeight: 700 }}>
                    Blank Half Sheet (Single order on this A4 sheet)
                  </span>
                  <span style={{ fontSize: '9.5px' }}>Second order will fit here when 2 orders are selected</span>
                </div>
              )}
            </div>
          ) : (
            /* Single Thermal Slip Live Preview */
            <div
              style={{
                width: '720px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                userSelect: 'none',
              }}
            >
              <SingleSlipCard
                order={currentPairOrders[0] || activeOrders[0]}
                sender={sender}
                courier={(currentPairOrders[0] || activeOrders[0]).courier_name || courier}
                showWeight={showWeight}
                weightValue={weightValue}
                getItemImage={getItemImage}
              />
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-[#0C1420] px-4 sm:px-6 py-3.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Close Preview
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-slate-400">
              Ready to print <strong>{activeOrders.length}</strong> order slip{activeOrders.length > 1 ? 's' : ''} in 1 PDF
            </span>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-500 to-teal-400 hover:from-sky-500 hover:to-teal-300 px-6 sm:px-8 py-2.5 text-sm font-black text-white shadow-[0_0_25px_rgba(14,165,233,0.4)] transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span>{printLayout === 'a4_two_per_page' ? `Print Slips (2 Per A4 Page)` : `Print Thermal Slips (${activeOrders.length})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
