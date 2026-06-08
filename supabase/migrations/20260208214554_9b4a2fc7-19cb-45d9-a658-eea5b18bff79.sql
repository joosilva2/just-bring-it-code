-- Remove as políticas públicas de SELECT das tabelas de analytics
-- Estas tabelas só devem ser lidas por usuários autenticados com permissão

-- Primeiro, remover as políticas existentes
DROP POLICY IF EXISTS "Allow public insert for page_views" ON public.page_views;
DROP POLICY IF EXISTS "Allow public insert for click_events" ON public.click_events;
DROP POLICY IF EXISTS "Allow public read for page_views" ON public.page_views;
DROP POLICY IF EXISTS "Allow public read for click_events" ON public.click_events;

-- Recriar apenas a política de INSERT público (necessária para tracking anônimo)
CREATE POLICY "Allow anonymous insert for page_views" 
ON public.page_views 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow anonymous insert for click_events" 
ON public.click_events 
FOR INSERT 
WITH CHECK (true);

-- SELECT fica bloqueado para usuários anônimos (somente admin/service role pode ler)