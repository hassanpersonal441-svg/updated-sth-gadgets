'use client';

import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
  isDeleting?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmText = 'Yes, Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  isDeleting = false,
}: ConfirmModalProps) {
  const isLoading = loading || isDeleting;
  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop overlay click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card Container */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-[#0C1420] text-[#C9D2DB] shadow-2xl p-6 space-y-4">
        {/* Header Icon + Title */}
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-xl ${
              isDanger
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                : isWarning
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
            }`}
          >
            {isDanger ? '🗑️' : isWarning ? '⚠️' : 'ℹ️'}
          </div>

          <div className="space-y-1 min-w-0">
            <h3 className="font-display text-base font-black tracking-wide text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed break-words">
              {description}
            </p>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-[#080D15] hover:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 transition disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`rounded-xl px-5 py-2 font-display text-xs font-black text-white shadow-md transition disabled:opacity-50 hover:scale-[1.02] ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.4)]'
                : isWarning
                ? 'bg-amber-600 hover:bg-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.4)]'
                : 'bg-[#00C4CC] hover:bg-[#00B2B9] text-black shadow-[0_0_15px_rgba(0,196,204,0.3)]'
            }`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
