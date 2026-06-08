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

const APP_BASE_URL = 'https://amrlifefacilxc.lovable.app';

const getTikTokOrderMeta = (order: any) => {
  if (order.product_type === 'envioup') {
    return { contentId: 'envioup', contentName: 'Liberação de Envio Prioritário', pageUrl: `${APP_BASE_URL}/envioup` };
  }
  if (order.product_type === 'nfe') {
    return { contentId: 'nfe', contentName: 'Taxa de Emissão da Nota Fiscal', pageUrl: `${APP_BASE_URL}/nfe` };
  }

  const variantMap: Record<string, string> = {
    '2pretos': '2 Pretos',
    '2brancos': '2 Brancos',
    '1cada': '1 Preto e 1 Branco',
  };
  const variant = variantMap[order.color || ''];
  return {
    contentId: 'armario-homeflex',
    contentName: variant ? `Armário HomeFlex de Aço Multifuncional - ${variant}` : 'Armário HomeFlex de Aço Multifuncional',
    pageUrl: `${APP_BASE_URL}/pix`,
  };
};

const sha256 = async (str: string) => {
  const data = new TextEncoder().encode(str.trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

async function sendTikTokEvent(order: any, pixelId: string, accessToken: string) {
  const { contentId, contentName, pageUrl } = getTikTokOrderMeta(order);
  const emailHash = order.customer_email ? await sha256(order.customer_email) : undefined;
  const rawPhone = order.customer_phone ? order.customer_phone.replace(/\D/g, '') : '';
  const phoneE164 = rawPhone ? `55${rawPhone}` : '';
  const phoneHash = phoneE164 ? await sha256(phoneE164) : undefined;
  const cpfRaw = order.customer_document ? order.customer_document.replace(/\D/g, '') : '';
  const cpfHash = cpfRaw ? await sha256(cpfRaw) : undefined;

  const nameParts = (order.customer_name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  const firstNameHash = firstName ? await sha256(firstName) : undefined;
  const lastNameHash = lastName ? await sha256(lastName) : undefined;
  const city = order.shipping_city ? String(order.shipping_city).trim() : undefined;
  const state = order.shipping_state ? String(order.shipping_state).trim().toUpperCase() : undefined;
  const zipCode = order.shipping_zip ? order.shipping_zip.replace(/\D/g, '') : undefined;

  const eventPayload = {
    event_source: 'web',
    event_source_id: pixelId,
    data: [{
      event: 'CompletePayment',
      event_time: Math.floor((order.paid_at ? new Date(order.paid_at).getTime() : Date.now()) / 1000),
      event_id: `purchase_${order.external_ref}`,
      user: {
        ...(emailHash && { email: emailHash }),
        ...(phoneHash && { phone: phoneHash }),
        ...(cpfHash && { external_id: cpfHash }),
        ...(firstNameHash && { first_name: firstNameHash }),
        ...(lastNameHash && { last_name: lastNameHash }),
        ...(city && { city }),
        ...(state && { state }),
        ...(zipCode && { zip_code: zipCode }),
        country: 'BR',
        ...(order.customer_ip && { ip: order.customer_ip }),
        ...(order.customer_user_agent && { user_agent: order.customer_user_agent }),
        ...(order.tiktok_ttp && { ttp: order.tiktok_ttp }),
        ...(order.ttclid && { ttclid: order.ttclid }),
      },
      properties: {
        contents: [{
          content_id: contentId,
          content_name: contentName,
          content_type: 'product',
          quantity: order.quantity || 1,
          price: (order.amount || 0) / 100,
        }],
        value: (order.amount || 0) / 100,
        currency: 'BRL',
      },
      page: { url: pageUrl },
    }],
  };

  const resp = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Access-Token': accessToken },
    body: JSON.stringify(eventPayload),
  });
  const respText = await resp.text();
  console.log(`[TikTokResend] order=${order.external_ref} pixel=${pixelId} status=${resp.status} body=${respText}`);
  if (!resp.ok) throw new Error(`TikTok API error [${resp.status}]: ${respText}`);
  const json = JSON.parse(respText);
  if (json.code && json.code !== 0) throw new Error(`TikTok logical error: ${respText}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    let body: any = {};
    if (req.method === 'POST') {
      try { body = await req.json(); } catch {}
    }
    const forceRefs: string[] = Array.isArray(body.external_refs) ? body.external_refs : [];

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get active pixels with track_paid enabled
    const { data: pixels } = await supabase
      .from('tiktok_pixels')
      .select('pixel_id, access_token_env')
      .eq('is_active', true)
      .eq('track_paid', true);

    if (!pixels || pixels.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: 'No active pixels' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get paid orders not yet sent to TikTok (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let query = supabase.from('orders').select('*').eq('status', 'paid');
    if (forceRefs.length > 0) {
      query = query.in('external_ref', forceRefs);
    } else {
      query = query.eq('tiktok_paid_sent', false).gte('paid_at', sevenDaysAgo).limit(50);
    }
    const { data: orders, error } = await query;

    if (error) throw error;

    console.log(`[TikTokResend] Found ${orders?.length || 0} paid orders to resend across ${pixels.length} pixel(s)`);

    const results: any[] = [];
    for (const order of orders || []) {
      let allOk = true;
      for (const px of pixels) {
        const token = resolveTikTokToken(px.access_token_env);
        if (!token) {
          console.warn(`[TikTokResend] Missing token env ${px.access_token_env}`);
          allOk = false;
          continue;
        }
        try {
          await sendTikTokEvent(order, px.pixel_id, token);
        } catch (e) {
          console.error(`[TikTokResend] Failed pixel ${px.pixel_id} order ${order.external_ref}:`, e);
          allOk = false;
        }
      }
      if (allOk) {
        await supabase.from('orders').update({ tiktok_paid_sent: true }).eq('id', order.id);
        results.push({ order: order.external_ref, sent: true });
      } else {
        results.push({ order: order.external_ref, sent: false });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[TikTokResend] Error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
