import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED = ['paradise', 'duttyfy', 'buckpay'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (req.method === 'GET') {
      const { data } = await supabase.from('gateway_config').select('active_gateway').eq('id', 'active').maybeSingle();
      return new Response(JSON.stringify({ active: data?.active_gateway || null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const gateway = String(body?.gateway || '').toLowerCase();

    if (!ALLOWED.includes(gateway)) {
      return new Response(JSON.stringify({ error: 'Gateway inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error } = await supabase
      .from('gateway_config')
      .update({ active_gateway: gateway, updated_at: new Date().toISOString() })
      .eq('id', 'active');

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, active: gateway }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
