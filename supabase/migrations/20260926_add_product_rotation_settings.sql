-- Migration: Add Product Sequence Auto-Rotation Settings
-- Created: 2026-09-26

ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS auto_rotate_products BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS auto_rotate_interval_minutes INTEGER NOT NULL DEFAULT 60;

COMMENT ON COLUMN public.settings.auto_rotate_products IS 'When true, products circular-shift their display sequence every auto_rotate_interval_minutes';
COMMENT ON COLUMN public.settings.auto_rotate_interval_minutes IS 'Interval in minutes for product sequence rotation (15, 30, 60, 120, 360, 1440)';
