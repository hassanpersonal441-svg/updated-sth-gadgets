-- Add free_delivery column to products table
-- This allows individual products to have free delivery enabled

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS free_delivery BOOLEAN DEFAULT FALSE;

-- Add comment to document the purpose
COMMENT ON COLUMN public.products.free_delivery IS 'Whether this product has free delivery enabled';