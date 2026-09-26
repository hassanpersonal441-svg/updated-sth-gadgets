-- ============================================================
-- STH Gadgets — Comprehensive Schema Update Script
-- SAFE TO RUN: No data deletion, uses IF NOT EXISTS everywhere
-- ATOMIC EXECUTION: All changes run in single transaction
-- Run this in Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- Start transaction for atomic execution (all or nothing)
BEGIN;

-- ------------------------------------------------------------
-- 1. Product Series & Model System (if not already applied)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_series (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  brand text,
  description text NOT NULL DEFAULT '',
  common_specs jsonb NOT NULL DEFAULT '[]'::jsonb,
  common_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  warranty text,
  thumbnail_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS series_id uuid REFERENCES public.product_series(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'product' CHECK (product_type IN ('product', 'series_model'));
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS model_number text;

CREATE INDEX IF NOT EXISTS idx_product_series_slug ON public.product_series(slug);
CREATE INDEX IF NOT EXISTS idx_product_series_active ON public.product_series(is_active);
CREATE INDEX IF NOT EXISTS idx_products_series_id ON public.products(series_id);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products(product_type);

ALTER TABLE public.product_series ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS series_public_read ON public.product_series;
CREATE POLICY series_public_read ON public.product_series FOR SELECT USING (is_active = true OR public.is_admin());
DROP POLICY IF EXISTS series_admin_insert ON public.product_series;
CREATE POLICY series_admin_insert ON public.product_series FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS series_admin_update ON public.product_series;
CREATE POLICY series_admin_update ON public.product_series FOR UPDATE USING (public.is_admin());
DROP POLICY IF EXISTS series_admin_delete ON public.product_series;
CREATE POLICY series_admin_delete ON public.product_series FOR DELETE USING (public.is_admin());
DROP TRIGGER IF EXISTS trg_product_series_updated_at ON public.product_series;
CREATE TRIGGER trg_product_series_updated_at BEFORE UPDATE ON public.product_series FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 2. Product Color Variants (if not already applied)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_type text NOT NULL DEFAULT 'color',
  variant_name text NOT NULL,
  color_value text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON public.product_variants(product_id, is_active, sort_order);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_variants_public_read" ON public.product_variants;
CREATE POLICY "product_variants_public_read" ON public.product_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_variants.product_id
        AND (products.active = true OR public.is_admin())
    )
  );
DROP POLICY IF EXISTS "product_variants_admin_write" ON public.product_variants;
CREATE POLICY "product_variants_admin_write" ON public.product_variants
  FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "product_variants_admin_update" ON public.product_variants;
CREATE POLICY "product_variants_admin_update" ON public.product_variants
  FOR UPDATE USING (public.is_admin());
DROP POLICY IF EXISTS "product_variants_admin_delete" ON public.product_variants;
CREATE POLICY "product_variants_admin_delete" ON public.product_variants
  FOR DELETE USING (public.is_admin());

-- ------------------------------------------------------------
-- 3. Product Key Features & Bundle Offers (if not already applied)
-- ------------------------------------------------------------
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS key_features jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS bundle_offers jsonb DEFAULT '[]'::jsonb;

-- ------------------------------------------------------------
-- 4. Product Sort Order (if not already applied)
-- ------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Only update sort_order if it's NULL (safe update, no data loss)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'sort_order'
  ) THEN
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC, id) - 1 AS position
      FROM public.products
      WHERE sort_order IS NULL
    )
    UPDATE public.products AS products
    SET sort_order = ranked.position
    FROM ranked
    WHERE products.id = ranked.id;
  END IF;
END $$;

ALTER TABLE public.products
  ALTER COLUMN sort_order SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS products_sort_order_idx
  ON public.products (active, sort_order, created_at DESC);

