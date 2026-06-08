
CREATE TABLE public.url_slugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.url_slugs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read slugs (needed for frontend routing)
CREATE POLICY "Anyone can read url_slugs" ON public.url_slugs FOR SELECT USING (true);

-- Only authenticated users can manage slugs
CREATE POLICY "Authenticated users can insert url_slugs" ON public.url_slugs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update url_slugs" ON public.url_slugs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete url_slugs" ON public.url_slugs FOR DELETE TO authenticated USING (true);

-- Seed 5 empty slots
INSERT INTO public.url_slugs (slug, label) VALUES
  ('url1', 'Conta 1'),
  ('url2', 'Conta 2'),
  ('url3', 'Conta 3'),
  ('url4', 'Conta 4'),
  ('url5', 'Conta 5');
