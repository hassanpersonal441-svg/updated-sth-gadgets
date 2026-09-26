-- ============================================================
-- STH Gadgets - Security Policy Fixes for Vendor and Finance Tables
-- SAFE MIGRATION: Fixes overly permissive RLS policies
-- NO DATA LOSS: Only changes security policies, not data
-- ============================================================

-- Start transaction for atomic execution
BEGIN;

-- ============================================================
-- 1. FIX VENDOR PROFILES RLS POLICIES
-- ============================================================

-- Remove overly permissive public access policy
DROP POLICY IF EXISTS "Full access on vendor_profiles" ON public.vendor_profiles;

-- Create proper admin-only policy
CREATE POLICY "vendor_profiles_admin_all" ON public.vendor_profiles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 2. FIX VENDOR PURCHASES RLS POLICIES
-- ============================================================

-- Remove overly permissive public access policy
DROP POLICY IF EXISTS "Full access on vendor_purchases" ON public.vendor_purchases;

-- Create proper admin-only policy
CREATE POLICY "vendor_purchases_admin_all" ON public.vendor_purchases
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 3. FIX FINANCE BORROWINGS RLS POLICIES
-- ============================================================

-- Remove the policy that uses auth.role() (inconsistent with rest of system)
DROP POLICY IF EXISTS "Admin full access on borrowings" ON public.borrowings;

-- Create proper admin-only policy using is_admin() function
CREATE POLICY "borrowings_admin_all" ON public.borrowings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 4. FIX FINANCE REPAYMENTS RLS POLICIES
-- ============================================================

-- Remove the policy that uses auth.role() (inconsistent with rest of system)
DROP POLICY IF EXISTS "Admin full access on repayments" ON public.repayments;

-- Create proper admin-only policy using is_admin() function
CREATE POLICY "repayments_admin_all" ON public.repayments
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 5. ADD UPDATED_AT TRIGGER FOR VENDOR TABLES (if missing)
-- ============================================================

-- Ensure updated_at trigger exists for vendor_profiles
DROP TRIGGER IF EXISTS trg_vendor_profiles_updated_at ON public.vendor_profiles;
CREATE TRIGGER trg_vendor_profiles_updated_at
  BEFORE UPDATE ON public.vendor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ensure updated_at trigger exists for vendor_purchases
DROP TRIGGER IF EXISTS trg_vendor_purchases_updated_at ON public.vendor_purchases;
CREATE TRIGGER trg_vendor_purchases_updated_at
  BEFORE UPDATE ON public.vendor_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- COMMIT TRANSACTION
-- ============================================================
COMMIT;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Verify that policies are now admin-only
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('vendor_profiles', 'vendor_purchases', 'borrowings', 'repayments')
  AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Verify that is_admin() function exists and works
SELECT public.is_admin();