'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const TOUR_STEPS = [
  {
    step: 1,
    icon: '🛍️',
    title: 'Welcome to STH Gadgets!',
    subtitle: 'Mobile Accessories & Tech Store',
    description:
      'Welcome! We offer high-quality power banks, wireless earbuds, fast chargers, cables, phone covers, and smart watches with nationwide Cash on Delivery.',
    badge: 'Welcome Guide',
  },
  {
    step: 2,
    icon: '🔍',
    title: 'Browse & Search Products',
    subtitle: 'Category Filters & Quick Search',
    description:
      'Easily explore gadgets by category or use the top search bar to find exact models, power capacities, and accessories in seconds.',
    badge: 'Navigation',
  },
  {
    step: 3,
    icon: '🎟️',
    title: 'Coupons & Automatic Savings',
    subtitle: 'How Discounts & Free Shipping Work',
    description:
      'Enter promo codes at checkout for extra savings! You also get automatic bundle discounts: 5% OFF for 2 items, 10% OFF for 3+ items, plus 100% FREE Delivery on orders PKR 5,000 or above!',
    badge: 'Coupons & Savings',
  },
  {
    step: 4,
    icon: '💬',
    title: 'Fast WhatsApp Ordering',
    subtitle: 'Instant Pre-filled Checkout',
    description:
      'Order directly via WhatsApp! Clicking "Order on WhatsApp" or completing cart checkout opens a pre-filled order message sent straight to our official WhatsApp support.',
    badge: 'WhatsApp Orders',
  },
  {
    step: 5,
    icon: '📲',
    title: 'Live Support & Questions',
    subtitle: 'Customer Assistance Anytime',
    description:
      'Have questions about warranty, delivery time, or specs? Click the green floating WhatsApp button at the bottom right anytime to chat with our team!',
    badge: 'Customer Support',
  },
];

export default function StorefrontTour() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Check if tour should run automatically for first-time website visitors
  useEffect(() => {
    // Never run tour inside admin routes
    if (pathname && pathname.startsWith('/admin')) {
      setIsOpen(false);
      return;
    }

    const hasSeenTour = localStorage.getItem('sth_website_tour_completed');
    if (!hasSeenTour) {
      // Delay opening slightly for smooth page load transition
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // Listen for global custom event to re-trigger tour anytime
  useEffect(() => {
    function handleReopenTour() {
      setCurrentStep(0);
      setIsOpen(true);
    }

    window.addEventListener('open-sth-tour', handleReopenTour);
    return () => window.removeEventListener('open-sth-tour', handleReopenTour);
  }, []);

  if (!isOpen || (pathname && pathname.startsWith('/admin'))) {
    return null;
  }

  const stepData = TOUR_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  function handleSkip() {
    localStorage.setItem('sth_website_tour_completed', 'true');
    setIsOpen(false);
  }

  function handleNext() {
    if (isLastStep) {
      handleSkip();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }

  function handleBack() {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      {/* Backdrop click dismiss */}
      <div className="fixed inset-0" onClick={handleSkip} />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-800 bg-[#0C1420] p-6 sm:p-8 text-[#C9D2DB] shadow-2xl">
        {/* Top Header: Badge & Skip Button */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#00C4CC]/15 border border-[#00C4CC]/30 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#00C4CC]">
              {stepData.badge}
            </span>
            <span className="text-xs text-silver-dim font-mono">
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </span>
          </div>

          <button
            onClick={handleSkip}
            type="button"
            className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#080D15] px-3 py-1.5 text-xs font-semibold text-silver-dim hover:text-white hover:border-slate-700 transition"
          >
            <span>Skip Tour</span>
            <span>✕</span>
          </button>
        </div>

        {/* Tour Step Content */}
        <div className="py-6 text-center space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-b from-[#00C4CC]/20 to-[#00C4CC]/5 border border-[#00C4CC]/30 text-4xl shadow-[0_0_20px_rgba(0,196,204,0.25)]">
            {stepData.icon}
          </div>

          <div className="space-y-1">
            <h3 className="font-display text-xl sm:text-2xl font-black text-silver-bright">
              {stepData.title}
            </h3>
            <p className="text-xs font-bold text-[#00C4CC] tracking-wide">
              {stepData.subtitle}
            </p>
          </div>

          <p className="text-xs sm:text-sm text-silver-dim leading-relaxed max-w-md mx-auto">
            {stepData.description}
          </p>
        </div>

        {/* Step Progress Indicators */}
        <div className="flex items-center justify-center gap-1.5 pb-6">
          {TOUR_STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentStep
                  ? 'w-8 bg-[#00C4CC]'
                  : 'w-2 bg-slate-800 hover:bg-slate-700'
              }`}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
          <button
            onClick={handleBack}
            disabled={isFirstStep}
            type="button"
            className="rounded-xl border border-slate-800 bg-[#080D15] px-4 py-2.5 text-xs font-bold text-silver-dim hover:text-white hover:border-slate-700 transition disabled:opacity-30 disabled:pointer-events-none"
          >
            ← Back
          </button>

          <button
            onClick={handleNext}
            type="button"
            className="flex-1 rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] py-2.5 px-4 font-display text-xs sm:text-sm font-bold text-black shadow-[0_0_15px_rgba(0,196,204,0.3)] transition hover:scale-[1.01]"
          >
            {isLastStep ? 'Start Shopping 🛍️' : 'Next Step →'}
          </button>
        </div>
      </div>
    </div>
  );
}
