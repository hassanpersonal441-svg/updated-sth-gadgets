-- ============================================================
-- STH Gadgets — WhatsApp Order Approval & Notification System
-- Run this script in Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- 1. Extend public.orders table with WhatsApp notification tracking & rejection timestamp
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_notification_sent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_notification_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for quick lookup of unsent notifications if needed
CREATE INDEX IF NOT EXISTS idx_orders_admin_notif ON public.orders(admin_notification_sent);
CREATE INDEX IF NOT EXISTS idx_orders_customer_notif ON public.orders(customer_notification_sent);
CREATE INDEX IF NOT EXISTS idx_orders_rejected_at ON public.orders(rejected_at);

-- 2. Update approve_order stored procedure to return full order including notification flags
CREATE OR REPLACE FUNCTION public.approve_order(
  p_order_id UUID,
  p_admin_id UUID DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS public.orders AS $$
DECLARE
  v_order public.orders;
  v_seq BIGINT;
  v_order_num TEXT;
BEGIN
  -- Lock row for concurrency safety
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  IF v_order.status NOT IN ('pending', 'pending_payment') THEN
    RAISE EXCEPTION 'Order % cannot be approved because status is %', p_order_id, v_order.status;
  END IF;

  IF v_order.order_number IS NOT NULL THEN
    RAISE EXCEPTION 'Order % already has official order number %', p_order_id, v_order.order_number;
  END IF;

  -- Atomic concurrency-safe sequence generation (STH-0001, STH-0002, ...)
  v_seq := nextval('public.sth_order_number_seq');
  v_order_num := 'STH-' || lpad(v_seq::text, 4, '0');

  -- Update order atomically
  UPDATE public.orders
  SET order_number = v_order_num,
      status = 'approved',
      approved_at = NOW(),
      approved_by = COALESCE(p_admin_id, auth.uid()),
      admin_notes = COALESCE(p_admin_notes, admin_notes),
      updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
