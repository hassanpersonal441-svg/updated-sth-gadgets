-- ============================================================
-- STH Gadgets — Finance & Borrowed Amount Management System
-- ============================================================

-- 1. Create sth_borrowing_seq sequence for borrowing numbers (#BOR-0001, #BOR-0002...)
CREATE SEQUENCE IF NOT EXISTS public.sth_borrowing_seq START WITH 1 INCREMENT BY 1;

-- 2. Create sth_repayment_seq sequence for repayment numbers (#REP-0001, #REP-0002...)
CREATE SEQUENCE IF NOT EXISTS public.sth_repayment_seq START WITH 1 INCREMENT BY 1;

-- 3. Create public.borrowings table
CREATE TABLE IF NOT EXISTS public.borrowings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrowing_number TEXT UNIQUE DEFAULT ('BOR-' || lpad(nextval('public.sth_borrowing_seq')::text, 4, '0')),
  lender_name TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  email TEXT,
  borrowed_amount NUMERIC(12, 2) NOT NULL CHECK (borrowed_amount > 0),
  total_repaid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_repaid >= 0),
  remaining_amount NUMERIC(12, 2) NOT NULL CHECK (remaining_amount >= 0),
  borrowing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  purpose TEXT,
  related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  related_order_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partially_paid', 'fully_paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create public.repayments table
CREATE TABLE IF NOT EXISTS public.repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repayment_number TEXT UNIQUE DEFAULT ('REP-' || lpad(nextval('public.sth_repayment_seq')::text, 4, '0')),
  borrowing_id UUID NOT NULL REFERENCES public.borrowings(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  repayment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Other')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Indexes for fast search & filtering
CREATE INDEX IF NOT EXISTS idx_borrowings_lender_name ON public.borrowings (lender_name);
CREATE INDEX IF NOT EXISTS idx_borrowings_whatsapp ON public.borrowings (whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_borrowings_email ON public.borrowings (email);
CREATE INDEX IF NOT EXISTS idx_borrowings_status ON public.borrowings (status);
CREATE INDEX IF NOT EXISTS idx_borrowings_date ON public.borrowings (borrowing_date);
CREATE INDEX IF NOT EXISTS idx_borrowings_order_id ON public.borrowings (related_order_id);
CREATE INDEX IF NOT EXISTS idx_repayments_borrowing_id ON public.repayments (borrowing_id);

-- 6. Trigger Function to recalculate total_repaid, remaining_amount, and status automatically
CREATE OR REPLACE FUNCTION public.sync_borrowing_repayments()
RETURNS TRIGGER AS $$
DECLARE
  v_borrowing_id UUID;
  v_borrowed_amount NUMERIC(12, 2);
  v_total_repaid NUMERIC(12, 2);
  v_remaining NUMERIC(12, 2);
  v_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_borrowing_id := OLD.borrowing_id;
  ELSE
    v_borrowing_id := NEW.borrowing_id;
  END IF;

  -- Lock target borrowing row
  SELECT borrowed_amount INTO v_borrowed_amount
  FROM public.borrowings
  WHERE id = v_borrowing_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Calculate sum of repayments
  SELECT COALESCE(SUM(amount), 0.00) INTO v_total_repaid
  FROM public.repayments
  WHERE borrowing_id = v_borrowing_id;

  v_remaining := GREATEST(0.00, v_borrowed_amount - v_total_repaid);

  IF v_total_repaid = 0 THEN
    v_status := 'active';
  ELSIF v_remaining > 0 THEN
    v_status := 'partially_paid';
  ELSE
    v_status := 'fully_paid';
  END IF;

  UPDATE public.borrowings
  SET total_repaid = v_total_repaid,
      remaining_amount = v_remaining,
      status = v_status,
      updated_at = NOW()
  WHERE id = v_borrowing_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7. Attach Triggers to public.repayments
DROP TRIGGER IF EXISTS trg_sync_repayments ON public.repayments;
CREATE TRIGGER trg_sync_repayments
AFTER INSERT OR UPDATE OR DELETE ON public.repayments
FOR EACH ROW EXECUTE FUNCTION public.sync_borrowing_repayments();

-- Enable RLS on new tables (allow service role & authenticated admin)
ALTER TABLE public.borrowings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repayments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on borrowings" ON public.borrowings
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Admin full access on repayments" ON public.repayments
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
