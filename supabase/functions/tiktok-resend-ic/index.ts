import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Resolve TikTok token: supports env var name OR literal token stored in DB.
function resolveTikTokToken(envOrLiteral?: string | null): string | undefined {
  const v = (envOrLiteral || 'TIKTOK_ACCESS_TOKEN').trim();
  if (!v) return undefined;
  const fromEnv = Deno.env.get(v);
  if (fromEnv) return fromEnv;
  // Literal token fallback: long hex-like string stored directly in DB
  if (v !== 'TIKTOK_ACCESS_TOKEN' && v.length >= 20 && /^[A-Za-z0-9._-]+$/.test(v)) return v;
  return undefined;
}

const CHECKOUT_URL = 'https://amrlifefacilxc.lovable.app/checkout';

const sha256 = async (str: string) => {
  const data = new TextEncoder().encode(str.trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

async function sendIC(ev: any, pixelId: string, accessToken: string) {
  const meta = ev.metadata || {};
  const eventId = meta.event_id || `ic_${ev.id}`;
  const value = typeof meta.value === 'number' ? meta.value : 67.52;
  const currency = meta.currency || 'BRL';
  const url = meta.url || CHECKOUT_URL;
  const ua = meta.user_agent || 'Mozilla/5.0';
  const ttclid = meta.ttclid || undefined;
  const ttp = meta.ttp || undefined;
  const referrer = meta.referrer || undefined;
  const ip = meta.ip || undefined;
  const countryHash = await sha256('br');

  const payload = {
    event_source: 'web',
    event_source_id: pixelId,
    data: [{
      event: 'InitiateCheckout',
      event_time: Math.floor(new Date(ev.created_at).getTime() / 1000),
      event_id: eventId,
      user: {
        ...(ttclid && { ttclid }),
        ...(ttp && { ttp }),
        external_id: await sha256(ev.visitor_id),
        user_agent: ua,
        country: countryHash,
        ...(ip && { ip }),
      },
      properties: {
        contents: [{ content_id: 'armario-homeflex', content_name: 'Armário HomeFlex de Aço Multifuncional', content_type: 'product', quantity: 1, price: value }],
        value,
        currency,
      },
      page: { url, ...(referrer && { referrer }) },
    }],
  };

  const resp = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Access-Token': accessToken },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  console.log(`[TikTokResendIC] event=${ev.id} pixel=${pixelId} status=${resp.status} body=${text}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${text}`);
  const json = JSON.parse(text);
  if (json.code && json.code !== 0) throw new Error(`TikTok error: ${text}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: pixels } = await supabase
      .from('tiktok_pixels')
      .select('pixel_id, access_token_env')
      .eq('is_active', true);

    if (!pixels?.length) {
      return new Response(JSON.stringify({ ok: true, message: 'No active pixels' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Last 3 days, not yet sent
    const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: events, error } = await supabase
      .from('checkout_events')
      .select('id, visitor_id, metadata, created_at')
      .eq('event_type', 'checkout_visit')
      .eq('tiktok_ic_sent', false)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    console.log(`[TikTokResendIC] Found ${events?.length || 0} ICs to resend across ${pixels.length} pixel(s)`);

    const results: any[] = [];
    for (const ev of events || []) {
      let allOk = true;
      for (const px of pixels) {
        const token = resolveTikTokToken(px.access_token_env);
        if (!token) { console.warn(`Missing token ${px.access_token_env}`); allOk = false; continue; }
        try {
          await sendIC(ev, px.pixel_id, token);
        } catch (e) {
          console.error(`Failed pixel ${px.pixel_id} ev ${ev.id}:`, e);
          allOk = false;
        }
      }
      if (allOk) {
        await supabase.from('checkout_events').update({ tiktok_ic_sent: true }).eq('id', ev.id);
        results.push({ id: ev.id, sent: true });
      } else {
        results.push({ id: ev.id, sent: false });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[TikTokResendIC] Error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
