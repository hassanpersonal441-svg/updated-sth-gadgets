-- Add additional fields for payment accounts and free delivery settings
-- This migration adds bank_name, whatsapp_number to payment accounts and free delivery threshold

-- Add online payment free delivery threshold to settings
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS online_payment_free_delivery_threshold INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.settings.online_payment_free_delivery_threshold IS 'Order amount threshold for free delivery when paying via online payment methods (in PKR)';
