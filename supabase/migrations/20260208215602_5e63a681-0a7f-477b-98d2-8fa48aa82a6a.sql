-- Add location columns to page_views table
ALTER TABLE public.page_views 
ADD COLUMN IF NOT EXISTS ip_address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS region text;

-- Create index for faster location queries
CREATE INDEX IF NOT EXISTS idx_page_views_city ON public.page_views(city);

-- Drop old permissive read policies that were security issues
DROP POLICY IF EXISTS "Anyone can read click events" ON public.click_events;
DROP POLICY IF EXISTS "Anyone can read page views" ON public.page_views;
DROP POLICY IF EXISTS "Anyone can insert click events" ON public.click_events;
DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;