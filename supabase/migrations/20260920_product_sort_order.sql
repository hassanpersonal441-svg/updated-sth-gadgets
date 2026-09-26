-- Persist the admin-selected storefront product sequence.
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