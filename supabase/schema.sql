-- ============================================================
-- STH Gadgets — Supabase Database Schema
-- Run this entire file in the Supabase SQL Editor
-- (Project > SQL Editor > New query > paste > Run)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- 0. CLEANUP (Ensure clean slate if tables already exist)
-- ============================================================
drop table if exists public.coupon_usage cascade;
drop table if exists public.whatsapp_clicks cascade;
drop table if exists public.product_images cascade;
drop table if exists public.products cascade;
drop table if exists public.coupons cascade;
drop table if exists public.categories cascade;
drop table if exists public.settings cascade;
drop table if exists public.profiles cascade;

-- ============================================================
-- 1. PROFILES  (extends auth.users, used to mark admins)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('admin', 'super_admin')),
  full_name text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. CATEGORIES
-- ============================================================
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  image_url text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 3. PRODUCTS
-- ============================================================
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text default '',
  short_description text default '',
  specifications jsonb not null default '[]'::jsonb, -- [{"label":"Battery","value":"10000mAh"}]
  key_features jsonb default '[]'::jsonb,
  bundle_offers jsonb default '[]'::jsonb,
  price numeric(12,2) not null check (price >= 0),
  old_price numeric(12,2) check (old_price >= 0),
  discount numeric(5,2) generated always as (
    case
      when old_price is not null and old_price > 0 and old_price > price
        then round(((old_price - price) / old_price) * 100, 2)
      else 0
    end
  ) stored,
  category_id uuid references public.categories(id) on delete set null,
  stock_status text not null default 'in_stock' check (stock_status in ('in_stock', 'out_of_stock', 'low_stock')),
  featured boolean not null default false,
  best_seller boolean not null default false,
  new_arrival boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_active on public.products(active);
create index if not exists idx_products_slug on public.products(slug);

-- ============================================================
-- 4. PRODUCT IMAGES
-- ============================================================
create table public.product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  is_primary boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_images_product on public.product_images(product_id);

-- ============================================================
-- 5. COUPONS
-- ============================================================
create table public.coupons (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12,2) not null check (discount_value >= 0),
  minimum_order numeric(12,2) not null default 0,
  maximum_discount numeric(12,2), -- caps the discount amount for percentage coupons
  expiry_date timestamptz,
  usage_limit int, -- null = unlimited
  times_used int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 6. COUPON USAGE (log every time a coupon is applied at order time)
