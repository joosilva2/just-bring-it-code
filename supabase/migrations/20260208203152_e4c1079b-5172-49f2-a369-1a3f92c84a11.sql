
-- Table for page views
CREATE TABLE public.page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  page TEXT NOT NULL DEFAULT '/',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for click events
CREATE TABLE public.click_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  click_type TEXT NOT NULL DEFAULT 'comprar_agora',
  color_chosen TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.click_events ENABLE ROW LEVEL SECURITY;

-- Public insert policy (anonymous tracking)
CREATE POLICY "Anyone can insert page views"
ON public.page_views FOR INSERT
WITH CHECK (true);

-- Public select policy (for dashboard)
CREATE POLICY "Anyone can read page views"
ON public.page_views FOR SELECT
USING (true);

-- Public insert policy for clicks
CREATE POLICY "Anyone can insert click events"
ON public.click_events FOR INSERT
WITH CHECK (true);

-- Public select policy for clicks
CREATE POLICY "Anyone can read click events"
ON public.click_events FOR SELECT
USING (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.page_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.click_events;

-- Indexes for performance
CREATE INDEX idx_page_views_created_at ON public.page_views (created_at);
CREATE INDEX idx_click_events_created_at ON public.click_events (created_at);
CREATE INDEX idx_page_views_visitor_id ON public.page_views (visitor_id);
