CREATE TABLE public.google_pixels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pixel_id text NOT NULL,
  conversion_label text,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.google_pixels TO anon;
GRANT SELECT ON public.google_pixels TO authenticated;
GRANT ALL ON public.google_pixels TO service_role;

ALTER TABLE public.google_pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active google pixels"
ON public.google_pixels FOR SELECT TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage google_pixels"
ON public.google_pixels FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));