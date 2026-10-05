-- Add SEO & Metadata columns to products table
-- Allows AI-generated and custom search engine optimization data

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS seo_keywords TEXT,
ADD COLUMN IF NOT EXISTS seo_slug TEXT,
ADD COLUMN IF NOT EXISTS image_alt_text TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT;

COMMENT ON COLUMN public.products.seo_title IS 'AI-generated or custom SEO title for search engines';
COMMENT ON COLUMN public.products.seo_description IS 'AI-generated or custom SEO search engine description';
COMMENT ON COLUMN public.products.seo_keywords IS 'AI-generated or custom SEO search keywords';
COMMENT ON COLUMN public.products.seo_slug IS 'AI-generated or custom SEO URL slug';
COMMENT ON COLUMN public.products.image_alt_text IS 'AI-generated descriptive image alt text for accessibility & Google Image Search';
COMMENT ON COLUMN public.products.meta_description IS 'Marketing-focused meta description for search results';
