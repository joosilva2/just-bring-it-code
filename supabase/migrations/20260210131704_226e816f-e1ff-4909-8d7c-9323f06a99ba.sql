
-- Table to store multiple TikTok pixels with tracking preferences
CREATE TABLE public.tiktok_pixels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pixel_id TEXT NOT NULL,
  label TEXT, -- optional friendly name
  track_pending BOOLEAN NOT NULL DEFAULT false,
  track_paid BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tiktok_pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tiktok_pixels"
  ON public.tiktok_pixels FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow anonymous SELECT so the frontend can load pixel IDs
CREATE POLICY "Anyone can read active pixels"
  ON public.tiktok_pixels FOR SELECT
  USING (is_active = true);

-- Add UTM/campaign tracking columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS utm_term TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ttclid TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS campaign_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS adset_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ad_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS campaign_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS adset_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ad_name TEXT;
