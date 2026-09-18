'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const CartDrawer = dynamic(() => import('./CartDrawer'), { ssr: false });
const CheckoutModal = dynamic(() => import('./CheckoutModal'), { ssr: false });

const MobileBottomNav = dynamic(() => import('../storefront/MobileBottomNav'), { ssr: false });
const CustomerTour = dynamic(() => import('../tour/CustomerTour'), { ssr: false });
const ChatbotWidget = dynamic(() => import('../chat/ChatbotWidget'), { ssr: false });

export default function ClientCartOverlays() {
  const pathname = usePathname();

  // Hide cart overlays, floating view cart button, mobile nav, and chatbot inside Admin Panel
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      <CartDrawer />
      <CheckoutModal />

      <MobileBottomNav />
      <CustomerTour />
      <ChatbotWidget />
    </>
  );
}
