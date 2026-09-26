-- Add online payment management columns to settings table
-- This allows multiple payment accounts (JazzCash, Easypaisa, Bank Transfer, etc.)

-- Add online payment enabled flag
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS online_payment_enabled BOOLEAN DEFAULT FALSE;

-- Add payment accounts as JSONB array
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS payment_accounts JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.settings.online_payment_enabled IS 'Whether online payment option is enabled for customers';
COMMENT ON COLUMN public.settings.payment_accounts IS 'Array of payment account objects (JazzCash, Easypaisa, Bank Transfer, etc.)';