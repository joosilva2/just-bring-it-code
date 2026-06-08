-- Remove the overly permissive public SELECT policy on orders
DROP POLICY IF EXISTS "Anyone can check order status by external_ref" ON public.orders;

-- Create a restricted policy that only allows selecting status and amount columns
-- by matching external_ref (for the PIX payment status polling)
-- We'll use an edge function instead, so no public SELECT needed
