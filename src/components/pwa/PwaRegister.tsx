'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register PWA Service Worker
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('STH Gadgets PWA Service Worker registered successfully:', reg.scope);
          })
          .catch((err) => {
            console.warn('STH Gadgets PWA Service Worker registration failed:', err);
          });
      });

      // Capture beforeinstallprompt event for PWA Install triggers
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        (window as any).deferredPwaPrompt = e;
        window.dispatchEvent(new CustomEvent('sth_pwa_install_available'));
      });
    }
  }, []);

  return null;
}