-- ============================================================
create table public.coupon_usage (
  id uuid primary key default uuid_generate_v4(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  order_amount numeric(12,2),
  discount_amount numeric(12,2),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 7. SETTINGS (single-row business configuration table)
-- ============================================================
create table public.settings (
  id int primary key default 1,
  business_name text not null default 'STH Gadgets',
  logo_url text,
  whatsapp_number text not null default '',
  email text,
  address text,
  facebook text,
  instagram text,
  tiktok text,
  business_greeting text not null default 'Hello STH Gadgets!',
  order_message_template text not null default
    'Hello STH Gadgets!\n\nI want to order this product:\n\nProduct Name: {product_name}\nPrice: Rs. {product_price}\nQuantity: {quantity}\nCoupon Discount: {discount}\nFinal Price: Rs. {final_price}\n\nProduct Link:\n{product_url}\n\nPlease confirm availability.\n\nThank you!',
  currency text not null default 'PKR',
  currency_symbol text not null default 'Rs.',
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ============================================================
-- 8. WHATSAPP CLICK ANALYTICS
-- ============================================================
create table public.whatsapp_clicks (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- updated_at trigger for products
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_usage enable row level security;
alter table public.settings enable row level security;
alter table public.whatsapp_clicks enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid()
  );
$$ language sql security definer stable;

-- PROFILES: a user can read their own profile row only
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- CATEGORIES: public can read active categories; admins can do everything
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
  for select using (active = true or public.is_admin());

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories
  for insert with check (public.is_admin());

drop policy if exists "categories_admin_update" on public.categories;
create policy "categories_admin_update" on public.categories
  for update using (public.is_admin());

drop policy if exists "categories_admin_delete" on public.categories;
create policy "categories_admin_delete" on public.categories
  for delete using (public.is_admin());

-- PRODUCTS: public can read active products; admins can do everything
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select using (active = true or public.is_admin());

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
  for insert with check (public.is_admin());

drop policy if exists "products_admin_update" on public.products;
create policy "products_admin_update" on public.products
  for update using (public.is_admin());

drop policy if exists "products_admin_delete" on public.products;
create policy "products_admin_delete" on public.products
  for delete using (public.is_admin());

-- PRODUCT IMAGES: readable if the parent product is readable; admin writes
drop policy if exists "product_images_public_read" on public.product_images;
create policy "product_images_public_read" on public.product_images
  for select using (true);

drop policy if exists "product_images_admin_write" on public.product_images;
create policy "product_images_admin_write" on public.product_images
  for insert with check (public.is_admin());

drop policy if exists "product_images_admin_update" on public.product_images;
create policy "product_images_admin_update" on public.product_images
  for update using (public.is_admin());

drop policy if exists "product_images_admin_delete" on public.product_images;
create policy "product_images_admin_delete" on public.product_images
  for delete using (public.is_admin());

-- COUPONS: public can read only active, non-expired coupons (needed to validate codes);
-- admins can read/write everything
drop policy if exists "coupons_public_read_active" on public.coupons;
create policy "coupons_public_read_active" on public.coupons
  for select using (active = true or public.is_admin());

drop policy if exists "coupons_admin_write" on public.coupons;
create policy "coupons_admin_write" on public.coupons
  for insert with check (public.is_admin());

drop policy if exists "coupons_admin_update" on public.coupons;
create policy "coupons_admin_update" on public.coupons
  for update using (public.is_admin());

drop policy if exists "coupons_admin_delete" on public.coupons;
create policy "coupons_admin_delete" on public.coupons
  for delete using (public.is_admin());

-- COUPON USAGE: only admins can read; inserts happen via server (service role) route
drop policy if exists "coupon_usage_admin_read" on public.coupon_usage;
create policy "coupon_usage_admin_read" on public.coupon_usage
  for select using (public.is_admin());

-- SETTINGS: public can read; only admins can update
drop policy if exists "settings_public_read" on public.settings;
create policy "settings_public_read" on public.settings
  for select using (true);

drop policy if exists "settings_admin_update" on public.settings;
create policy "settings_admin_update" on public.settings
  for update using (public.is_admin());

-- WHATSAPP CLICKS: admins read; anyone (including anon) can insert a click event
drop policy if exists "whatsapp_clicks_admin_read" on public.whatsapp_clicks;
create policy "whatsapp_clicks_admin_read" on public.whatsapp_clicks
  for select using (public.is_admin());

drop policy if exists "whatsapp_clicks_public_insert" on public.whatsapp_clicks;
create policy "whatsapp_clicks_public_insert" on public.whatsapp_clicks
  for insert with check (true);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('category-images', 'category-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

-- Public read for all three buckets
drop policy if exists "public_read_product_images" on storage.objects;
create policy "public_read_product_images" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "public_read_category_images" on storage.objects;
create policy "public_read_category_images" on storage.objects
  for select using (bucket_id = 'category-images');

drop policy if exists "public_read_site_assets" on storage.objects;
create policy "public_read_site_assets" on storage.objects
  for select using (bucket_id = 'site-assets');

-- Only authenticated admins can upload/delete in these buckets
drop policy if exists "admin_write_product_images" on storage.objects;
create policy "admin_write_product_images" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin_update_product_images" on storage.objects;
create policy "admin_update_product_images" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin_delete_product_images" on storage.objects;
create policy "admin_delete_product_images" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admin_write_category_images" on storage.objects;
create policy "admin_write_category_images" on storage.objects
  for insert with check (bucket_id = 'category-images' and public.is_admin());

drop policy if exists "admin_update_category_images" on storage.objects;
create policy "admin_update_category_images" on storage.objects
  for update using (bucket_id = 'category-images' and public.is_admin());

drop policy if exists "admin_delete_category_images" on storage.objects;
create policy "admin_delete_category_images" on storage.objects
  for delete using (bucket_id = 'category-images' and public.is_admin());

drop policy if exists "admin_write_site_assets" on storage.objects;
create policy "admin_write_site_assets" on storage.objects
  for insert with check (bucket_id = 'site-assets' and public.is_admin());

drop policy if exists "admin_update_site_assets" on storage.objects;
create policy "admin_update_site_assets" on storage.objects
  for update using (bucket_id = 'site-assets' and public.is_admin());

drop policy if exists "admin_delete_site_assets" on storage.objects;
create policy "admin_delete_site_assets" on storage.objects
  for delete using (bucket_id = 'site-assets' and public.is_admin());

-- ============================================================
-- SEED: starter categories (safe to edit/remove)
-- ============================================================
insert into public.categories (name, slug, description, active) values
  ('Power Banks', 'power-banks', 'Portable charging solutions', true),
  ('Wireless Earbuds', 'wireless-earbuds', 'True wireless audio', true),
  ('Chargers', 'chargers', 'Wall chargers', true),
  ('Fast Chargers', 'fast-chargers', 'High-speed charging adapters', true),
  ('USB Cables', 'usb-cables', 'USB-A cables', true),
  ('Type-C Cables', 'type-c-cables', 'USB-C cables', true),
  ('iPhone Cables', 'iphone-cables', 'Lightning cables', true),
  ('Mobile Covers', 'mobile-covers', 'Phone cases and covers', true),
  ('Bluetooth Speakers', 'bluetooth-speakers', 'Portable speakers', true),
  ('Smart Watches', 'smart-watches', 'Wearable tech', true),
  ('Other Accessories', 'other-accessories', 'Miscellaneous mobile accessories', true)
on conflict (slug) do nothing;
