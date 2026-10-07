ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS cod_courier_fees NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_deductions NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS settlement_amount_received NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS settlement_date TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.orders.cod_courier_fees IS 'Fees charged by courier for COD services';
COMMENT ON COLUMN public.orders.tax_deductions IS 'Tax or withholding deducted by courier';
COMMENT ON COLUMN public.orders.settlement_amount_received IS 'Actual cash/bank amount received from courier';
COMMENT ON COLUMN public.orders.settlement_status IS 'Status of COD settlement (pending, received, reconciled)';
