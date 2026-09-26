-- Remove Bank Transfer payment account from settings
-- This script removes any payment account with payment_method_name containing 'Bank Transfer'

-- First, let's see the current payment accounts
SELECT payment_accounts FROM public.settings WHERE id = 1;

-- Update the settings to remove Bank Transfer accounts
UPDATE public.settings
SET payment_accounts = (
  SELECT jsonb_agg(account)
  FROM jsonb_array_elements(payment_accounts) AS account
  WHERE account->>'payment_method_name' NOT LIKE '%Bank Transfer%'
),
updated_at = NOW()
WHERE id = 1;

-- Verify the change
SELECT payment_accounts FROM public.settings WHERE id = 1;
