-- Add ALL missing columns to settings table
-- Run this in your Supabase SQL Editor to fix the "Failed to save settings" error

-- Add delivery and shipping columns
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

-- Add bundle discount columns
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS bundle_tier1_threshold NUMERIC DEFAULT 10000;

ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS bundle_tier1_percent NUMERIC DEFAULT 10;

ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS bundle_tier2_threshold NUMERIC DEFAULT 20000;

ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS bundle_tier2_percent NUMERIC DEFAULT 15;

-- Add brand voice column
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS brand_voice_enabled BOOLEAN DEFAULT FALSE;

-- Add online payment columns
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS online_payment_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS payment_accounts JSONB DEFAULT '[]'::jsonb;

-- Add free delivery column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS free_delivery BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN public.settings.delivery_charges IS 'Standard delivery charges applied to orders';
COMMENT ON COLUMN public.settings.free_shipping_threshold IS 'Order amount threshold for free shipping';
COMMENT ON COLUMN public.settings.payment_method_title IS 'Primary payment method title shown on storefront';
COMMENT ON COLUMN public.settings.courier_partners IS 'Courier companies used for shipments';
COMMENT ON COLUMN public.settings.dispatch_window IS 'Expected delivery timeline';
COMMENT ON COLUMN public.settings.dispatch_note IS 'Additional dispatch information';
COMMENT ON COLUMN public.settings.bundle_tier1_threshold IS 'First tier bundle discount threshold';
COMMENT ON COLUMN public.settings.bundle_tier1_percent IS 'First tier bundle discount percentage';
COMMENT ON COLUMN public.settings.bundle_tier2_threshold IS 'Second tier bundle discount threshold';
COMMENT ON COLUMN public.settings.bundle_tier2_percent IS 'Second tier bundle discount percentage';
COMMENT ON COLUMN public.settings.brand_voice_enabled IS 'Whether AI brand voice is enabled';
COMMENT ON COLUMN public.settings.online_payment_enabled IS 'Whether online payment option is enabled for customers';
COMMENT ON COLUMN public.settings.payment_accounts IS 'Array of payment account objects (JazzCash, Easypaisa, Bank Transfer, etc.)';
COMMENT ON COLUMN public.products.free_delivery IS 'Whether this product has free delivery enabled';
