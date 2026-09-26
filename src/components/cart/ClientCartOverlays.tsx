'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import CartDrawer from './CartDrawer';
import CheckoutModal from './CheckoutModal';
import MobileSideNav from '../storefront/MobileSideNav';
import CustomerTour from '../tour/CustomerTour';
import ChatbotWidget from '../chat/ChatbotWidget';
import FloatingCartButton from './FloatingCartButton';
import FloatingExclusiveOfferButton from './FloatingExclusiveOfferButton';

export default function ClientCartOverlays() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hide cart overlays, floating view cart button, mobile nav, and chatbot inside Admin Panel
  if (pathname?.startsWith('/admin') || !mounted) {
    return null;
  }

  return (
    <>
      <CartDrawer />
      <CheckoutModal />
      <FloatingExclusiveOfferButton />
      <FloatingCartButton />
      <MobileSideNav />
      <CustomerTour />
      <ChatbotWidget />
    </>
  );
}
