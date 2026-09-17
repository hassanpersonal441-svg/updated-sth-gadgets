'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

export default function InstallPwaModal() {
  const [canInstall, setCanInstall] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already running in standalone / PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // Check if dismissed recently
    try {
      const dismissed = localStorage.getItem('sth_pwa_banner_dismissed');
      if (dismissed && Date.now() - parseInt(dismissed, 10) < 24 * 60 * 60 * 1000) {
        // Dismissed within 24h
        return;
      }
    } catch {
      // ignore
    }

    // Check iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    if (isIosDevice) {
      setCanInstall(true);
      setShowBanner(true);
    }

    // Listen for beforeinstallprompt event
    function handleInstallAvailable() {
      setCanInstall(true);
      setShowBanner(true);
    }

    window.addEventListener('sth_pwa_install_available', handleInstallAvailable);

    if ((window as any).deferredPwaPrompt) {
      handleInstallAvailable();
    }

    return () => {
      window.removeEventListener('sth_pwa_install_available', handleInstallAvailable);
    };
  }, []);

  async function handleInstallClick() {
    if (isIos) {
      setShowIosModal(true);
      return;
    }

    const promptEvent = (window as any).deferredPwaPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstalled(true);
        setShowBanner(false);
      }
      (window as any).deferredPwaPrompt = null;
    } else {
      alert('To install STH Gadgets App on your phone/PC: Click menu (⋮ or Share) and select "Add to Home Screen" / "Install STH Gadgets".');
    }
  }

  function dismissBanner() {
    setShowBanner(false);
    try {
      localStorage.setItem('sth_pwa_banner_dismissed', Date.now().toString());
    } catch {
      // ignore
    }
  }

  if (installed || !showBanner) return null;

  return (
    <>
      {/* Floating Bottom PWA Install Banner */}
      <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto rounded-2xl border border-[#00C4CC]/40 bg-[#0C1420]/95 p-4 shadow-[0_10px_30px_rgba(0,196,204,0.25)] backdrop-blur-md animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
            <Image
              src="/images/pwa-icon-192.png"
              alt="STH Gadgets Logo"
              fill
              className="object-contain p-1"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-bold text-white truncate">
                STH Gadgets App
              </span>
              <span className="rounded bg-[#00C4CC]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#00C4CC]">
                PWA
              </span>
            </div>
            <p className="text-xs text-slate-300 truncate">
              Install app for faster shopping & offline access!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] px-3.5 py-2 font-display text-xs font-bold text-black shadow-md transition hover:scale-105"
            >
              📲 Install
            </button>
            <button
              onClick={dismissBanner}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white transition"
              aria-label="Dismiss banner"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Installation Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-w-sm w-full rounded-2xl border border-[#00C4CC]/40 bg-[#0C1420] p-6 space-y-4 text-center">
            <div className="relative h-16 w-16 mx-auto overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
              <Image
                src="/images/pwa-icon-192.png"
                alt="STH Gadgets"
                fill
                className="object-contain p-1.5"
              />
            </div>

            <h3 className="font-display text-lg font-bold text-white">
              Install STH Gadgets on iPhone/iPad
            </h3>

            <div className="space-y-3 text-left text-xs text-slate-300">
              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#080D15] p-3">
                <span className="text-base">1️⃣</span>
                <span>
                  Tap the <strong className="text-[#00C4CC]">Share button</strong> (box with arrow up ⎋) in Safari at bottom of your screen.
                </span>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#080D15] p-3">
                <span className="text-base">2️⃣</span>
                <span>
                  Scroll down and tap <strong className="text-[#00C4CC]">Add to Home Screen</strong>.
                </span>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#080D15] p-3">
                <span className="text-base">3️⃣</span>
                <span>
                  Tap <strong className="text-[#00C4CC]">Add</strong> in the top right. STH Gadgets App will appear on your Home Screen!
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowIosModal(false)}
              className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 font-display text-xs font-bold text-white transition"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
