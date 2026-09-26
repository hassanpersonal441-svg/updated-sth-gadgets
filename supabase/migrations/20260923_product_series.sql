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
