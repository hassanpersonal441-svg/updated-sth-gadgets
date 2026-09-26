-- ============================================================
-- STH Gadgets - Database Schema Fix Script
-- HIGH PRIORITY FIXES for Admin Settings and Feature Support
-- Run this in Supabase SQL Editor
-- CURRENCY: Pakistani Rupee (PKR) with symbol "Rs."
-- ============================================================

-- Start transaction for atomic execution
BEGIN;

-- ------------------------------------------------------------
-- 1. DELIVERY & SHIPPING SETTINGS COLUMNS
-- ------------------------------------------------------------
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS delivery_charges NUMERIC DEFAULT 200;

ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS free_shipping_threshold NUMERIC DEFAULT 5000;

ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS payment_method_title TEXT DEFAULT 'Cash on Delivery (COD)';

ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS courier_partners TEXT DEFAULT 'Trax, Leopard & TCS Couriers';

ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS dispatch_window TEXT DEFAULT '2 – 4 Working Days';

ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS dispatch_note TEXT;

-- ------------------------------------------------------------
-- 2. BUNDLE DISCOUNT SETTINGS COLUMNS
-- ------------------------------------------------------------
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS bundle_tier1_threshold NUMERIC DEFAULT 10000;

ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS bundle_tier1_percent NUMERIC DEFAULT 10;

ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS bundle_tier2_threshold NUMERIC DEFAULT 20000;

ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS bundle_tier2_percent NUMERIC DEFAULT 15;

-- ------------------------------------------------------------
-- 3. ONLINE PAYMENT SETTINGS COLUMNS
-- ------------------------------------------------------------
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS brand_voice_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS online_payment_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS payment_accounts JSONB DEFAULT '[]'::jsonb;

-- ------------------------------------------------------------
-- 4. FREE DELIVERY PRODUCT COLUMN
-- ------------------------------------------------------------
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS free_delivery BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.products.free_delivery IS 'Whether this product has free delivery enabled (overrides global free shipping threshold)';

-- ------------------------------------------------------------
-- 5. CURRENCY SETTINGS UPDATE (Pakistani Rupee)
-- ------------------------------------------------------------
-- Update default currency to Pakistani Rupee if it's still set to IDR
UPDATE public.settings 
SET currency = 'PKR', 
    currency_symbol = 'Rs.',
    order_message_template = 'Hello STH Gadgets!\n\nI want to order this product:\n\nProduct Name: {product_name}\nPrice: Rs. {product_price}\nQuantity: {quantity}\nCoupon Discount: {discount}\nFinal Price: Rs. {final_price}\n\nProduct Link:\n{product_url}\n\nPlease confirm availability.\n\nThank you!'
WHERE currency = 'IDR' OR currency_symbol = 'IDR';

-- ------------------------------------------------------------
-- Commit transaction - all changes will be applied atomically
-- ------------------------------------------------------------
COMMIT;

-- ============================================================
-- Verification Queries (run after commit to verify)
-- ============================================================

-- Verify settings table columns
SELECT 
  column_name, 
  data_type, 
  column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'settings' 
  AND column_name IN (
    'delivery_charges',
    'free_shipping_threshold',
    'payment_method_title',
    'courier_partners',
    'dispatch_window',
    'dispatch_note',
    'bundle_tier1_threshold',
    'bundle_tier1_percent',
    'bundle_tier2_threshold',
    'bundle_tier2_percent',
    'brand_voice_enabled',
    'online_payment_enabled',
    'payment_accounts'
  )
ORDER BY column_name;

-- Verify products table has free_delivery column
SELECT 
  column_name, 
  data_type, 
  column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'products' 
  AND column_name = 'free_delivery';

-- ============================================================
-- Optional: Enable free delivery for test products
-- ============================================================
-- Uncomment and run these after the main script to test free delivery:

-- Enable free delivery for products priced 5000 and above
-- UPDATE public.products SET free_delivery = true WHERE price >= 5000;

-- Or enable for specific products
-- UPDATE public.products SET free_delivery = true WHERE name = 'Buds Pro 10';

-- Or enable for all products (for testing)
-- UPDATE public.products SET free_delivery = true;
