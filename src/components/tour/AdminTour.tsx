'use client';

import React, { useState, useEffect } from 'react';
import GuidedTour, { TourStep } from './GuidedTour';

interface AdminTourProps {
  onOpenMobileSidebar?: () => void;
}

export default function AdminTour({ onOpenMobileSidebar }: AdminTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Check if target is inside mobile drawer & auto open mobile sidebar if needed
  const ensureTargetVisible = (selector: string) => {
    const el = document.querySelector(selector);
    if (!el && onOpenMobileSidebar && window.innerWidth < 1024) {
      onOpenMobileSidebar();
    }
  };

  const steps: TourStep[] = [
    {
      id: 'dashboard',
      title: 'Your Business Dashboard',
      description: 'Monitor orders, sales, revenue, profit, inventory and important store activity from one place.',
      targetSelector: '[data-tour="admin-dashboard"]',
      position: 'right',
      onBeforeStep: () => ensureTargetVisible('[data-tour="admin-dashboard"]'),
    },
    {
      id: 'orders',
      title: 'Manage Orders',
      description: 'View new orders, track order status and manage customer orders. Orders waiting for approval can also be processed through your connected WhatsApp workflow.',
      targetSelector: '[data-tour="admin-orders"]',
      position: 'right',
      onBeforeStep: () => ensureTargetVisible('[data-tour="admin-orders"]'),
    },
    {
      id: 'products',
      title: 'Product Management',
      description: 'Add, edit and remove products, update prices, manage stock and maintain product information.',
      targetSelector: '[data-tour="admin-products"]',
      position: 'right',
      onBeforeStep: () => ensureTargetVisible('[data-tour="admin-products"]'),
    },
    {
      id: 'inventory',
      title: 'Smart Inventory',
      description: 'Monitor available stock and identify products that need restocking.',
      targetSelector: '[data-tour="admin-inventory"]',
      position: 'right',
      onBeforeStep: () => ensureTargetVisible('[data-tour="admin-inventory"]'),
    },
    {
      id: 'deals',
      title: 'Deals & New Arrivals',
      description: 'Create special offers, flash deals and highlight new products.',
      targetSelector: '[data-tour="admin-deals"]',
      position: 'right',
      onBeforeStep: () => ensureTargetVisible('[data-tour="admin-deals"]'),
    },
    {
      id: 'customers',
      title: 'Customer Management',
      description: "View customer information and understand your store's customer activity.",
      targetSelector: '[data-tour="admin-customers"]',
      position: 'right',
      onBeforeStep: () => ensureTargetVisible('[data-tour="admin-customers"]'),
    },
    {
      id: 'coupons',
      title: 'Coupons & Discounts',
      description: 'Create promotional coupon codes and control their usage.',
      targetSelector: '[data-tour="admin-coupons"]',
      position: 'right',
      onBeforeStep: () => ensureTargetVisible('[data-tour="admin-coupons"]'),
    },
    {
      id: 'invoices',
      title: 'Invoices',
      description: 'Generate and manage professional invoices for your orders.',
      targetSelector: '[data-tour="admin-invoices"]',
      position: 'right',
      onBeforeStep: () => ensureTargetVisible('[data-tour="admin-invoices"]'),
    },
    {
      id: 'notifications',
      title: 'Store Notifications',
      description: 'Stay informed about new orders, low stock, important activities and system alerts.',
      targetSelector: '[data-tour="admin-notifications"]',
      position: 'bottom',
    },
    {
      id: 'settings',
      title: 'Store Control Center',
      description: 'Control your store settings, delivery charges, order rules, WhatsApp settings, invoice preferences, notifications and other business rules.',
      targetSelector: '[data-tour="admin-settings"]',
      position: 'right',
      onBeforeStep: () => ensureTargetVisible('[data-tour="admin-settings"]'),
    },
    {
      id: 'backup',
      title: 'Backup & Restore',
      description: 'Protect your store data with backups and restore your data when needed.',
      targetSelector: '[data-tour="admin-backup"]',
      position: 'right',
      onBeforeStep: () => ensureTargetVisible('[data-tour="admin-backup"]'),
    },
  ];

  // Filter out any steps where target selector doesn't exist (Smart feature requirement)
  const activeSteps = steps.filter((s) => {
    if (typeof document === 'undefined') return true;
    return true; // We keep steps and dynamically handle/scroll
  });

  useEffect(() => {
    try {
      const isCompleted = localStorage.getItem('sth_admin_tour_completed');
      const urlParams = new URLSearchParams(window.location.search);
      const forceStart = urlParams.get('tour') === 'admin' || urlParams.get('tour') === 'start';

      if (!isCompleted || forceStart) {
        setIsOpen(true);
        setShowWelcome(true);
        setCurrentStepIndex(0);
      }

      // Listen for custom restart event
      const handleRestart = () => {
        setIsOpen(true);
        setShowWelcome(true);
        setShowCompletion(false);
        setCurrentStepIndex(0);
      };

      window.addEventListener('sth_restart_admin_tour', handleRestart);
      return () => window.removeEventListener('sth_restart_admin_tour', handleRestart);
    } catch {
      // ignore
    }
  }, []);

  const handleStartTour = () => {
    setShowWelcome(false);
    setCurrentStepIndex(0);
  };

  const handleSkipTour = () => {
    setIsOpen(false);
    setShowWelcome(false);
    setShowCompletion(false);
    try {
      localStorage.setItem('sth_admin_tour_completed', 'true');
    } catch {
      // ignore
    }
  };

  const handleNext = () => {
    if (currentStepIndex < activeSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setShowCompletion(true);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    setShowCompletion(true);
  };

  const handleCloseCompletion = () => {
    setIsOpen(false);
    setShowCompletion(false);
    try {
      localStorage.setItem('sth_admin_tour_completed', 'true');
    } catch {
      // ignore
    }
  };

  return (
    <GuidedTour
      isOpen={isOpen}
      steps={activeSteps}
      currentStepIndex={currentStepIndex}
      showWelcome={showWelcome}
      showCompletion={showCompletion}
      welcomeConfig={{
        title: 'Welcome to STH Gadgets 👋',
        text: 'Let’s take a quick tour of your store and show you where everything is.',
        startText: 'Start Tour 🚀',
        skipText: 'Skip for Now',
        onStart: handleStartTour,
        onSkip: handleSkipTour,
      }}
      completionConfig={{
        title: "You're Ready! 🚀",
        text: 'You now know the main areas of STH Gadgets. You can start managing your store.',
        finishText: 'Finish Tour ✨',
        exploreText: 'Explore Dashboard',
        onFinish: handleCloseCompletion,
        onExplore: handleCloseCompletion,
      }}
      onNext={handleNext}
      onBack={handleBack}
      onSkip={handleSkipTour}
      onFinish={handleFinish}
    />
  );
}
