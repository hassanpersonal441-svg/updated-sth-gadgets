'use client';

import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { ToastProvider } from '@/context/ToastContext';

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[#05080E] text-[#C9D2DB]">
        {/* Responsive Sidebar (Desktop persistent + Mobile drawer) */}
        <AdminSidebar
          mobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />

        {/* Main Content Area with Header */}
        <div className="flex flex-1 flex-col min-w-0">
          <AdminHeader
            isMobileSidebarOpen={isMobileOpen}
            onToggleMobileSidebar={() => setIsMobileOpen((prev) => !prev)}
          />

          <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,196,204,0.07),rgba(255,255,255,0))] p-4 sm:p-6 md:p-8 lg:p-10">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
