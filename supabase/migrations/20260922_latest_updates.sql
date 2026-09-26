-- ============================================================
-- STH Gadgets — Latest Consolidated Supabase Updates
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Product Sort Order (Storefront Sequence & Reordering)
-- ------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC, id) - 1 AS position
  FROM public.products
  WHERE sort_order IS NULL
)
UPDATE public.products AS products
SET sort_order = ranked.position
FROM ranked
WHERE products.id = ranked.id;

ALTER TABLE public.products
  ALTER COLUMN sort_order SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS products_sort_order_idx
  ON public.products (active, sort_order, created_at DESC);

-- ------------------------------------------------------------
-- 2. Vendor Profiles & Vendor Purchases System
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL DEFAULT 'Voltix Mobile',
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.vendor_profiles (name, logo_url, phone, email, address, notes)
VALUES (
  'Voltix Mobile',
  '/images/logo.png',
  '+92 348 9593671',
  'voltix@sthgadgets.com',
  'Mobile Market, Lahore, Pakistan',
  'Primary Wholesale Mobile & Accessories Vendor for STH Gadgets'
)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.vendor_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL DEFAULT 'Voltix Mobile',
  order_number TEXT NOT NULL DEFAULT 'STH-GENERAL',
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  wholesale_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (wholesale_cost >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'purchased')),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vendor Purchase Sequence & Payment Tracking Fields
CREATE SEQUENCE IF NOT EXISTS public.vendor_purchase_number_seq;

ALTER TABLE public.vendor_purchases
  ADD COLUMN IF NOT EXISTS purchase_number TEXT NOT NULL DEFAULT (
    'STH-VNR-' || LPAD(nextval('public.vendor_purchase_number_seq')::TEXT, 3, '0')
  );

ALTER TABLE public.vendor_purchases
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'bank_transfer', 'easypaisa', 'jazzcash', 'other')),
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0
    CHECK (amount_paid >= 0),
  ADD COLUMN IF NOT EXISTS payment_due_date DATE,
  ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS vendor_purchases_purchase_number_idx
  ON public.vendor_purchases (purchase_number);

-- RLS Policies for Vendor System
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Full access on vendor_profiles" ON public.vendor_profiles;
CREATE POLICY "Full access on vendor_profiles" ON public.vendor_profiles
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access on vendor_purchases" ON public.vendor_purchases;
CREATE POLICY "Full access on vendor_purchases" ON public.vendor_purchases
  FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 3. Cleanup Banner/Carousel Table (If previously added)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS public.carousel_slides CASCADE;
