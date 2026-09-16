'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { CartItem, Product } from '@/types/database';

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  couponCode: string;
  couponDiscount: number;
  couponStatus: 'idle' | 'checking' | 'valid' | 'invalid';
  couponMessage: string;
  bundleDiscount: number;
  bundlePercentage: number;
  deliveryCharges: number;
  totalAmount: number;
  isCartOpen: boolean;
  isCheckoutOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  addToCart: (product: Product, quantity?: number, variantName?: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'sth_gadgets_cart_v1';
const COUPON_STORAGE_KEY = 'sth_gadgets_coupon_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponStatus, setCouponStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [couponMessage, setCouponMessage] = useState<string>('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [bundleTier1Threshold, setBundleTier1Threshold] = useState(2000);
  const [bundleTier1Percent, setBundleTier1Percent] = useState(5);
  const [bundleTier2Threshold, setBundleTier2Threshold] = useState(4000);
  const [bundleTier2Percent, setBundleTier2Percent] = useState(10);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(5000);
  const [deliveryFee, setDeliveryFee] = useState(200);

  // Load cart from localStorage on client mount & fetch live store settings
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }
      const savedCoupon = localStorage.getItem(COUPON_STORAGE_KEY);
      if (savedCoupon) {
        const parsed = JSON.parse(savedCoupon);
        if (parsed.code) {
          setCouponCode(parsed.code);
          setCouponDiscount(parsed.discount || 0);
          setCouponStatus('valid');
        }
      }
    } catch {
      // ignore storage access errors
    }

    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          if (data.settings.bundle_tier1_threshold !== undefined) setBundleTier1Threshold(data.settings.bundle_tier1_threshold);
          if (data.settings.bundle_tier1_percent !== undefined) setBundleTier1Percent(data.settings.bundle_tier1_percent);
          if (data.settings.bundle_tier2_threshold !== undefined) setBundleTier2Threshold(data.settings.bundle_tier2_threshold);
          if (data.settings.bundle_tier2_percent !== undefined) setBundleTier2Percent(data.settings.bundle_tier2_percent);
          if (data.settings.free_shipping_threshold !== undefined) setFreeShippingThreshold(data.settings.free_shipping_threshold);
          if (data.settings.delivery_charges !== undefined) setDeliveryFee(data.settings.delivery_charges);
        }
      })
      .catch(() => {});

    setIsMounted(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, isMounted]);

  // Save coupon to localStorage whenever it changes
  useEffect(() => {
    if (!isMounted) return;
    try {
      if (couponStatus === 'valid' && couponCode) {
        localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify({ code: couponCode, discount: couponDiscount }));
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [couponCode, couponDiscount, couponStatus, isMounted]);

  // Total quantity of items in cart
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  // Raw subtotal of products in cart
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Mutually Exclusive Discount Rule:
  // Either a Coupon Code is applied OR Automatic Promotions / Bundle Discounts apply.
  // Both cannot be applied at the same time.
  const isCouponActive = couponStatus === 'valid' && couponDiscount > 0;

  let bundlePercentage = 0;
  if (!isCouponActive) {
    if (subtotal >= bundleTier2Threshold && bundleTier2Threshold > 0) {
      bundlePercentage = bundleTier2Percent;
    } else if (subtotal >= bundleTier1Threshold && bundleTier1Threshold > 0) {
      bundlePercentage = bundleTier1Percent;
    }
  }
  const bundleDiscount = isCouponActive ? 0 : Math.round((subtotal * bundlePercentage) / 100);

  // Delivery charges: Free if order exceeds threshold, else standard fee
  const deliveryCharges = subtotal > 0 ? (freeShippingThreshold > 0 && subtotal >= freeShippingThreshold ? 0 : deliveryFee) : 0;

  // Final total
  const totalAmount = Math.max(0, subtotal - couponDiscount - bundleDiscount + deliveryCharges);

  function openCart() {
    setIsCartOpen(true);
  }

  function closeCart() {
    setIsCartOpen(false);
  }

  function openCheckout() {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  }

  function closeCheckout() {
    setIsCheckoutOpen(false);
  }

  function addToCart(product: Product, quantity = 1, variantName?: string) {
    if (product.stock_status === 'out_of_stock') {
      alert('Sorry, this product is currently out of stock.');
      return;
    }

    const primaryImage =
      product.product_images?.find((img) => img.is_primary)?.image_url ||
      product.product_images?.[0]?.image_url ||
      '/images/logo.png';

    const cartItemId = variantName ? `${product.id}_${variantName}` : product.id;

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === cartItemId);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity,
        };
        return next;
      }

      return [
        ...prev,
        {
          id: cartItemId,
          productId: product.id,
          productName: product.name,
          slug: product.slug,
          price: product.price,
          imageUrl: primaryImage,
          quantity,
          variantName,
          stockStatus: product.stock_status,
        },
      ];
    });

    setIsCartOpen(true);
  }

  function updateQuantity(itemId: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
  }

  function removeFromCart(itemId: string) {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }

  function clearCart() {
    setItems([]);
    removeCoupon();
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(COUPON_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  async function applyCoupon(code: string): Promise<boolean> {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return false;

    setCouponStatus('checking');
    setCouponMessage('');

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed, orderAmount: subtotal }),
      });
      const data = await res.json();

      if (data.valid) {
        setCouponCode(trimmed);
        setCouponDiscount(data.discountAmount || 0);
        setCouponStatus('valid');
        setCouponMessage(`Coupon "${trimmed}" applied!`);
        return true;
      } else {
        setCouponDiscount(0);
        setCouponStatus('invalid');
        setCouponMessage(data.reason || 'Invalid coupon code');
        return false;
      }
    } catch {
      setCouponDiscount(0);
      setCouponStatus('invalid');
      setCouponMessage('Could not validate coupon. Please try again.');
      return false;
    }
  }

  function removeCoupon() {
    setCouponCode('');
    setCouponDiscount(0);
    setCouponStatus('idle');
    setCouponMessage('');
    try {
      localStorage.removeItem(COUPON_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        subtotal,
        couponCode,
        couponDiscount,
        couponStatus,
        couponMessage,
        bundleDiscount,
        bundlePercentage,
        deliveryCharges,
        totalAmount,
        isCartOpen,
        isCheckoutOpen,
        openCart,
        closeCart,
        openCheckout,
        closeCheckout,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
