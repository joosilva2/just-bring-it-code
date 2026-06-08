import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function resolveTikTokToken(envOrLiteral?: string | null): string | undefined {
  const v = (envOrLiteral || 'TIKTOK_ACCESS_TOKEN').trim();
  if (!v) return undefined;
  const fromEnv = Deno.env.get(v);
  if (fromEnv) return fromEnv;
  if (v !== 'TIKTOK_ACCESS_TOKEN' && v.length >= 20 && /^[A-Za-z0-9._-]+$/.test(v)) return v;
  return undefined;
}

const APP_BASE_URL = 'https://amrlifefacilxc.lovable.app';

const getTikTokOrderMeta = (order: any) => {
  if (order.product_type === 'envioup') return { contentId: 'envioup', contentName: 'Liberação de Envio Prioritário', pageUrl: `${APP_BASE_URL}/envioup` };
  if (order.product_type === 'nfe') return { contentId: 'nfe', contentName: 'Taxa de Emissão da Nota Fiscal', pageUrl: `${APP_BASE_URL}/nfe` };
  const variantMap: Record<string, string> = { '2pretos': '2 Pretos', '2brancos': '2 Brancos', '1cada': '1 Preto e 1 Branco' };
  const variant = variantMap[order.color || ''];
  return { contentId: 'armario-homeflex', contentName: variant ? `Armário HomeFlex de Aço Multifuncional - ${variant}` : 'Armário HomeFlex de Aço Multifuncional', pageUrl: `${APP_BASE_URL}/pix` };
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
  const phoneHash = rawPhone ? await sha256(`55${rawPhone}`) : undefined;
  const cpfRaw = order.customer_document ? order.customer_document.replace(/\D/g, '') : '';
  const cpfHash = cpfRaw ? await sha256(cpfRaw) : undefined;
  const nameParts = (order.customer_name || '').trim().split(/\s+/);
  const firstNameHash = nameParts[0] ? await sha256(nameParts[0]) : undefined;
  const lastNameHash = nameParts.length > 1 ? await sha256(nameParts[nameParts.length - 1]) : undefined;
  const city = order.shipping_city ? String(order.shipping_city).trim() : undefined;
  const state = order.shipping_state ? String(order.shipping_state).trim().toUpperCase() : undefined;
  const zipCode = order.shipping_zip ? order.shipping_zip.replace(/\D/g, '') : undefined;

  const payload = {
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
        contents: [{ content_id: contentId, content_name: contentName, content_type: 'product', quantity: order.quantity || 1, price: (order.amount || 0) / 100 }],
        value: (order.amount || 0) / 100,
        currency: 'BRL',
      },
      page: { url: pageUrl },
    }],
  };

  const resp = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Access-Token': accessToken },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  console.log(`[Resend→TikTok] ${order.external_ref} pixel=${pixelId} [${resp.status}]:`, text);
  return resp.ok;
}

async function sendToUtmify(token: string, order: any) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const amount = order.amount || 8760;
  const payload = {
    orderId: order.external_ref,
    platform: 'MesaMaleta',
    paymentMethod: 'pix',
    status: 'paid',
    createdAt: order.created_at ? new Date(order.created_at).toISOString().replace('T', ' ').slice(0, 19) : now,
    approvedDate: order.paid_at ? new Date(order.paid_at).toISOString().replace('T', ' ').slice(0, 19) : now,
    refundedAt: null,
    customer: {
      name: order.customer_name || '',
      email: order.customer_email || '',
      phone: order.customer_phone || null,
      document: order.customer_document || null,
    },
    products: [{ id: 'mesa-dobravel-maleta', name: 'Mesa Dobrável Tipo Maleta 180x60cm', planId: null, planName: null, quantity: order.quantity || 1, priceInCents: amount }],
    trackingParameters: {
      src: order.utm_source || null, sck: null,
      utm_source: order.utm_source || null,
      utm_campaign: order.utm_campaign || null,
      utm_medium: order.utm_medium || null,
      utm_content: order.utm_content || null,
      utm_term: order.utm_term || null,
    },
    commission: {
      totalPriceInCents: amount,
      gatewayFeeInCents: Math.round(amount * 0.06) + 197,
      userCommissionInCents: amount - (Math.round(amount * 0.06) + 197),
      currency: 'BRL',
    },
  };
  const r = await fetch('https://api.utmify.com.br/api-credentials/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-token': token },
    body: JSON.stringify(payload),
  });
  console.log(`[Resend→UTMify] ${order.external_ref} [${r.status}]:`, await r.text());
  return r.ok;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const hours = Number(url.searchParams.get('hours') || '24');
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { data: orders } = await supabaseAdmin
      .from('orders').select('*')
      .eq('status', 'paid')
      .gte('paid_at', since)
      .order('paid_at', { ascending: false });

    const { data: pixels } = await supabaseAdmin
      .from('tiktok_pixels').select('pixel_id, access_token_env')
      .eq('is_active', true).eq('track_paid', true);

    const UTMIFY_TOKEN = Deno.env.get('UTMIFY_TOKEN');
    let tiktokSent = 0, utmifySent = 0;

    for (const order of orders || []) {
      if (pixels?.length) {
        let allOk = true;
        for (const p of pixels) {
          const token = resolveTikTokToken(p.access_token_env);
          if (!token) { allOk = false; continue; }
          try { const ok = await sendTikTokEvent(order, p.pixel_id, token); if (!ok) allOk = false; }
          catch (e) { console.error(e); allOk = false; }
        }
        if (allOk) { await supabaseAdmin.from('orders').update({ tiktok_paid_sent: true }).eq('id', order.id); tiktokSent++; }
      }
      if (UTMIFY_TOKEN) {
        try {
          const ok = await sendToUtmify(UTMIFY_TOKEN, order);
          if (ok) { await supabaseAdmin.from('orders').update({ utmify_paid_sent: true }).eq('id', order.id); utmifySent++; }
        } catch (e) { console.error(e); }
      }
    }

    return new Response(JSON.stringify({ total: orders?.length || 0, tiktokSent, utmifySent, pixels: pixels?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
