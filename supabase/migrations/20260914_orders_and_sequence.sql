-- ============================================================
-- STH Gadgets — Orders, Order Items & Official Sequence System
-- Run this entire script in Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- 1. Create orders table
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text unique, -- NULL for PENDING orders, assigned STH-0001+ only upon admin approval
  status text not null default 'pending' check (status in ('pending', 'pending_payment', 'approved', 'processing', 'shipped', 'delivered', 'cancelled', 'rejected')),
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  phone text not null,
  city text not null,
  address text not null,
  subtotal numeric(12,2) not null default 0,
  delivery_charges numeric(12,2) not null default 0,
  coupon_discount numeric(12,2) not null default 0,
  bundle_discount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  payment_status text not null default 'pending',
  order_source text not null default 'whatsapp',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  admin_notes text
);

create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_order_number on public.orders(order_number);
create index if not exists idx_orders_created_at on public.orders(created_at desc);

-- 2. Create order_items table
create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  variant_name text,
  unit_price numeric(12,2) not null,
  quantity int not null default 1 check (quantity > 0),
  line_total numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order on public.order_items(order_id);

-- 3. Create concurrency-safe PostgreSQL sequence starting at 1
create sequence if not exists public.sth_order_number_seq start with 1 increment by 1;

-- 4. Create atomic order approval stored function
create or replace function public.approve_order(
  p_order_id uuid,
  p_admin_id uuid default null,
  p_admin_notes text default null
)
returns public.orders as $$
declare
  v_order public.orders;
  v_seq bigint;
  v_order_num text;
begin
  -- Row-level lock to prevent race conditions during concurrent admin approvals
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  if v_order.status not in ('pending', 'pending_payment') then
    raise exception 'Order % cannot be approved because status is %', p_order_id, v_order.status;
  end if;

  if v_order.order_number is not null then
    raise exception 'Order % already has official order number %', p_order_id, v_order.order_number;
  end if;

  -- Atomic concurrency-safe sequence generation (STH-0001, STH-0002, ...)
  v_seq := nextval('public.sth_order_number_seq');
  v_order_num := 'STH-' || lpad(v_seq::text, 4, '0');

  -- Update order atomically
  update public.orders
  set order_number = v_order_num,
      status = 'approved',
      approved_at = now(),
      approved_by = coalesce(p_admin_id, auth.uid()),
      admin_notes = coalesce(p_admin_notes, admin_notes),
      updated_at = now()
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$ language plpgsql security definer;

-- 5. Row Level Security policies
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Admins can do everything on orders
drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all" on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

-- Public can insert orders (service role will also be used in API routes)
drop policy if exists "orders_public_insert" on public.orders;
create policy "orders_public_insert" on public.orders
  for insert with check (true);

-- Admins can do everything on order_items
drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all" on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

-- Public can insert order_items
drop policy if exists "order_items_public_insert" on public.order_items;
create policy "order_items_public_insert" on public.order_items
  for insert with check (true);
