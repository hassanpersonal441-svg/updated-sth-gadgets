'use client';

import React from 'react';
import type { Order, Settings } from '@/types/database';
import InvoiceComponent from './InvoiceComponent';

interface InvoiceModalProps {
  order: Order | null;
  settings?: Settings | null;
  onClose: () => void;
}

export default function InvoiceModal({ order, settings, onClose }: InvoiceModalProps) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-fadeIn no-print-backdrop">
      <div className="relative z-10 w-full max-w-4xl max-h-[96vh] overflow-y-auto rounded-2xl bg-[#080D15] p-3 sm:p-6 shadow-2xl border border-slate-800">
        <InvoiceComponent order={order} settings={settings} onClose={onClose} showActions={true} />
      </div>
    </div>
  );
}
