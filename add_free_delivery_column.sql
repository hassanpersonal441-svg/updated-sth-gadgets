-- Add free_delivery column to products table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS free_delivery BOOLEAN DEFAULT FALSE;

-- Add comment to document the purpose
COMMENT ON COLUMN public.products.free_delivery IS 'Whether this product has free delivery enabled (overrides global free shipping threshold)';

-- Update some products to have free delivery enabled (optional - example)
-- UPDATE public.products SET free_delivery = true WHERE name LIKE '%Power Bank%';
-- UPDATE public.products SET free_delivery = true WHERE price >= 5000;
