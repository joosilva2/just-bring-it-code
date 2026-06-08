
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_ref TEXT NOT NULL UNIQUE,
  gateway TEXT NOT NULL DEFAULT 'blackcat',
  gateway_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  amount INTEGER NOT NULL,
  color TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_document TEXT,
  shipping_street TEXT,
  shipping_number TEXT,
  shipping_complement TEXT,
  shipping_neighborhood TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_zip TEXT,
  pix_code TEXT,
  pix_qr_base64 TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage orders" ON public.orders FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can insert orders" ON public.orders FOR INSERT
  WITH CHECK (true);

-- Checkout funnel events
CREATE TABLE public.checkout_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.checkout_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert checkout_events" ON public.checkout_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read checkout_events" ON public.checkout_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Gateway config
CREATE TABLE public.gateway_config (
  id TEXT NOT NULL PRIMARY KEY DEFAULT 'active',
  active_gateway TEXT NOT NULL DEFAULT 'blackcat',
  blackcat_api_key TEXT,
  paradise_api_key TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.gateway_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage gateway_config" ON public.gateway_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default config
INSERT INTO public.gateway_config (id, active_gateway) VALUES ('active', 'blackcat');

-- Realtime for orders and checkout events
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.checkout_events;

-- Update trigger for orders
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
