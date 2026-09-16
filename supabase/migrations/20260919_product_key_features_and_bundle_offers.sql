-- ============================================================
-- STH Gadgets — Product Key Features & Bundle Offers Columns
-- Run this query in your Supabase Dashboard -> SQL Editor -> Run
-- ============================================================

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS key_features jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS bundle_offers jsonb DEFAULT '[]'::jsonb;
