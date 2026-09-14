'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const FLASH_KEY = 'sth_toast_flash_message';

export function setFlashToast(message: string, type: ToastType = 'success') {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message, type }));
    } catch {
      // ignore
    }
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'success', duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  // Check for any flash toast passed across page transitions
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(FLASH_KEY);
      if (stored) {
        sessionStorage.removeItem(FLASH_KEY);
        const parsed = JSON.parse(stored);
        if (parsed?.message) {
          addToast(parsed.message, parsed.type || 'success');
        }
      }
    } catch {
      // ignore
    }
  }, [addToast]);

  const value: ToastContextValue = {
    toast: addToast,
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Floating Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all animate-slideUp ${
                isSuccess
                  ? 'border-emerald-500/40 bg-[#0C1E18]/95 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
                  : isError
                  ? 'border-rose-500/40 bg-[#200D12]/95 text-rose-300 shadow-[0_0_25px_rgba(244,63,94,0.2)]'
                  : isWarning
                  ? 'border-amber-500/40 bg-[#221708]/95 text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
                  : 'border-[#00C4CC]/40 bg-[#0A161E]/95 text-[#00C4CC] shadow-[0_0_25px_rgba(0,196,204,0.2)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl shrink-0">
                  {isSuccess ? '✅' : isError ? '❌' : isWarning ? '⚠️' : 'ℹ️'}
                </span>
                <p className="text-xs sm:text-sm font-semibold tracking-wide text-white">
                  {t.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-lg p-1 text-silver-dim hover:text-white transition"
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
