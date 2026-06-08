
-- Fix checkout_events: drop restrictive INSERT policy and recreate as permissive
DROP POLICY IF EXISTS "Allow anonymous insert checkout_events" ON public.checkout_events;
CREATE POLICY "Allow anonymous insert checkout_events"
ON public.checkout_events
FOR INSERT
TO public
WITH CHECK (true);

-- Fix click_events: drop restrictive INSERT policy and recreate as permissive
DROP POLICY IF EXISTS "Allow anonymous insert for click_events" ON public.click_events;
CREATE POLICY "Allow anonymous insert for click_events"
ON public.click_events
FOR INSERT
TO public
WITH CHECK (true);

-- Fix page_views: drop restrictive INSERT policy and recreate as permissive
DROP POLICY IF EXISTS "Allow anonymous insert for page_views" ON public.page_views;
CREATE POLICY "Allow anonymous insert for page_views"
ON public.page_views
FOR INSERT
TO public
WITH CHECK (true);

-- Fix checkout_events SELECT for admins
DROP POLICY IF EXISTS "Admins can read checkout_events" ON public.checkout_events;
CREATE POLICY "Admins can read checkout_events"
ON public.checkout_events
FOR SELECT
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Clean up test data
DELETE FROM checkout_events WHERE visitor_id = 'test-visitor';
