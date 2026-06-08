
CREATE TABLE public.site_records (
  id text PRIMARY KEY DEFAULT 'peak_online',
  value integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_records ENABLE ROW LEVEL SECURITY;

-- Anyone can read records
CREATE POLICY "Anyone can read site_records" ON public.site_records FOR SELECT USING (true);

-- Only service role (edge function) will update, no public write
INSERT INTO public.site_records (id, value) VALUES ('peak_online', 0);
