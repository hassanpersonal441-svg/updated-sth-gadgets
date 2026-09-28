-- ============================================================
-- STH Gadgets - Add Delivery & Courier Cost Accounting Columns
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS actual_courier_cost NUMERIC DEFAULT NULL;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_paid_by TEXT DEFAULT 'customer';

ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS actual_courier_cost NUMERIC DEFAULT NULL;

ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS delivery_paid_by TEXT DEFAULT 'customer';

COMMENT ON COLUMN public.orders.actual_courier_cost IS 'Actual delivery cost charged by courier service (TCS, Leopards, Trax, etc.)';
COMMENT ON COLUMN public.orders.delivery_paid_by IS 'Who pays the delivery cost: customer, store, or partial';
