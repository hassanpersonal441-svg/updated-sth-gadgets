-- ============================================================
-- STH Gadgets — Brand Voice Feature Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add brand_voice_enabled column to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS brand_voice_enabled BOOLEAN NOT NULL DEFAULT true;
