-- Product Reviews System
-- Migration: 20261001_product_reviews.sql

CREATE TABLE IF NOT EXISTS product_reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  phone        text,
  rating       smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title        text,
  body         text NOT NULL,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_reply  text,
  helpful_count integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Index for fast per-product lookups (approved only)
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_status
  ON product_reviews (product_id, status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_product_reviews_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_reviews_updated_at ON product_reviews;
CREATE TRIGGER trg_product_reviews_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW EXECUTE PROCEDURE update_product_reviews_updated_at();

-- RLS: anyone can insert a review; only authenticated admins can update/delete
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Public: read approved reviews
CREATE POLICY "Public read approved reviews"
  ON product_reviews FOR SELECT
  USING (status = 'approved');

-- Public: submit a review
CREATE POLICY "Public insert review"
  ON product_reviews FOR INSERT
  WITH CHECK (true);

-- Admins: full access
CREATE POLICY "Admins full access reviews"
  ON product_reviews FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
