'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { playNotificationSound, SoundTone } from '@/lib/notification-sound';
import OrderActionModal from './OrderActionModal';
import type { Order } from '@/types/database';
import ThemeToggle from '@/components/theme/ThemeToggle';

export interface AdminNotification {
  id: string;
  orderId: string;
  orderNumber: string | null;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  city: string;
  timestamp: string;
  read: boolean;
  type?: 'new_order' | 'high_value' | 'low_stock';
  order?: Order;
}

interface AdminHeaderProps {
  onToggleMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
}

export default function AdminHeader({
  onToggleMobileSidebar,
  isMobileSidebarOpen,
}: AdminHeaderProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [soundTone, setSoundTone] = useState<SoundTone>('chime');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'high_value'>('all');
  const [floatingAlert, setFloatingAlert] = useState<AdminNotification | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const latestKnownOrderId = useRef<string | null>(null);

  // Initialize preferences & notifications from localStorage
  useEffect(() => {
    try {
      const savedTone = localStorage.getItem('sth_admin_sound_tone') as SoundTone;
      if (savedTone && ['chime', 'cash', 'digital', 'alarm'].includes(savedTone)) {
        setSoundTone(savedTone);
      }

      const savedNotifs = localStorage.getItem('sth_admin_notifications');
      if (savedNotifs) {
        const parsed = JSON.parse(savedNotifs);
        if (Array.isArray(parsed)) {
          setNotifications(parsed);
          setUnreadCount(parsed.filter((n) => !n.read).length);
        }
      }

      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotifPermission(Notification.permission);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save notifications to localStorage when updated
  const saveNotifications = (items: AdminNotification[]) => {
    setNotifications(items);
    setUnreadCount(items.filter((n) => !n.read).length);
    try {
      localStorage.setItem('sth_admin_notifications', JSON.stringify(items.slice(0, 50)));
    } catch {
      // ignore
    }
  };

  // Request Desktop Notification Permission
  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setNotifPermission(result);
      } catch {
        // ignore
      }
    }
  };

  // Trigger alert for new order
  const handleNewOrderAlert = (order: any) => {
    const isHighValue = Number(order.total_amount || 0) >= 5000;
    const newNotif: AdminNotification = {
      id: Math.random().toString(36).substring(2, 9),
      orderId: order.id,
      orderNumber: order.order_number || null,
      customerName: order.customer_name || 'Customer',
      customerPhone: order.customer_phone || order.phone || '',
      totalAmount: Number(order.total_amount || 0),
      city: order.city || 'Pakistan',
      timestamp: new Date().toISOString(),
      read: false,
      type: isHighValue ? 'high_value' : 'new_order',
      order: order,
    };

    // Play chime sound
    playNotificationSound(isHighValue ? 'cash' : soundTone);

    // Display floating popup
    setFloatingAlert(newNotif);
    setSelectedOrder(order as Order);
    setTimeout(() => {
      setFloatingAlert((current) => (current?.id === newNotif.id ? null : current));
    }, 10000);

    // Desktop notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`🔔 New STH Order ${isHighValue ? '💰 (High Value!)' : ''}`, {
          body: `${order.customer_name} from ${order.city} • PKR ${Number(order.total_amount).toLocaleString('en-PK')}`,
          icon: '/images/logo.png',
        });
      } catch {
        // ignore
      }
    }

    setNotifications((prev) => {
      const updated = [newNotif, ...prev.filter((n) => n.orderId !== order.id)].slice(0, 50);
      setUnreadCount(updated.filter((n) => !n.read).length);
      try {
        localStorage.setItem('sth_admin_notifications', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Unlock audio context on click
  useEffect(() => {
    const handleFirstClick = () => {
      requestNotificationPermission();
      playNotificationSound(soundTone);
      window.removeEventListener('click', handleFirstClick);
      window.removeEventListener('touchstart', handleFirstClick);
    };

    window.addEventListener('click', handleFirstClick);
    window.addEventListener('touchstart', handleFirstClick);

    return () => {
      window.removeEventListener('click', handleFirstClick);
      window.removeEventListener('touchstart', handleFirstClick);
    };
  }, [soundTone]);

  // Realtime subscription + Fast Polling (every 4s)
  useEffect(() => {
    const supabase = createClient();

    async function checkLatestOrder() {
      try {
        const res = await fetch('/api/admin/orders?limit=1');
        const data = await res.json();
        if (data.orders && data.orders.length > 0) {
          const newest = data.orders[0];
          if (!latestKnownOrderId.current) {
            latestKnownOrderId.current = newest.id;
          } else if (latestKnownOrderId.current !== newest.id) {
            latestKnownOrderId.current = newest.id;
            handleNewOrderAlert(newest);
          }
        }
      } catch {
        // ignore
      }
    }

    checkLatestOrder();

    const channel = supabase
      .channel('admin_orders_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.new) {
            latestKnownOrderId.current = payload.new.id;
            handleNewOrderAlert(payload.new);
          }
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      checkLatestOrder();
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [soundTone]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const clearAllNotifications = () => {
    saveNotifications([]);
  };

  async function openOrderDetails(notif: AdminNotification) {
    setIsDropdownOpen(false);
    setFloatingAlert(null);

    const updated = notifications.map((n) => (n.id === notif.id ? { ...n, read: true } : n));
    saveNotifications(updated);

    if (notif.order && notif.order.id) {
      setSelectedOrder(notif.order);
      return;
    }

    try {
      const res = await fetch('/api/admin/orders');
      const data = await res.json();
      const found = (data.orders || []).find((o: Order) => o.id === notif.orderId);
      if (found) {
        setSelectedOrder(found);
      }
    } catch {
      // ignore
    }
  }

  // Filtered notifications list
  const filteredNotifs = notifications.filter((n) => {
    if (filterTab === 'unread') return !n.read;
    if (filterTab === 'high_value') return n.totalAmount >= 5000;
    return true;
  });

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-[#080D15]/90 px-4 sm:px-6 backdrop-blur-xl">
        {/* Left Side: Mobile Hamburger & Branding */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            aria-label="Toggle navigation menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-[#0C1420] text-silver-bright hover:border-[#00C4CC] hover:text-[#00C4CC] transition lg:hidden"
          >
            {isMobileSidebarOpen ? (
              <span className="text-lg">✕</span>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          <Link href="/admin/dashboard" className="flex items-center gap-2 lg:hidden">
            <div className="relative h-8 w-8 overflow-hidden rounded-full border border-[#00C4CC]">
              <Image src="/images/logo.png" alt="STH" fill className="object-cover" sizes="32px" />
            </div>
            <span className="font-display text-xs font-black tracking-wider uppercase text-silver-bright sm:text-sm">
              STH Gadgets
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
            <span className="font-display text-xs font-bold uppercase tracking-widest text-silver-dim">
              Live Operations Hub
            </span>
          </div>
        </div>

        {/* Right Side Actions: Theme Toggle & Notifications Bell */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Light / Dark Mode Toggle */}
          <ThemeToggle />

          {/* Notification Bell with Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              data-tour="admin-notifications"
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen);
                requestNotificationPermission();
              }}
              className={`relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border transition ${
                unreadCount > 0
                  ? 'border-amber-500/60 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                  : 'border-slate-800 bg-[#0C1420] text-silver-dim hover:border-slate-700 hover:text-silver-bright'
              }`}
              aria-label="Order notifications"
            >
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>

              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-lg animate-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-[420px] rounded-2xl border border-slate-800 bg-[#080D15]/95 p-4 shadow-2xl backdrop-blur-2xl z-50 animate-slideUp">
                {/* Panel Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs sm:text-sm font-bold text-silver-bright">
                      Order Alerts & Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-black text-amber-400">
                        {unreadCount} new
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-[11px] font-semibold text-[#00C4CC] hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllNotifications}
                        className="text-[11px] text-silver-dim hover:text-rose-400"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Desktop Notification Status */}
                <div className="mt-2.5 flex items-center rounded-xl bg-[#0C1420] border border-slate-800/80 px-3 py-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-silver-dim">
                    <span>Desktop Alerts:</span>
                    {notifPermission === 'granted' ? (
                      <span className="font-bold text-emerald-400">Active 🟢</span>
                    ) : (
                      <button
                        onClick={requestNotificationPermission}
                        className="font-bold text-amber-400 hover:underline"
                      >
                        Enable 🔔
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="mt-3 flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
                  <button
                    onClick={() => setFilterTab('all')}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                      filterTab === 'all'
                        ? 'bg-[#00C4CC] text-black'
                        : 'text-silver-dim hover:text-white'
                    }`}
                  >
                    All ({notifications.length})
                  </button>
                  <button
                    onClick={() => setFilterTab('unread')}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                      filterTab === 'unread'
                        ? 'bg-[#00C4CC] text-black'
                        : 'text-silver-dim hover:text-white'
                    }`}
                  >
                    Unread ({unreadCount})
                  </button>
                  <button
                    onClick={() => setFilterTab('high_value')}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                      filterTab === 'high_value'
                        ? 'bg-emerald-400 text-black'
                        : 'text-silver-dim hover:text-white'
                    }`}
                  >
                    💰 High Value ({notifications.filter((n) => n.totalAmount >= 5000).length})
                  </button>
                </div>

                {/* Notifications List */}
                <div className="mt-3 max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                  {filteredNotifs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-silver-dim">
                      <span className="text-2xl block mb-1">📭</span>
                      No notifications found for this filter.
                    </div>
                  ) : (
                    filteredNotifs.map((n) => (
                      <div
                        key={n.id}
                        className={`group flex items-start justify-between gap-3 p-3 rounded-xl transition ${
                          !n.read
                            ? 'bg-[#00C4CC]/10 border border-[#00C4CC]/20 hover:bg-[#00C4CC]/15'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-silver-bright truncate">
                              {n.customerName}
                            </span>
                            {n.type === 'high_value' && (
                              <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                                High Value
                              </span>
                            )}
                            {n.orderNumber && (
                              <span className="font-mono text-[10px] text-[#00C4CC] shrink-0">
                                {n.orderNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-silver-dim">
                            {n.city} •{' '}
                            <strong className="text-emerald-400 font-mono">
                              PKR {n.totalAmount.toLocaleString('en-PK')}
                            </strong>
                          </p>
                          <span className="block text-[10px] text-silver-dim/60">
                            {new Date(n.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {n.customerPhone && (
                            <a
                              href={`https://wa.me/${n.customerPhone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
                                `Hello ${n.customerName}! Re: Your STH Gadgets order ${n.orderNumber || ''}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-[#25D366] hover:bg-[#20BD5A] p-1.5 text-white transition"
                              title="Chat on WhatsApp"
                            >
                              <svg viewBox="0 0 32 32" className="h-3.5 w-3.5 fill-white">
                                <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.34.687 4.52 1.872 6.35L4 29l7.86-1.83A11.94 11.94 0 0016 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3z" />
                              </svg>
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => openOrderDetails(n)}
                            className="rounded-lg border border-slate-700 bg-[#0C1420] px-2.5 py-1 text-[11px] font-bold text-silver-bright group-hover:border-[#00C4CC] group-hover:text-[#00C4CC] transition"
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 border-t border-slate-800 pt-2.5 flex items-center justify-between text-[11px]">
                  <Link
                    href="/admin/orders"
                    onClick={() => setIsDropdownOpen(false)}
                    className="font-bold text-[#00C4CC] hover:underline"
                  >
                    Go to Orders Dashboard →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/"
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#0C1420] px-3.5 py-2 font-display text-xs font-semibold text-silver-bright hover:border-[#00C4CC] hover:text-[#00C4CC] transition"
          >
            <span>🌐</span>
            <span>Live Store</span>
          </Link>
        </div>
      </header>

      {/* Floating Incoming Order Notification Popup Banner */}
      {floatingAlert && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full animate-slideUp">
          <div className="relative rounded-2xl border-2 border-[#00C4CC] bg-[#080D15]/95 p-4 shadow-[0_0_35px_rgba(0,196,204,0.4)] backdrop-blur-2xl text-[#C9D2DB]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00C4CC]/20 text-base animate-bounce">
                  🔔
                </span>
                <div>
                  <h4 className="font-display text-xs sm:text-sm font-black text-silver-bright">
                    New Order Received!
                  </h4>
                  <span className="text-[10px] text-silver-dim">Just now</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFloatingAlert(null)}
                className="rounded-lg p-1 text-silver-dim hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-2.5 rounded-xl bg-[#0C1420] p-3 text-xs space-y-1 border border-slate-800">
              <div className="flex justify-between font-semibold text-silver-bright">
                <span>{floatingAlert.customerName}</span>
                <span className="font-mono text-emerald-400">
                  PKR {floatingAlert.totalAmount.toLocaleString('en-PK')}
                </span>
              </div>
              <div className="text-[11px] text-silver-dim flex items-center justify-between">
                <span>City: {floatingAlert.city}</span>
                {floatingAlert.orderNumber && (
                  <span className="font-mono text-[#00C4CC]">{floatingAlert.orderNumber}</span>
                )}
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => openOrderDetails(floatingAlert)}
                className="flex-1 rounded-xl bg-[#00C4CC] hover:bg-[#00b2b9] py-2 font-display text-xs font-bold text-black shadow-sm transition"
              >
                🔍 View & Manage Order
              </button>
              {floatingAlert.customerPhone && (
                <a
                  href={`https://wa.me/${floatingAlert.customerPhone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
                    `Hello ${floatingAlert.customerName}! Thank you for your order on STH Gadgets (${floatingAlert.orderNumber || ''}).`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-[#25D366] hover:bg-[#20BD5A] px-3 py-2 text-xs font-bold text-white shadow-sm transition flex items-center gap-1"
                >
                  💬 WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Order Action Modal for notifications */}
      {selectedOrder && (
        <OrderActionModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onOrderUpdated={(updated) => setSelectedOrder(updated)}
          onOrderDeleted={() => setSelectedOrder(null)}
        />
      )}
    </>
  );
}
