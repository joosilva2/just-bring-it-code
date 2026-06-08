-- Remove permissão de INSERT anônimo em orders. Edge functions usam service_role e bypassam RLS,
-- então essa policy só permitia bots criarem registros falsos.
DROP POLICY IF EXISTS "Service can insert orders" ON public.orders;
REVOKE INSERT ON public.orders FROM anon;

-- Restringe execução de has_role a usuários autenticados
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;