-- roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- analytics
CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  page text NOT NULL DEFAULT '/',
  ip_address text,
  city text,
  region text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  click_type text NOT NULL DEFAULT 'comprar_agora',
  color_chosen text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.page_views TO anon, authenticated;
GRANT INSERT ON public.click_events TO anon, authenticated;
GRANT SELECT ON public.page_views TO authenticated;
GRANT SELECT ON public.click_events TO authenticated;
GRANT ALL ON public.page_views TO service_role;
GRANT ALL ON public.click_events TO service_role;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.click_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous insert for page_views" ON public.page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous insert for click_events" ON public.click_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read page_views" ON public.page_views FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can read click_events" ON public.click_events FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_page_views_created_at ON public.page_views (created_at);
CREATE INDEX idx_click_events_created_at ON public.click_events (created_at);
CREATE INDEX idx_page_views_visitor_id ON public.page_views (visitor_id);
CREATE INDEX idx_page_views_city ON public.page_views (city);

-- site records
CREATE TABLE public.site_records (
  id text PRIMARY KEY DEFAULT 'peak_online',
  value integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_records TO anon, authenticated;
GRANT ALL ON public.site_records TO service_role;
ALTER TABLE public.site_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read site_records" ON public.site_records FOR SELECT USING (true);
INSERT INTO public.site_records (id, value) VALUES ('peak_online', 0);

-- orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_ref text NOT NULL UNIQUE,
  gateway text NOT NULL DEFAULT 'paradise',
  gateway_transaction_id text,
  status text NOT NULL DEFAULT 'pending',
  amount integer NOT NULL,
  color text,
  quantity integer NOT NULL DEFAULT 1,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  customer_document text,
  shipping_street text,
  shipping_number text,
  shipping_complement text,
  shipping_neighborhood text,
  shipping_city text,
  shipping_state text,
  shipping_zip text,
  pix_code text,
  pix_qr_base64 text,
  paid_at timestamptz,
  utm_source text, utm_campaign text, utm_medium text, utm_content text, utm_term text,
  ttclid text, campaign_id text, adset_id text, ad_id text,
  campaign_name text, adset_name text, ad_name text,
  utmify_paid_sent boolean NOT NULL DEFAULT false,
  tiktok_paid_sent boolean NOT NULL DEFAULT false,
  product_type text NOT NULL DEFAULT 'mesa',
  customer_ip text,
  customer_user_agent text,
  tiktok_ttp text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Service can insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- checkout events
CREATE TABLE public.checkout_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL,
  event_type text NOT NULL,
  metadata jsonb,
  tiktok_ic_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.checkout_events TO anon, authenticated;
GRANT SELECT ON public.checkout_events TO authenticated;
GRANT ALL ON public.checkout_events TO service_role;
ALTER TABLE public.checkout_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous insert checkout_events" ON public.checkout_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read checkout_events" ON public.checkout_events FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_checkout_events_ic_resend ON public.checkout_events (event_type, tiktok_ic_sent, created_at);

-- gateway config
CREATE TABLE public.gateway_config (
  id text PRIMARY KEY DEFAULT 'active',
  active_gateway text NOT NULL DEFAULT 'duttyfy',
  blackcat_api_key text,
  paradise_api_key text,
  duttyfy_api_url text,
  redirect_url text,
  buckpay_api_key text,
  buckpay_user_agent text,
  ironpay_api_key text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gateway_config TO authenticated;
GRANT ALL ON public.gateway_config TO service_role;
ALTER TABLE public.gateway_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage gateway_config" ON public.gateway_config FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.gateway_config (id, active_gateway, duttyfy_api_url) VALUES ('active','duttyfy','https://www.pagamentos-seguros.app/api-pix/3FFQ9JisZGSygJKBmCW6KOq8HzI1_VTpHHc8Tmy3FDUDIN2KewhwDu8tEXXh1BuDQMkYSpFGzy9HEkwF1EUUFA');

-- tiktok pixels
CREATE TABLE public.tiktok_pixels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pixel_id text NOT NULL,
  label text,
  track_pending boolean NOT NULL DEFAULT false,
  track_paid boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  access_token_env text NOT NULL DEFAULT 'TIKTOK_ACCESS_TOKEN',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (pixel_id, track_pending, track_paid, is_active) ON public.tiktok_pixels TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tiktok_pixels TO authenticated;
GRANT ALL ON public.tiktok_pixels TO service_role;
ALTER TABLE public.tiktok_pixels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage tiktok_pixels" ON public.tiktok_pixels FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Public can read safe pixel fields" ON public.tiktok_pixels FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE OR REPLACE VIEW public.tiktok_pixels_public WITH (security_invoker = true) AS
  SELECT pixel_id, track_pending, track_paid FROM public.tiktok_pixels WHERE is_active = true;
GRANT SELECT ON public.tiktok_pixels_public TO anon, authenticated;

-- chat questions
CREATE TABLE public.chat_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text,
  question text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.chat_questions TO authenticated;
GRANT ALL ON public.chat_questions TO service_role;
ALTER TABLE public.chat_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read chat_questions" ON public.chat_questions FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_chat_questions_created_at ON public.chat_questions(created_at DESC);

-- url slugs
CREATE TABLE public.url_slugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.url_slugs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.url_slugs TO authenticated;
GRANT ALL ON public.url_slugs TO service_role;
ALTER TABLE public.url_slugs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read url_slugs" ON public.url_slugs FOR SELECT USING (true);
CREATE POLICY "Admins can insert url_slugs" ON public.url_slugs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update url_slugs" ON public.url_slugs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete url_slugs" ON public.url_slugs FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
INSERT INTO public.url_slugs (slug, label, sort_order) VALUES
  ('url1','Conta 1',1),('url2','Conta 2',2),('url3','Conta 3',3),('url4','Conta 4',4),('url5','Conta 5',5);

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.page_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.click_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.checkout_events;