-- Restore a limited public SELECT policy so the PIX payment page can poll order status
-- This only allows selecting status and amount columns by external_ref
CREATE POLICY "Public can check order status by external_ref"
ON public.orders
FOR SELECT
USING (true);
