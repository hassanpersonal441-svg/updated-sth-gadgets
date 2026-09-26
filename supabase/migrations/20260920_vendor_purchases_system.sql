-- ============================================================
-- STH Gadgets — Vendor Purchase & Vendor Profile System SQL
-- Run this script in Supabase SQL Editor if vendor_profiles table is missing
-- ============================================================

-- 1. Create public.vendor_profiles table
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

-- 2. Create public.vendor_purchases table
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

-- 3. Insert default Voltix Mobile profile record if not present
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

-- 4. Enable RLS and add public / service policies
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Full access on vendor_profiles" ON public.vendor_profiles;
CREATE POLICY "Full access on vendor_profiles" ON public.vendor_profiles
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access on vendor_purchases" ON public.vendor_purchases;
CREATE POLICY "Full access on vendor_purchases" ON public.vendor_purchases
  FOR ALL USING (true) WITH CHECK (true);
