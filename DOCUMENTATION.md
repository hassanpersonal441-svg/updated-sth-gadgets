# STH GADGETS — AUTOMATED WHATSAPP ORDER APPROVAL SYSTEM
## System Setup & Operation Guide

This document provides a comprehensive guide for configuring, deploying, operating, and testing the **Automated WhatsApp Order Approval System** for STH Gadgets.

---

### 1. Files Changed & Added

- `supabase/migrations/20260914_whatsapp_approval_system.sql` *(NEW)*: SQL migration for tracking columns (`approved_at`, `rejected_at`, `admin_notification_sent`, `customer_notification_sent`).
- `src/lib/whatsapp.ts` *(NEW)*: Event-driven WhatsApp notification service for Make.com webhooks and idempotency checks.
- `src/lib/utils.ts` *(MODIFIED)*: Added `normalizePhoneNumber()` helper supporting Pakistani format (`0300...` -> `92300...`).
- `src/types/database.ts` *(MODIFIED)*: Extended `Order` interface with timestamp and notification state properties.
- `src/app/api/orders/checkout/route.ts` *(MODIFIED)*: Saved orders with notification flags and triggered Make.com Scenario 1 on order placement.
- `src/app/api/admin/orders/[id]/approve/route.ts` *(MODIFIED)*: Atomic order approval, order sequence assignment, and Make.com Scenario 2 trigger.
- `src/app/api/admin/orders/[id]/reject/route.ts` *(NEW)*: Rejection endpoint setting `status = 'rejected'`, `rejected_at = NOW()`, and omitting customer messages.
- `src/app/api/admin/orders/[id]/retry-notification/route.ts` *(NEW)*: Admin endpoint to safely retry failed WhatsApp alerts.
- `src/app/admin/(protected)/orders/page.tsx` *(MODIFIED)*: Added notification status indicators (`✓ Sent`, `⚠ Failed`), inline `[ APPROVE ]` & `[ REJECT ]` buttons, and toast notifications.
- `src/components/admin/OrderActionModal.tsx` *(MODIFIED)*: Added WhatsApp Notification Status card, manual retry controls, and explicit Approve/Reject handlers.
- `.env.example` & `.env.local` *(MODIFIED)*: Added environment variable templates for Make.com webhooks and WhatsApp API credentials.

---

### 2. Supabase Tables & Columns Changed

Table modified: `public.orders`

| Column Name | Type | Default Value | Description |
|---|---|---|---|
| `approved_at` | `TIMESTAMPTZ` | `NULL` | Timestamp when the order was approved by the admin |
| `rejected_at` | `TIMESTAMPTZ` | `NULL` | Timestamp when the order was rejected by the admin |
| `admin_notification_sent` | `BOOLEAN` | `FALSE` | Idempotency flag preventing duplicate admin notifications |
| `customer_notification_sent` | `BOOLEAN` | `FALSE` | Idempotency flag preventing duplicate customer approval messages |

Indexes created:
- `idx_orders_admin_notif`
- `idx_orders_customer_notif`
- `idx_orders_rejected_at`

---

### 3. SQL Migration Script

Run this SQL query in your Supabase Dashboard (**SQL Editor > New Query > Run**):

```sql
-- ============================================================
-- STH Gadgets — WhatsApp Order Approval & Notification System
-- ============================================================

-- 1. Extend public.orders table with WhatsApp notification tracking & rejection timestamp
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_notification_sent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_notification_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- Create indexes for quick lookup
CREATE INDEX IF NOT EXISTS idx_orders_admin_notif ON public.orders(admin_notification_sent);
CREATE INDEX IF NOT EXISTS idx_orders_customer_notif ON public.orders(customer_notification_sent);
CREATE INDEX IF NOT EXISTS idx_orders_rejected_at ON public.orders(rejected_at);

-- 2. Update approve_order stored procedure
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

  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'Order % cannot be approved because status is %', p_order_id, v_order.status;
  END IF;

  IF v_order.order_number IS NOT NULL THEN
    RAISE EXCEPTION 'Order % already has official order number %', p_order_id, v_order.order_number;
  END IF;

  -- Atomic sequence generation (STH-0001, STH-0002, ...)
  v_seq := nextval('public.sth_order_number_seq');
  v_order_num := 'STH-' || lpad(v_seq::text, 4, '0');

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
```

---

### 4. Environment Variables Configuration

Configure the following variables in your `.env.local` file (and in Vercel / hosting provider production environment settings):

