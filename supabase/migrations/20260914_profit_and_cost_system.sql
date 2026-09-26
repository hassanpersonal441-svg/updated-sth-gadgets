-- ============================================================
-- STH Gadgets — Purchase Price, Cost & Profit Margin Migration
-- Run this script in Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- 1. Extend products table with SKU and financial cost fields
alter table public.products add column if not exists sku text;
alter table public.products add column if not exists purchase_price numeric(12,2) not null default 0 check (purchase_price >= 0);
alter table public.products add column if not exists wholesale_price numeric(12,2) check (wholesale_price >= 0);

-- Add generated columns for Profit Amount and Profit Margin %
-- Note: If columns already exist, skip or recreate cleanly
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'products' and column_name = 'profit_amount'
  ) then
    alter table public.products 
      add column profit_amount numeric(12,2) generated always as (price - purchase_price) stored;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'products' and column_name = 'profit_margin'
  ) then
    alter table public.products 
      add column profit_margin numeric(5,2) generated always as (
        case 
          when price > 0 then round(((price - purchase_price) / price) * 100, 2)
          else 0
        end
      ) stored;
  end if;
end $$;

create index if not exists idx_products_sku on public.products(sku);

-- 2. Extend order_items with snapshot purchase_price
-- This ensures historical order profits remain accurate even after future product edits
alter table public.order_items add column if not exists purchase_price numeric(12,2) not null default 0 check (purchase_price >= 0);

-- Backfill existing order items with current product purchase price
update public.order_items oi
set purchase_price = coalesce(p.purchase_price, 0)
from public.products p
where oi.product_id = p.id and oi.purchase_price = 0;

-- 3. Extend settings with negative profit prevention toggle
alter table public.settings add column if not exists prevent_negative_profit boolean not null default false;
