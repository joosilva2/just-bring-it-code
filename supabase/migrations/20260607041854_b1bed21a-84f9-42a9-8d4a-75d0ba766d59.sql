-- Remove a policy pública que expunha PII de TODOS os clientes via Data API
DROP POLICY IF EXISTS "Public can check order status by external_ref" ON public.orders;

-- Mantém a policy "Service can insert orders" (necessária para edge functions de pagamento,
-- mas restringe a INSERT apenas — leitura/edição continuam sendo só admin)
-- (já existe; nada a alterar)

-- Revoga qualquer acesso de anon na tabela orders (defense in depth: sem GRANT,
-- mesmo se uma policy errada for criada no futuro, anon não consegue ler)
REVOKE ALL ON public.orders FROM anon;
GRANT INSERT ON public.orders TO anon; -- necessário p/ edge functions chamadas anônimas (insert via service)
-- Authenticated continua sem grants (apenas admin via has_role)
GRANT ALL ON public.orders TO service_role;

-- Lock down tiktok_pixels: nunca expor access_token_env via Data API a anônimos
-- (campo é só o NOME da env, mas reduz superfície)
REVOKE ALL ON public.tiktok_pixels FROM anon;
GRANT SELECT (id, pixel_id, label, track_pending, track_paid, is_active) ON public.tiktok_pixels TO anon;
GRANT ALL ON public.tiktok_pixels TO service_role;

-- Lock down gateway_config: nunca exposto a anon/authenticated (já é admin-only,
-- garantir GRANTs corretos como defesa adicional)
REVOKE ALL ON public.gateway_config FROM anon, authenticated;
GRANT ALL ON public.gateway_config TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gateway_config TO authenticated;

-- checkout_events / click_events / page_views: anon insert é necessário p/ tracking
-- mas garantir que anon NUNCA consegue ler dados de outros visitantes
REVOKE SELECT ON public.checkout_events FROM anon;
REVOKE SELECT ON public.click_events FROM anon;
REVOKE SELECT ON public.page_views FROM anon;