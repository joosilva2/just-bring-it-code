
-- 1) Restrict url_slugs writes to admins only
DROP POLICY IF EXISTS "Authenticated users can insert url_slugs" ON public.url_slugs;
DROP POLICY IF EXISTS "Authenticated users can update url_slugs" ON public.url_slugs;
DROP POLICY IF EXISTS "Authenticated users can delete url_slugs" ON public.url_slugs;

CREATE POLICY "Admins can insert url_slugs" ON public.url_slugs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update url_slugs" ON public.url_slugs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete url_slugs" ON public.url_slugs
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Stop exposing tiktok_pixels secret columns to anon.
-- Remove the public-read policy and expose only safe columns via a view.
DROP POLICY IF EXISTS "Anyone can read active pixels" ON public.tiktok_pixels;

CREATE OR REPLACE VIEW public.tiktok_pixels_public
WITH (security_invoker = true) AS
SELECT pixel_id, track_pending, track_paid
FROM public.tiktok_pixels
WHERE is_active = true;

-- View needs an underlying SELECT policy for the invoker; allow public read of the safe subset
CREATE POLICY "Public can read safe pixel fields" ON public.tiktok_pixels
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Note: anon can still SELECT all columns directly. To truly hide secret columns,
-- we revoke column-level SELECT on the sensitive columns for anon/authenticated.
REVOKE SELECT ON public.tiktok_pixels FROM anon, authenticated;
GRANT SELECT (pixel_id, track_pending, track_paid, is_active) ON public.tiktok_pixels TO anon, authenticated;

GRANT SELECT ON public.tiktok_pixels_public TO anon, authenticated;
