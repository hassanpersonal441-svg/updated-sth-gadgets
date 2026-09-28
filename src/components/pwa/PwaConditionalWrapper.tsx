'use client';

import { usePathname } from 'next/navigation';
import PwaRegister from './PwaRegister';
import InstallPwaModal from './InstallPwaModal';

export default function PwaConditionalWrapper() {
  const pathname = usePathname();
  
  // Only show PWA components on storefront pages, not admin
  const isAdminRoute = pathname?.startsWith('/admin');
  
  if (isAdminRoute) {
    return null;
  }
  
  return (
    <>
      <PwaRegister />
      <InstallPwaModal />
    </>
  );
}
