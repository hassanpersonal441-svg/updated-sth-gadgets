'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Category, Settings } from '@/types/database';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useCart } from '@/context/CartContext';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  settings?: Settings | null;
}

export default function MobileSidebar({ isOpen, onClose, categories, settings }: MobileSidebarProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { totalItems, openCart } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity md:hidden ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 z-50 h-full w-80 max-w-[85vw] transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isLight
            ? 'bg-white border-r border-slate-200'
            : 'bg-[#080D15] border-r border-slate-800'
        }`}
      >
        {/* Sidebar Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}>
          <Link href="/" onClick={onClose} className="flex items-center gap-2">
            <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-[#00C4CC]/80">
              <Image
                src={settings?.logo_url || '/images/logo.png'}
                alt={settings?.business_name || 'STH Gadgets'}
                fill
                className="object-cover rounded-full"
                sizes="40px"
              />
            </div>
            <span className={`font-display text-sm font-black tracking-wider uppercase ${
              isLight ? 'text-slate-900' : 'text-silver-bright'
            }`}>
              {settings?.business_name || 'STH GADGETS'}
            </span>
          </Link>
          <button
            onClick={onClose}
            className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
              isLight
                ? 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                : 'border-slate-800 bg-[#0C1420] text-slate-300 hover:border-[#00C4CC]'
            }`}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Cart Quick Access */}
        <div className="p-4 border-b">
          <button
            onClick={() => {
              onClose();
              openCart();
            }}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 font-display text-sm font-bold transition ${
              isLight
                ? 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                : 'border-slate-800 bg-[#0C1420] text-white hover:border-[#00C4CC]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🛒</span>
              <span>Shopping Cart</span>
            </div>
            {mounted && totalItems > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#00C4CC] px-2 text-xs font-black text-black">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#00C4CC] mb-3">
            Navigation
          </div>
          
          <Link
            href="/"
            onClick={onClose}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 font-display text-sm font-semibold transition ${
              isLight
                ? 'border-slate-200 bg-slate-50 text-slate-800 hover:text-[#008B94] hover:bg-slate-100'
                : 'border-slate-800 bg-[#0C1420] text-white hover:text-[#00C4CC]'
            }`}
          >
            <span>🏠</span>
            <span>Home</span>
          </Link>

          <Link
            href="/products"
            onClick={onClose}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 font-display text-sm font-semibold transition ${
              isLight
                ? 'border-slate-200 bg-slate-50 text-slate-800 hover:text-[#008B94] hover:bg-slate-100'
                : 'border-slate-800 bg-[#0C1420] text-white hover:text-[#00C4CC]'
            }`}
          >
            <span>🛍️</span>
            <span>All Products</span>
          </Link>

          <Link
            href="/products?sort=discount"
            onClick={onClose}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 font-display text-sm font-semibold transition ${
              isLight
                ? 'border-amber-200 bg-amber-50/60 text-amber-700 hover:text-amber-800 hover:bg-amber-100/60'
                : 'border-slate-800 bg-[#0C1420] text-amber-400 hover:text-amber-300'
            }`}
          >
            <span>🔥</span>
            <span>Hot Deals</span>
          </Link>

          <Link
            href="/products?sort=newest"
            onClick={onClose}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 font-display text-sm font-semibold transition ${
              isLight
                ? 'border-cyan-200 bg-cyan-50/60 text-cyan-800 hover:text-cyan-900 hover:bg-cyan-100/60'
                : 'border-slate-800 bg-[#0C1420] text-cyan-400 hover:text-cyan-300'
            }`}
          >
            <span>✨</span>
            <span>New Arrivals</span>
          </Link>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="pt-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Categories
              </div>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/products?category=${c.slug}`}
                    onClick={onClose}
                    className={`rounded-lg border p-3 text-xs font-medium transition text-left ${
                      isLight
                        ? 'border-slate-200 bg-slate-50 text-slate-700 hover:text-[#008B94] hover:bg-slate-100'
                        : 'border-slate-800/80 bg-slate-900/60 text-slate-300 hover:text-[#00C4CC]'
                    }`}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className={`p-4 border-t ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}>
          <div className="text-[10px] text-slate-400 text-center">
            © {new Date().getFullYear()} {settings?.business_name || 'STH Gadgets'}
          </div>
        </div>
      </div>
    </>
  );
}
