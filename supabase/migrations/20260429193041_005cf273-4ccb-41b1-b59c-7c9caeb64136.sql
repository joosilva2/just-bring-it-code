ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS customer_ip TEXT,
  ADD COLUMN IF NOT EXISTS customer_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_ttp TEXT;