```env
# Supabase Project Credentials
NEXT_PUBLIC_SUPABASE_URL=https://ttktpavtgfrndvvrlwoa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Admin's 2nd WhatsApp Number (e.g., 923489593671)
ADMIN_WHATSAPP_NUMBER=923489593671

# Make.com Instant Event Webhook URLs
MAKE_NEW_ORDER_WEBHOOK_URL=https://hook.eu1.make.com/your-new-order-webhook-id
MAKE_ORDER_APPROVED_WEBHOOK_URL=https://hook.eu1.make.com/your-approved-order-webhook-id

# Optional generic fallback Make.com Webhook URL
MAKE_WEBHOOK_URL=https://hook.eu1.make.com/your-general-webhook-id

# Meta WhatsApp Business Cloud API Metadata
WHATSAPP_PHONE_NUMBER_ID=your-whatsapp-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-whatsapp-business-account-id
```

---

### 5. Make.com Account Setup

1. Sign up or log into your account at [Make.com](https://www.make.com).
2. Create a new Organization / Team for **STH Gadgets**.
3. Create two new Scenarios under your team.

---

### 6. Make.com Scenario 1 Configuration (New Order Alert -> Admin)

#### Workflow Architecture:
```
Custom Webhook (Trigger) -> Router / Filter -> WhatsApp Business Cloud API -> Supabase (Update admin_notification_sent)
```

#### Step-by-Step Scenario Setup:
1. **Module 1: Webhooks — Custom Webhook**
   - Click **Add** -> Name: `STH New Order Webhook`.
   - Copy the generated Webhook URL (e.g. `https://hook.eu1.make.com/xxxxxx`).
   - Set this URL as `MAKE_NEW_ORDER_WEBHOOK_URL` in `.env.local`.
2. **Filter: Check New Order Status**
   - Setup a filter between Module 1 and Module 2:
     - Condition: `event` equal to `new_order`
     - And `status` equal to `PENDING`
3. **Module 2: WhatsApp Business Cloud API — Send a Message**
   - Connection: Connect your Meta WhatsApp Business Cloud account.
   - Phone Number ID: Select your registered WhatsApp Business phone number.
   - To: `{{admin_phone}}` (Admin's 2nd WhatsApp Number).
   - Message Type: **Template** or **Text Message**.
   - Body Parameters / Text:
     ```text
     🛒 STH GADGETS — NEW ORDER

     Order: #{{order_number}}

     👤 Customer:
     {{customer_name}}

     📱 Phone:
     {{raw_customer_phone}}

     📦 Products:
     {{products}}

     💰 Total:
     {{formatted_total}}

     📍 Address:
     {{customer_address}}

     ⏳ Status:
     PENDING

     Please open the STH Gadgets Admin Panel to review this order.
     ```
4. **Module 3: Supabase / HTTP API — Update Order Flag**
   - Endpoint: `PATCH https://<YOUR_SUPABASE_REF>.supabase.co/rest/v1/orders?id=eq.{{order_id}}`
   - Headers: `apikey: <SUPABASE_SERVICE_ROLE_KEY>`, `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`, `Content-Type: application/json`
   - Body: `{"admin_notification_sent": true}`

---

### 7. Make.com Scenario 2 Configuration (Order Approved -> Customer)

#### Workflow Architecture:
```
Custom Webhook (Trigger) -> Router / Filter -> WhatsApp Business Cloud API -> Supabase (Update customer_notification_sent)
```

#### Step-by-Step Scenario Setup:
1. **Module 1: Webhooks — Custom Webhook**
   - Click **Add** -> Name: `STH Order Approved Webhook`.
   - Copy the generated Webhook URL (e.g. `https://hook.eu1.make.com/yyyyyy`).
   - Set this URL as `MAKE_ORDER_APPROVED_WEBHOOK_URL` in `.env.local`.
2. **Filter: Check Approved Status**
   - Setup a filter between Module 1 and Module 2:
     - Condition: `event` equal to `order_approved`
     - And `status` equal to `APPROVED`
3. **Module 2: WhatsApp Business Cloud API — Send a Message**
   - Connection: Select your Meta WhatsApp Business Cloud account.
   - To: `{{customer_phone}}` (Customer's WhatsApp number normalized).
   - Message Type: **Template** or **Text Message**.
   - Text Content / Template Parameters:
     ```text
     🎉 STH GADGETS

     Assalam-o-Alaikum {{customer_name}}!

     Your order #{{order_number}} has been APPROVED ✅

     📦 Order Total:
     {{formatted_total}}

     Thank you for shopping with STH Gadgets.

     We will contact you regarding delivery soon. 📦
     ```
4. **Module 3: Supabase / HTTP API — Update Order Flag**
   - Endpoint: `PATCH https://<YOUR_SUPABASE_REF>.supabase.co/rest/v1/orders?id=eq.{{order_id}}`
   - Headers: `apikey: <SUPABASE_SERVICE_ROLE_KEY>`, `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`, `Content-Type: application/json`
   - Body: `{"customer_notification_sent": true}`

---

### 8. WhatsApp Business Cloud API Setup

1. Go to [Meta for Developers Console](https://developers.facebook.com/).
2. Select or create your App (Type: **Business**).
3. Add **WhatsApp** product to your App.
4. Obtain:
   - **Phone Number ID**
   - **WhatsApp Business Account ID**
   - **System User Permanent Access Token**
5. Link your WhatsApp Business phone number and verify company details.

---

### 9. Meta WhatsApp Message Templates Setup

Per Meta WhatsApp Business policies, outbound customer-initiated messages past 24 hours require approved Message Templates.

#### Template 1: Admin Order Alert (`sth_new_order_admin`)
- Category: **UTILITY**
- Language: **English (US) / Urdu**
- Header: None
- Body:
  ```text
  🛒 STH GADGETS — NEW ORDER

  Order: {{1}}

  👤 Customer:
  {{2}}

  📱 Phone:
  {{3}}

  📦 Products:
  {{4}}

  💰 Total:
  IDR {{5}}

  📍 Address:
  {{6}}

  ⏳ Status:
  PENDING

  Please open the STH Gadgets Admin Panel to review this order.
  ```

#### Template 2: Customer Order Approved (`sth_order_approved_customer`)
- Category: **UTILITY**
- Language: **English (US) / Urdu**
- Header: None
- Body:
  ```text
  🎉 STH GADGETS

  Assalam-o-Alaikum {{1}}!

  Your order #{{2}} has been APPROVED ✅

  📦 Order Total:
  IDR {{3}}

  Thank you for shopping with STH Gadgets.

  We will contact you regarding delivery soon. 📦
  ```

---

### 10. Webhook URLs Reference

- Scenario 1 Webhook URL: `MAKE_NEW_ORDER_WEBHOOK_URL`
- Scenario 2 Webhook URL: `MAKE_ORDER_APPROVED_WEBHOOK_URL`
- Webhook Payload format: Standard JSON with UTF-8 encoding over HTTPS.

---

### 11. Testing Procedure

#### TEST 1 — New Order Placement
1. Navigate to store front checkout (`/`).
2. Add a product to cart and click checkout.
3. Fill in name, Pakistani phone `03001234567`, city, address, and place order.
4. **Expected Result**:
   - Supabase `orders` record created with `status = pending`, `admin_notification_sent = true`.
   - Admin's 2nd WhatsApp number receives the new order alert.
   - Admin Panel displays the order under **Pending Approval** with status badge `Admin Notif: ✓ Sent`.

#### TEST 2 — Order Approval
1. Log into Admin Panel (`/admin/orders`).
2. Find the pending order and click `[ APPROVE ORDER ]`.
3. **Expected Result**:
   - Supabase `status` updates to `approved`, `approved_at` timestamp recorded, official order number assigned (`STH-0001`).
   - Make.com Scenario 2 triggers automatically.
   - Customer's WhatsApp receives approval message.
   - Admin Panel shows toast: `"Order approved successfully."` and badge `Customer Notif: ✓ Sent`.

#### TEST 3 — Order Rejection
1. Place a new test order.
2. In Admin Panel, click `[ REJECT ORDER ]`.
3. **Expected Result**:
   - Supabase `status` updates to `rejected`, `rejected_at` timestamp recorded.
   - NO customer WhatsApp approval message is sent.
   - Admin Panel shows toast: `"Order rejected successfully."`

#### TEST 4 — Duplicate Protection
1. Refresh Admin Panel or re-click Approve on an already approved order.
2. **Expected Result**:
   - Idempotency checks on `customer_notification_sent` prevent duplicate WhatsApp messages.

#### TEST 5 — API Error Resilience
1. Set an invalid webhook URL temporarily.
2. Place an order or click Approve.
3. **Expected Result**:
   - Order remains safely stored in Supabase with zero data loss.
   - Notification status shows `⚠ Failed`, with option to click **Retry Alert** or **Retry Approval** from Admin Panel.

---

### 12. Production Deployment Requirements

1. Run the SQL migration script in your Supabase Production SQL Editor.
2. Configure all environment variables in Vercel / server provider environment settings.
3. Activate both Make.com Scenarios (**Turn ON** scenario toggles in Make.com).
4. Verify Meta WhatsApp Business API System User Permanent Access Token is non-expiring.
