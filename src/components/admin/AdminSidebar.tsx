'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const links = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href: '/admin/orders',
    label: 'Orders',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
  {
    href: '/admin/profit',
    label: 'Profit & Margins',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/admin/products',
    label: 'Products',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    href: '/admin/categories',
    label: 'Categories',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    href: '/admin/coupons',
    label: 'Coupons',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function AdminSidebar({ mobileOpen = false, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    if (typeof document !== 'undefined') {
      document.cookie = 'sth_admin_verified=; path=/; max-age=0';
    }
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  const SidebarContent = (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-slate-800/80 bg-[#080D15] text-[#C9D2DB]">
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-[#00C4CC] p-0.5 shadow-[0_0_12px_rgba(0,196,204,0.4)]">
            <Image src="/images/logo.png" alt="STH Gadgets" fill className="object-cover rounded-full" />
          </div>
          <div>
            <span className="block font-display text-sm font-black tracking-wider uppercase text-silver-bright">
              STH Gadgets
            </span>
            <span className="inline-block rounded bg-[#00C4CC]/10 border border-[#00C4CC]/30 px-1.5 py-0.2 text-[10px] font-extrabold uppercase tracking-widest text-[#00C4CC]">
              Admin Portal
            </span>
          </div>
        </div>

        {/* Close Button on Mobile Drawer */}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-silver-dim hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            ✕
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-5">
        {links.map((l) => {
          const isActive = pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              prefetch={true}
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-display text-xs sm:text-sm font-semibold transition ${
                isActive
                  ? 'bg-gradient-to-r from-[#00C4CC]/20 via-[#00C4CC]/10 to-transparent text-[#00C4CC] border-l-4 border-[#00C4CC] shadow-sm'
                  : 'text-silver-dim hover:bg-[#0E1624] hover:text-silver-bright'
              }`}
            >
              <span className={isActive ? 'text-[#00C4CC]' : 'text-silver-dim'}>{l.icon}</span>
              <span>{l.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions: View Store & Log Out */}
      <div className="border-t border-slate-800/80 p-3 space-y-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#0C1420] px-3.5 py-2 font-display text-xs font-semibold text-silver-bright hover:border-[#00C4CC]/50 hover:text-[#00C4CC] transition"
        >
          <span className="flex items-center gap-2">
            <span>🌐</span>
            <span>View Live Store</span>
          </span>
          <svg className="h-3.5 w-3.5 text-silver-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </Link>

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 px-3.5 py-2 font-display text-xs font-semibold text-silver-dim transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Persistent Desktop Sidebar */}
      <aside className="hidden lg:flex lg:h-screen lg:shrink-0 sticky top-0 z-40">
        {SidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer with Backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-fadeIn">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-label="Close navigation"
          />

          {/* Drawer panel */}
          <div className="relative z-10 flex h-full max-w-[80vw] animate-slideRight">
            {SidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
