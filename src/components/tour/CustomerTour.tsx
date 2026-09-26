'use client';

import React, { useState, useEffect } from 'react';
import GuidedTour, { TourStep } from './GuidedTour';

export default function CustomerTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps: TourStep[] = [
    {
      id: 'search',
      title: 'Quick Search',
      description: 'Search for products quickly using the search bar.',
      targetSelector: '[data-tour="customer-search"]',
      position: 'bottom',
    },
    {
      id: 'categories',
      title: 'Browse Categories',
      description: 'Browse products by category.',
      targetSelector: '[data-tour="customer-categories"]',
      position: 'bottom',
    },
    {
      id: 'product-card',
      title: 'Product Cards',
      description: 'View product image, price, stock status and important information.',
      targetSelector: '[data-tour="customer-product-card"]',
      position: 'top',
    },
    {
      id: 'product-details',
      title: 'Product Details',
      description: 'Open a product to see specifications, price and complete details.',
      targetSelector: '[data-tour="customer-product-details"]',
      position: 'top',
    },
    {
      id: 'cart',
      title: 'Your Shopping Cart',
      description: 'Review your selected products before placing an order.',
      targetSelector: '[data-tour="customer-cart"]',
      position: 'left',
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Instant Order',
      description: 'Place your order directly through WhatsApp with your order details automatically prepared.',
      targetSelector: '[data-tour="customer-whatsapp"]',
      position: 'top',
    },
  ];

  useEffect(() => {
    try {
      const isCompleted = localStorage.getItem('sth_customer_tour_completed');
      const urlParams = new URLSearchParams(window.location.search);
      const forceStart = urlParams.get('tour') === 'customer' || urlParams.get('tour') === 'start';

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

      window.addEventListener('sth_restart_customer_tour', handleRestart);
      return () => window.removeEventListener('sth_restart_customer_tour', handleRestart);
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
      localStorage.setItem('sth_customer_tour_completed', 'true');
    } catch {
      // ignore
    }
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
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
      localStorage.setItem('sth_customer_tour_completed', 'true');
    } catch {
      // ignore
    }
  };

  return (
    <GuidedTour
      isOpen={isOpen}
      steps={steps}
      currentStepIndex={currentStepIndex}
      showWelcome={showWelcome}
      showCompletion={showCompletion}
      welcomeConfig={{
        title: 'Welcome to STH Gadgets 👋',
        text: 'Let us quickly show you how to find and order your favourite gadgets.',
        startText: 'Start Tour 🛍️',
        skipText: 'Skip for Now',
        onStart: handleStartTour,
        onSkip: handleSkipTour,
      }}
      completionConfig={{
        title: 'Happy Shopping! 🛍️',
        text: 'Your gadgets are just a few clicks away.',
        finishText: 'Start Shopping ✨',
        onFinish: handleCloseCompletion,
      }}
      onNext={handleNext}
      onBack={handleBack}
      onSkip={handleSkipTour}
      onFinish={handleFinish}
    />
  );
}
