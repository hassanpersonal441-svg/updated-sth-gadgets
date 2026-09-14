# STH Gadgets — E-Commerce Platform

A full-stack e-commerce web app for STH Gadgets, a mobile accessories store. Built with Next.js (App Router), TypeScript, Tailwind CSS, and Supabase (PostgreSQL + Auth + Storage). Customers browse and order via WhatsApp; admins manage everything from a secured dashboard.

## What's included

- **Customer site**: home page, product listing with search/filter/sort, product detail page with gallery, quantity selector, live coupon validation, WhatsApp ordering, and share.
- **Admin panel**: Supabase-Auth-protected dashboard with stats, full CRUD for products (with multi-image upload), categories, coupons, and business settings (WhatsApp number, message template, social links, logo, currency).
- **WhatsApp ordering**: every "Order on WhatsApp" click opens WhatsApp with a pre-filled message built from a template you control in Settings.
- **Coupon engine**: percentage or fixed discounts, minimum order, maximum discount cap, expiry date, usage limits — validated live on the product page.
- **Real database**: all data lives in Supabase Postgres. No mock/demo data — the storefront is empty until you add products in the admin panel.
- **SEO**: dynamic sitemap.xml, robots.txt, Open Graph tags, per-product metadata.

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Once it's provisioned, open **SQL Editor** and paste the entire contents of `supabase/schema.sql`, then click **Run**. This creates every table, Row Level Security policy, and storage bucket, and seeds starter categories.
3. Go to **Project Settings > API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — server-side only)

## 2. Create your admin account

1. In Supabase Dashboard, go to **Authentication > Users > Add user**, and create a user with your admin email and a password.
2. Copy that user's UUID (shown in the users table).
3. Back in **SQL Editor**, run:

```sql
insert into public.profiles (id, email, role, full_name)
values ('PASTE-USER-UUID-HERE', 'admin@sthgadgets.com', 'super_admin', 'STH Admin');
```

Only users with a matching row in `profiles` can log into `/admin`. You can add more admins the same way later, from the admin panel's Supabase project directly (there's no "create admin" UI by design, to keep admin creation deliberate).

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the four values from steps 1–2.

## 4. Install and run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` for the storefront and `http://localhost:3000/admin/login` for the admin panel.

## 5. Add your first products

1. Log into `/admin/login`.
2. Go to **Settings** and set your WhatsApp number, order message template, and social links.
3. Go to **Categories** — starter categories are already seeded (Power Banks, Wireless Earbuds, etc.) but you can edit, add, or remove them.
4. Go to **Products > Add Product**, upload images, set price/old price (discount is calculated automatically), specifications, and stock status.

The storefront reads live from your database — nothing will appear until you add it.

## 6. Deploy to Vercel

1. Push this project to a GitHub repository.
2. In [Vercel](https://vercel.com), click **New Project** and import the repo.
3. Add the same four environment variables from `.env.local` in Vercel's Project Settings > Environment Variables. Set `NEXT_PUBLIC_SITE_URL` to your production domain (e.g. `https://sthgadgets.com`).
4. Deploy. Vercel will build and host the app automatically.
5. In Supabase Dashboard > Authentication > URL Configuration, add your production domain to the allowed redirect URLs.

## Project structure

```
src/
  app/
    page.tsx                     # Home page
    products/page.tsx            # Product listing
    products/[slug]/page.tsx     # Product detail
    admin/login/page.tsx         # Admin login
    admin/(protected)/           # Everything below requires admin auth
      dashboard/
      products/
      categories/
      coupons/
      settings/
    api/                         # Route handlers (products, categories, coupons, settings, upload, analytics)
    sitemap.ts / robots.ts
  components/
    storefront/                  # Navbar, Footer, ProductCard, WhatsApp buttons, etc.
    admin/                       # Sidebar, ProductForm, ImageUploader
  lib/
    supabase/                    # Browser, server, and service-role clients
    data.ts                      # Server-side storefront data fetchers
    utils.ts                     # Coupon math, WhatsApp message builder, formatting
    admin-guard.ts                # requireAdmin() check used in every admin API route
  middleware.ts                  # Protects /admin/* routes
supabase/
  schema.sql                     # Full DB schema, RLS policies, storage buckets, seed data
```

## Notes on security

- All admin API routes call `requireAdmin()`, which checks there's a logged-in Supabase user **and** a matching row in `public.profiles` — a logged-in user without a profile row is treated as unauthorized.
- Row Level Security is enabled on every table. Public (anonymous) access is read-only and limited to active products/categories/coupons; all writes require the `is_admin()` policy check.
- The service-role key is only ever used inside server-side route handlers (`src/app/api/**`), never sent to the browser.
- Image uploads are restricted to JPEG/PNG/WEBP/AVIF, capped at 5MB, and go through an admin-only API route rather than direct client-to-storage uploads.

## Notes on coupon usage tracking

Because orders are completed on WhatsApp (outside this app), there's no separate "order confirmed" step to hook into. `times_used` increments each time a coupon is successfully validated on a product page — this is the closest practical signal to "a customer applied this coupon before ordering." If you want stricter tracking, add an order-confirmation step (e.g. a webhook from your WhatsApp Business API) before incrementing usage.

## Tech stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, Storage) · Zod validation · Vercel hosting
