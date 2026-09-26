'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type ToastPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
  priority?: ToastPriority;
  action?: {
    label: string;
    onClick: () => void;
  };
  progress?: number;
  sound?: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  admin: (message: string, title?: string, duration?: number) => void;
  custom: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextValue | null>(null);

const FLASH_KEY = 'sth_toast_flash_message';

// Sound effects for different notification types
const playNotificationSound = (type: ToastType) => {
  if (typeof window === 'undefined') return;
  
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different tones for different types
    switch (type) {
      case 'success':
        oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.1); // A5
        break;
      case 'error':
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.1);
        break;
      case 'warning':
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
        break;
      case 'info':
      default:
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        break;
    }
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch {
    // Audio not supported or blocked
  }
};

export function setFlashToast(message: string, type: ToastType = 'success', title?: string) {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message, type, title }));
    } catch {
      // ignore
    }
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [nextId, setNextId] = useState(1);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = `toast-${Date.now()}-${nextId}`;
      setNextId((prev) => prev + 1);
      
      const newToast: Toast = {
        id,
        type: toast.type || 'success',
        message: toast.message,
        title: toast.title,
        duration: toast.duration ?? 4000,
        priority: toast.priority ?? 'normal',
        action: toast.action,
        progress: toast.progress,
        sound: toast.sound ?? true,
      };

      setToasts((prev) => {
        // Manage toast stack - limit to 5 toasts
        const updated = [...prev, newToast];
        if (updated.length > 5) {
          return updated.slice(-5);
        }
        return updated;
      });

      // Play sound if enabled
      if (newToast.sound) {
        playNotificationSound(newToast.type);
      }

      // Auto dismiss with progress
      if (newToast.duration && newToast.duration > 0) {
        const startTime = Date.now();
        const updateProgress = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min((elapsed / newToast.duration!) * 100, 100);
          
          setToasts((prev) =>
            prev.map((t) =>
              t.id === id ? { ...t, progress } : t
            )
          );

          if (progress < 100) {
            requestAnimationFrame(updateProgress);
          } else {
            dismiss(id);
          }
        };
        requestAnimationFrame(updateProgress);
      }
    },
    [dismiss, nextId]
  );

  // Check for any flash toast passed across page transitions
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(FLASH_KEY);
      if (stored) {
        sessionStorage.removeItem(FLASH_KEY);
        const parsed = JSON.parse(stored);
        if (parsed?.message) {
          addToast({
            message: parsed.message,
            type: parsed.type || 'success',
            title: parsed.title,
          });
        }
      }
    } catch {
      // ignore
    }
  }, [addToast]);

  const value: ToastContextValue = {
    toast: (msg, type = 'info', dur) => addToast({ message: msg, type, duration: dur }),
    success: (msg, title, dur) => addToast({ message: msg, type: 'success', title, duration: dur }),
    error: (msg, title, dur) => addToast({ message: msg, type: 'error', title, duration: dur, priority: 'high' }),
    info: (msg, title, dur) => addToast({ message: msg, type: 'info', title, duration: dur }),
    warning: (msg, title, dur) => addToast({ message: msg, type: 'warning', title, duration: dur, priority: 'normal' }),
    admin: (msg, title, dur) => addToast({ message: msg, type: 'info', title: `Admin: ${title || 'Notification'}`, duration: dur, priority: 'high' }),
    custom: addToast,
    dismiss,
    dismissAll,
    toasts,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Professional Toast Notification Container */}
      {isMounted && toasts.length > 0 && (
        <div
          aria-live="polite"
          aria-atomic="true"
          role="status"
          suppressHydrationWarning
          className="fixed top-5 right-5 z-[100] flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0"
        >
          {toasts.map((t) => {
            const isSuccess = t.type === 'success';
            const isError = t.type === 'error';
            const isWarning = t.type === 'warning';
            const isHighPriority = t.priority === 'high' || t.priority === 'urgent';

            return (
              <div
                key={t.id}
                className={`pointer-events-auto group relative overflow-hidden rounded-xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 transform ${
                  isSuccess
                    ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/95 to-emerald-900/95 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                    : isError
                    ? 'border-rose-500/50 bg-gradient-to-br from-rose-950/95 to-rose-900/95 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.3)]'
                    : isWarning
                    ? 'border-amber-500/50 bg-gradient-to-br from-amber-950/95 to-amber-900/95 text-amber-100 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                    : 'border-[#00C4CC]/50 bg-gradient-to-br from-[#0A1620]/95 to-[#0C1420]/95 text-[#C9D2DB] shadow-[0_0_30px_rgba(0,196,204,0.3)]'
                } ${isHighPriority ? 'ring-2 ring-white/20 animate-pulse' : ''}`}
              >
                {/* Progress Bar */}
                {t.duration && t.duration > 0 && (
                  <div className="absolute top-0 left-0 h-1 bg-white/30">
                    <div
                      className="h-full bg-white/80 transition-all duration-100 ease-linear"
                      style={{ width: `${100 - (t.progress || 0)}%` }}
                    />
                  </div>
                )}

                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                    isSuccess
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : isError
                      ? 'bg-rose-500/20 text-rose-400'
                      : isWarning
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-[#00C4CC]/20 text-[#00C4CC]'
                  }`}>
                    {isSuccess ? '✓' : isError ? '✕' : isWarning ? '⚠' : 'ℹ'}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {t.title && (
                      <h4 className="text-sm font-bold text-white mb-1">
                        {t.title}
                      </h4>
                    )}
                    <p className="text-xs sm:text-sm font-medium text-white/90 leading-relaxed">
                      {t.message}
                    </p>
                    
                    {/* Action Button */}
                    {t.action && (
                      <button
                        onClick={() => {
                          t.action!.onClick();
                          dismiss(t.id);
                        }}
                        className="mt-2 text-xs font-bold text-[#00C4CC] hover:text-[#00B2B9] transition-colors"
                      >
                        {t.action.label}
                      </button>
                    )}
                  </div>

                  {/* Dismiss Button */}
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    className="flex-shrink-0 rounded-lg p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                    aria-label="Dismiss notification"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Priority Indicator */}
                {isHighPriority && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dismiss All Button (when multiple toasts) */}
      {isMounted && toasts.length > 1 && (
        <button
          onClick={dismissAll}
          suppressHydrationWarning
          className="fixed top-5 right-5 z-[101] text-xs font-bold text-white/50 hover:text-white bg-black/50 backdrop-blur-xl px-3 py-1.5 rounded-lg transition-all"
        >
          Dismiss All ({toasts.length})
        </button>
      )}
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