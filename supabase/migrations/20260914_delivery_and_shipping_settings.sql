-- ============================================================
-- STH Gadgets — Delivery & Shipping Policies Migration
-- Run this script in Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

alter table public.settings add column if not exists delivery_charges numeric(12,2) not null default 200;
alter table public.settings add column if not exists free_shipping_threshold numeric(12,2) not null default 5000;
alter table public.settings add column if not exists payment_method_title text not null default 'Cash on Delivery (COD)';
alter table public.settings add column if not exists courier_partners text not null default 'Trax, Leopard & TCS Couriers';
alter table public.settings add column if not exists dispatch_window text not null default '2 – 4 Working Days';
alter table public.settings add column if not exists dispatch_note text not null default 'Dispatched after WhatsApp verification';
