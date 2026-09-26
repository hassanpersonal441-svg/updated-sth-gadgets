-- ============================================================
-- STH Gadgets — Online Payment System with WhatsApp Screenshot Verification
-- ============================================================

-- 1. Create payments table
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

-- 2. Add online payment fields to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;

-- 3. Add online payment settings to settings table
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS online_payment_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS payment_method_name TEXT DEFAULT 'JazzCash';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS payment_account_name TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS payment_account_number TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS payment_instructions TEXT DEFAULT 'Send the exact order amount to the above account. After payment, take a screenshot of the successful transaction and send it to us on WhatsApp for verification.';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS payment_whatsapp_number TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS payment_verification_required BOOLEAN NOT NULL DEFAULT true;

-- 4. Create trigger for updated_at on payments
DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Row Level Security for payments
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

-- 6. Create function to generate unique payment reference
CREATE OR REPLACE FUNCTION public.generate_payment_reference()
RETURNS TEXT AS $$
DECLARE
  v_date TEXT;
  v_random TEXT;
  v_ref TEXT;
BEGIN
  v_date := TO_CHAR(NOW(), 'YYYYMMDD');
  v_random := UPPER(SUBSTR(ENCODE(GEN_RANDOM_BYTES(3), 'base64'), 1, 6));
  v_random := REGEXP_REPLACE(v_random, '[^A-Z0-9]', '', 'g');
  v_ref := 'STHPAY-' || v_date || '-' || v_random;
  
  WHILE EXISTS (SELECT 1 FROM public.payments WHERE payment_reference = v_ref) LOOP
    v_random := UPPER(SUBSTR(ENCODE(GEN_RANDOM_BYTES(3), 'base64'), 1, 6));
    v_random := REGEXP_REPLACE(v_random, '[^A-Z0-9]', '', 'g');
    v_ref := 'STHPAY-' || v_date || '-' || v_random;
  END LOOP;
  
  RETURN v_ref;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to verify payment and place order
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

-- 8. Create function to reject payment
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
