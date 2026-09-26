-- Add stable vendor purchase numbers and payment tracking.
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
