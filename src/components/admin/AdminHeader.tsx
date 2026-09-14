'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { playOrderChime } from '@/lib/notification-sound';
import OrderActionModal from './OrderActionModal';
import type { Order } from '@/types/database';

export interface AdminNotification {
  id: string;
  orderId: string;
  orderNumber: string | null;
  customerName: string;
  totalAmount: number;
  city: string;
  timestamp: string;
  read: boolean;
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [floatingAlert, setFloatingAlert] = useState<AdminNotification | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const latestKnownOrderId = useRef<string | null>(null);

  // Initialize sound preference & notifications from localStorage
  useEffect(() => {
    try {
      const savedSound = localStorage.getItem('sth_admin_sound_enabled');
      if (savedSound !== null) {
        setSoundEnabled(savedSound === 'true');
      }

      const savedNotifs = localStorage.getItem('sth_admin_notifications');
      if (savedNotifs) {
        const parsed = JSON.parse(savedNotifs);
        if (Array.isArray(parsed)) {
          setNotifications(parsed);
          setUnreadCount(parsed.filter((n) => !n.read).length);
        }
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
      localStorage.setItem('sth_admin_notifications', JSON.stringify(items.slice(0, 30)));
    } catch {
      // ignore
    }
  };

  // Sound toggle handler
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem('sth_admin_sound_enabled', String(next));
    } catch {
      // ignore
    }
    if (next) {
      playOrderChime();
    }
  };

  // Request Desktop Notification Permission
  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }
  };

  // Trigger alert for new order
  const handleNewOrderAlert = (order: any) => {
    const newNotif: AdminNotification = {
      id: Math.random().toString(36).substring(2, 9),
      orderId: order.id,
      orderNumber: order.order_number || null,
      customerName: order.customer_name || 'Customer',
      totalAmount: Number(order.total_amount || 0),
      city: order.city || 'Pakistan',
      timestamp: new Date().toISOString(),
      read: false,
      order: order,
    };

    // Play chime sound
    if (soundEnabled) {
      playOrderChime();
    }

    // Display floating popup
    setFloatingAlert(newNotif);
    setTimeout(() => {
      setFloatingAlert((current) => (current?.id === newNotif.id ? null : current));
    }, 8000);

    // Desktop notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🔔 New STH Gadgets Order!', {
          body: `${order.customer_name} from ${order.city} • PKR ${Number(order.total_amount).toLocaleString('en-PK')}`,
          icon: '/images/logo.png',
        });
      } catch {
        // ignore
      }
    }

    setNotifications((prev) => {
      const updated = [newNotif, ...prev.filter((n) => n.orderId !== order.id)].slice(0, 30);
      setUnreadCount(updated.filter((n) => !n.read).length);
      try {
        localStorage.setItem('sth_admin_notifications', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Realtime subscription + Polling
  useEffect(() => {
    const supabase = createClient();

    // 1. Initial fetch of latest order to establish baseline
    async function checkLatestOrder() {
      try {
        const res = await fetch('/api/admin/orders?limit=1');
        const data = await res.json();
        if (data.orders && data.orders.length > 0) {
          const newest = data.orders[0];
          if (!latestKnownOrderId.current) {
            latestKnownOrderId.current = newest.id;
          } else if (latestKnownOrderId.current !== newest.id) {
            // New order detected via polling!
            latestKnownOrderId.current = newest.id;
            handleNewOrderAlert(newest);
          }
        }
      } catch {
        // ignore
      }
    }

    checkLatestOrder();

    // 2. Setup Supabase Realtime channel
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

    // 3. Fallback Polling every 30 seconds
    const interval = setInterval(() => {
      checkLatestOrder();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [soundEnabled]);

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

    // Mark as read
    const updated = notifications.map((n) => (n.id === notif.id ? { ...n, read: true } : n));
    saveNotifications(updated);

    // If order object is already attached
    if (notif.order && notif.order.id) {
      setSelectedOrder(notif.order);
      return;
    }

    // Otherwise fetch fresh from API
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

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-[#080D15]/90 px-4 sm:px-6 backdrop-blur-xl">
        {/* Left Side: Hamburger & Branding */}
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Button */}
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

          {/* Logo on Mobile */}
          <Link href="/admin/dashboard" className="flex items-center gap-2 lg:hidden">
            <div className="relative h-8 w-8 overflow-hidden rounded-full border border-[#00C4CC]">
              <Image src="/images/logo.png" alt="STH" fill className="object-cover" />
            </div>
            <span className="font-display text-xs font-black tracking-wider uppercase text-silver-bright sm:text-sm">
              STH Gadgets
            </span>
          </Link>

          {/* Desktop Title */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-display text-xs font-bold uppercase tracking-widest text-silver-dim">
              Live Operations Dashboard
            </span>
          </div>
        </div>

        {/* Right Side Actions: Sound Toggle, Notifications Bell, Store Link */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sound Alert Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            title={soundEnabled ? 'Order sound alert enabled (Click to mute)' : 'Order sound alert muted (Click to enable)'}
            className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border transition ${
              soundEnabled
                ? 'border-[#00C4CC]/40 bg-[#00C4CC]/10 text-[#00C4CC] hover:bg-[#00C4CC]/20'
                : 'border-slate-800 bg-[#0C1420] text-silver-dim hover:text-white'
            }`}
          >
            <span className="text-sm">{soundEnabled ? '🔔' : '🔕'}</span>
          </button>

          {/* Notification Bell with Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen);
                requestNotificationPermission();
              }}
              className={`relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border transition ${
                unreadCount > 0
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
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
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-lg animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-800 bg-[#080D15] p-4 shadow-2xl backdrop-blur-2xl z-50 animate-slideUp">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs sm:text-sm font-bold text-silver-bright">
                      Order Alerts
                    </span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.2 text-[10px] font-black text-amber-400">
                        {unreadCount} new
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
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

                <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-silver-dim">
                      <span className="text-2xl block mb-1">📭</span>
                      No recent order notifications.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => openOrderDetails(n)}
                        className={`group flex items-start justify-between gap-3 p-2.5 rounded-xl transition cursor-pointer ${
                          !n.read
                            ? 'bg-[#00C4CC]/10 hover:bg-[#00C4CC]/15'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-silver-bright">
                              {n.customerName}
                            </span>
                            {n.orderNumber && (
                              <span className="font-mono text-[10px] text-[#00C4CC]">
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

                        <button
                          type="button"
                          className="shrink-0 rounded-lg border border-slate-700 bg-[#0C1420] px-2.5 py-1 text-[11px] font-semibold text-silver-bright group-hover:border-[#00C4CC] group-hover:text-[#00C4CC] transition"
                        >
                          View
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 border-t border-slate-800 pt-2.5 flex items-center justify-between text-[11px]">
                  <Link
                    href="/admin/orders"
                    onClick={() => setIsDropdownOpen(false)}
                    className="font-semibold text-[#00C4CC] hover:underline"
                  >
                    Go to All Orders →
                  </Link>

                  <span className="text-[10px] text-silver-dim">
                    Sound: {soundEnabled ? 'Active 🔔' : 'Muted 🔕'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick View Live Store Link */}
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
              <button
                type="button"
                onClick={() => setFloatingAlert(null)}
                className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-silver-dim hover:text-white transition"
              >
                Dismiss
              </button>
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
