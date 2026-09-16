'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const CartDrawer = dynamic(() => import('./CartDrawer'), { ssr: false });
const CheckoutModal = dynamic(() => import('./CheckoutModal'), { ssr: false });
const FloatingCartButton = dynamic(() => import('./FloatingCartButton'), { ssr: false });
const FloatingExclusiveOfferButton = dynamic(() => import('./FloatingExclusiveOfferButton'), { ssr: false });
const MobileBottomNav = dynamic(() => import('../storefront/MobileBottomNav'), { ssr: false });
const CustomerTour = dynamic(() => import('../tour/CustomerTour'), { ssr: false });

export default function ClientCartOverlays() {
  const pathname = usePathname();

  // Hide cart overlays, floating view cart button, and mobile nav inside Admin Panel
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      <CartDrawer />
      <CheckoutModal />
      <FloatingCartButton />
      <FloatingExclusiveOfferButton />
      <MobileBottomNav />
      <CustomerTour />
    </>
  );
}
