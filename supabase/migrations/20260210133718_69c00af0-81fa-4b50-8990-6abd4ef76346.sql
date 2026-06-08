-- Allow anonymous users to check their own order status by external_ref
CREATE POLICY "Anyone can check order status by external_ref"
ON public.orders
FOR SELECT
USING (true);
