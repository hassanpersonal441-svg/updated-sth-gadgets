-- ============================================================
-- STH Gadgets — Add pending_payment status to orders table
-- Run this script in Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- 1. Update orders table to include pending_payment status
-- This allows orders waiting for online payment verification
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'pending_payment', 'approved', 'processing', 'shipped', 'delivered', 'cancelled', 'rejected'));

-- 2. Update approve_order function to handle pending_payment status
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
  v_order_num := 'STH-' || LPAD(v_seq::TEXT, 4, '0');

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

-- 3. Update verify_payment_and_place_order function to handle pending_payment status
CREATE OR REPLACE FUNCTION public.verify_payment_and_place_order(
  p_payment_id UUID,
  p_admin_id UUID DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS public.payments AS $$
DECLARE
  v_payment public.payments;
  v_order public.orders;
  v_seq BIGINT;
  v_order_num TEXT;
BEGIN
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;
  
  IF v_payment.status = 'paid' THEN
    RAISE EXCEPTION 'Payment % is already verified', p_payment_id;
  END IF;
  
  IF v_payment.status NOT IN ('screenshot_sent', 'under_verification') THEN
    RAISE EXCEPTION 'Payment % cannot be verified - current status: %', p_payment_id, v_payment.status;
  END IF;
  
  UPDATE public.payments
  SET status = 'paid',
      verified_at = now(),
      verified_by = COALESCE(p_admin_id, auth.uid()),
      updated_at = now()
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;
  
  IF v_payment.order_id IS NOT NULL THEN
    SELECT * INTO v_order FROM public.orders WHERE id = v_payment.order_id FOR UPDATE;
    
    IF v_order IS NOT NULL AND v_order.order_number IS NULL AND v_order.status IN ('pending', 'pending_payment') THEN
      v_seq := nextval('public.sth_order_number_seq');
      v_order_num := 'STH-' || LPAD(v_seq::TEXT, 4, '0');
      
      UPDATE public.orders
      SET order_number = v_order_num,
          status = 'approved',
          approved_at = now(),
          approved_by = COALESCE(p_admin_id, auth.uid()),
          admin_notes = COALESCE(p_admin_notes, admin_notes),
          payment_status = 'paid',
          updated_at = now()
      WHERE id = v_payment.order_id;
    END IF;
  END IF;
  
  RETURN v_payment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update reject_payment function to handle pending_payment status
CREATE OR REPLACE FUNCTION public.reject_payment(
  p_payment_id UUID,
  p_rejection_reason TEXT DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL
)
RETURNS public.payments AS $$
DECLARE
  v_payment public.payments;
BEGIN
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;
  
  IF v_payment.status = 'paid' THEN
    RAISE EXCEPTION 'Payment % is already verified and cannot be rejected', p_payment_id;
  END IF;
  
  IF v_payment.status = 'rejected' THEN
    RAISE EXCEPTION 'Payment % is already rejected', p_payment_id;
  END IF;
  
  UPDATE public.payments
  SET status = 'rejected',
      rejection_reason = p_rejection_reason,
      verified_at = now(),
      verified_by = COALESCE(p_admin_id, auth.uid()),
      updated_at = now()
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;
  
  IF v_payment.order_id IS NOT NULL THEN
    UPDATE public.orders
    SET status = 'rejected',
        rejected_at = now(),
        admin_notes = COALESCE('Payment rejected: ' || p_rejection_reason, admin_notes),
        updated_at = now()
    WHERE id = v_payment.order_id;
  END IF;
  
  RETURN v_payment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