-- ------------------------------------------------------------
-- 5. Delivery & Shipping Settings (if not already applied)
-- ------------------------------------------------------------
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS delivery_charges numeric(12,2) NOT NULL DEFAULT 200;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS free_shipping_threshold numeric(12,2) NOT NULL DEFAULT 5000;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS payment_method_title text NOT NULL DEFAULT 'Cash on Delivery (COD)';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS courier_partners text NOT NULL DEFAULT 'Trax, Leopard & TCS Couriers';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS dispatch_window text NOT NULL DEFAULT '2 – 4 Working Days';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS dispatch_note text NOT NULL DEFAULT 'Dispatched after WhatsApp verification';

-- ------------------------------------------------------------
-- 6. Profit & Cost System (if not already applied)
-- ------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS purchase_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS wholesale_price numeric(12,2) CHECK (wholesale_price >= 0);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS free_delivery BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN public.products.free_delivery IS 'Whether this product has free delivery enabled (overrides global free shipping threshold)';

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'products' and column_name = 'profit_amount'
  ) then
    alter table public.products 
      add column profit_amount numeric(12,2) generated always as (price - purchase_price) stored;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'products' and column_name = 'profit_margin'
  ) then
    alter table public.products 
      add column profit_margin numeric(5,2) generated always as (
        case 
          when price > 0 then round(((price - purchase_price) / price) * 100, 2)
          else 0
        end
      ) stored;
  end if;
end $$;

CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS purchase_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0);

-- Safe update: only backfill if values are 0 (no data overwrite)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'purchase_price'
  ) THEN
    UPDATE public.order_items oi
    SET purchase_price = coalesce(p.purchase_price, 0)
    FROM public.products p
    WHERE oi.product_id = p.id and oi.purchase_price = 0;
  END IF;
END $$;

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS prevent_negative_profit boolean NOT NULL DEFAULT false;

-- ------------------------------------------------------------
-- 7. Bundle Discount Settings (if not already applied)
-- ------------------------------------------------------------
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS bundle_tier1_threshold numeric(12,2) NOT NULL DEFAULT 5000;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS bundle_tier1_percent numeric(5,2) NOT NULL DEFAULT 5;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS bundle_tier2_threshold numeric(12,2) NOT NULL DEFAULT 10000;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS bundle_tier2_percent numeric(5,2) NOT NULL DEFAULT 10;

-- ------------------------------------------------------------
-- 8. Online Payment System (if not already applied)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_reference TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'awaiting_payment' CHECK (status IN ('awaiting_payment', 'screenshot_sent', 'under_verification', 'paid', 'rejected', 'cancelled', 'expired')),
  rejection_reason TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(payment_reference);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS online_payment_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS payment_method_name TEXT DEFAULT 'JazzCash';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS payment_account_name TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS payment_account_number TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS payment_instructions TEXT DEFAULT 'Send the exact order amount to the above account. After payment, take a screenshot of the successful transaction and send it to us on WhatsApp for verification.';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS payment_whatsapp_number TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS payment_verification_required BOOLEAN NOT NULL DEFAULT true;

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_admin_all" ON public.payments;
CREATE POLICY "payments_admin_all" ON public.payments
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "payments_public_insert" ON public.payments;
CREATE POLICY "payments_public_insert" ON public.payments
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "payments_public_read" ON public.payments;
CREATE POLICY "payments_public_read" ON public.payments
  FOR SELECT USING (true);

-- ------------------------------------------------------------
-- 9. Brand Voice Feature (if not already applied)
-- ------------------------------------------------------------
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS brand_voice_enabled BOOLEAN NOT NULL DEFAULT true;

-- ------------------------------------------------------------
-- Commit transaction - all changes will be applied atomically
-- ------------------------------------------------------------
COMMIT;

-- ------------------------------------------------------------
-- Verification Query (runs after commit)
-- ------------------------------------------------------------
-- Run this to verify all columns are properly added
SELECT 
  column_name, 
  data_type, 
  column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'settings' 
  AND column_name IN (
    'brand_voice_enabled',
    'online_payment_enabled',
    'payment_method_name',
    'payment_account_name',
    'payment_account_number',
    'payment_instructions',
    'payment_whatsapp_number',
    'payment_verification_required',
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
    'prevent_negative_profit'
  )
ORDER BY column_name;
