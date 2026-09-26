-- ============================================================
-- STH Gadgets — Invoice Management System Schema Migration
-- Run this entire script in Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- 1. Create concurrency-safe PostgreSQL sequence for invoice numbers starting at 1
create sequence if not exists public.sth_invoice_number_seq start with 1 increment by 1;

-- 2. Create invoices table
create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  invoice_number text unique, -- Formatted like STH-INV-00001
  customer_name text not null,
  customer_phone text not null,
  customer_whatsapp text,
  customer_email text,
  customer_address text not null,
  customer_city text not null,
  invoice_date timestamptz not null default now(),
  due_date timestamptz,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  item_discount numeric(12,2) not null default 0 check (item_discount >= 0),
  coupon_discount numeric(12,2) not null default 0 check (coupon_discount >= 0),
  delivery_charges numeric(12,2) not null default 0 check (delivery_charges >= 0),
  grand_total numeric(12,2) not null default 0 check (grand_total >= 0),
  coupon_code text,
  coupon_id uuid references public.coupons(id) on delete set null,
  payment_method text not null default 'Cash on Delivery' check (payment_method in ('Cash on Delivery', 'Cash', 'Bank Transfer', 'Easypaisa', 'JazzCash', 'Other')),
  payment_status text not null default 'Unpaid' check (payment_status in ('Unpaid', 'Partial', 'Paid', 'Refunded')),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  remaining_amount numeric(12,2) not null default 0 check (remaining_amount >= 0),
  invoice_status text not null default 'Draft' check (invoice_status in ('Draft', 'Pending', 'Confirmed', 'Paid', 'Delivered', 'Cancelled')),
  notes text,
  terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoices_invoice_number on public.invoices(invoice_number);
create index if not exists idx_invoices_invoice_status on public.invoices(invoice_status);
create index if not exists idx_invoices_payment_status on public.invoices(payment_status);
create index if not exists idx_invoices_created_at on public.invoices(created_at desc);

-- 3. Create invoice_items table (stores product price & name snapshot)
create table if not exists public.invoice_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_image text,
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) not null check (total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_invoice_items_invoice on public.invoice_items(invoice_id);

-- 4. Auto-generate sequence-based invoice number on INSERT if NULL
create or replace function public.set_invoice_number()
returns trigger as $$
declare
  v_seq bigint;
begin
  if new.invoice_number is null or new.invoice_number = '' then
    v_seq := nextval('public.sth_invoice_number_seq');
    new.invoice_number := 'STH-INV-' || lpad(v_seq::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_invoices_number on public.invoices;
create trigger trg_invoices_number
before insert on public.invoices
for each row execute function public.set_invoice_number();

-- 5. Updated_at trigger for invoices
drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

-- 6. Row Level Security policies
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

-- Admins can perform all actions on invoices
drop policy if exists "invoices_admin_all" on public.invoices;
create policy "invoices_admin_all" on public.invoices
  for all using (public.is_admin()) with check (public.is_admin());

-- Public can read invoices (needed for public customer invoice viewer /invoice/[id])
drop policy if exists "invoices_public_read" on public.invoices;
create policy "invoices_public_read" on public.invoices
  for select using (true);

-- Admins can perform all actions on invoice_items
drop policy if exists "invoice_items_admin_all" on public.invoice_items;
create policy "invoice_items_admin_all" on public.invoice_items
  for all using (public.is_admin()) with check (public.is_admin());

-- Public can read invoice_items (needed for public customer invoice viewer /invoice/[id])
drop policy if exists "invoice_items_public_read" on public.invoice_items;
create policy "invoice_items_public_read" on public.invoice_items
  for select using (true);
