CREATE TABLE public.pinterest_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_id TEXT NOT NULL UNIQUE,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pinterest_tags TO anon;
GRANT SELECT ON public.pinterest_tags TO authenticated;
GRANT ALL ON public.pinterest_tags TO service_role;
ALTER TABLE public.pinterest_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active pinterest tags" ON public.pinterest_tags FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins can manage pinterest_tags" ON public.pinterest_tags FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.pinterest_tags (tag_id, label) VALUES ('2613699341228', 'Tag principal') ON CONFLICT (tag_id) DO NOTHING;