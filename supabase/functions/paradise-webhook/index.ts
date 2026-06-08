import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-event, x-webhook-source',
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

// ---------- helpers ----------
const sha256 = async (str: string) => {
  const data = new TextEncoder().encode(str.trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const PAID_STATUSES = ['approved', 'paid', 'completed', 'confirmed'];
const REFUNDED_STATUSES = ['refunded', 'chargeback'];
const FAILED_STATUSES = ['failed', 'cancelled', 'canceled', 'expired'];

function normalizeStatus(raw: string): 'paid' | 'pending' | 'refunded' | 'failed' {
  const s = String(raw || '').trim().toLowerCase();
  if (PAID_STATUSES.includes(s)) return 'paid';
  if (REFUNDED_STATUSES.includes(s)) return 'refunded';
  if (FAILED_STATUSES.includes(s)) return 'failed';
  return 'pending';
}

// Re-query Paradise to validate that status is real (anti-spoofing)
async function validateWithParadise(apiKey: string, transactionId: string | number): Promise<string | null> {
  try {
    const url = `https://multi.paradisepags.com/api/v1/query.php?action=get_transaction&id=${transactionId}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey },
    });
    if (!resp.ok) {
      console.error(`[Paradise Validate] HTTP ${resp.status}`);
      return null;
    }
    const data = await resp.json();
    console.log('[Paradise Validate] response:', JSON.stringify(data));
    return String(data?.status || '').trim().toLowerCase();
  } catch (e) {
    console.error('[Paradise Validate] error:', e);
    return null;
  }
}

async function sendToUtmify(token: string, order: any) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const amount = order.amount || 7790;

  const payload = {
    orderId: order.external_ref,
    platform: 'MesaMaleta',
    paymentMethod: 'pix',
    status: 'paid',
    createdAt: order.created_at
      ? new Date(order.created_at).toISOString().replace('T', ' ').slice(0, 19)
      : now,
    approvedDate: now,
    refundedAt: null,
    customer: {
      name: order.customer_name || '',
      email: order.customer_email || '',
      phone: order.customer_phone || null,
      document: order.customer_document || null,
    },
    products: [{
      id: 'mesa-dobravel-maleta',
      name: 'Mesa Dobrável Tipo Maleta 180x60cm',
      planId: null,
      planName: null,
      quantity: order.quantity || 1,
      priceInCents: amount,
    }],
    trackingParameters: {
      src: order.utm_source || null,
      sck: null,
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

  const resp = await fetch('https://api.utmify.com.br/api-credentials/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-token': token },
    body: JSON.stringify(payload),
  });
  const txt = await resp.text();
  console.log(`[Paradise→UTMify] [${resp.status}]:`, txt);
  if (!resp.ok) throw new Error(`UTMify error [${resp.status}]: ${txt}`);
}

async function sendTikTokPurchase(order: any, pixelId: string, accessToken: string) {
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
    body: JSON.stringify(payload),
  });
  const txt = await resp.text();
  console.log(`[Paradise→TikTok] order=${order.external_ref} pixel=${pixelId} [${resp.status}]:`, txt);
  if (!resp.ok) throw new Error(`TikTok API [${resp.status}]: ${txt}`);
  const json = JSON.parse(txt);
  if (json.code && json.code !== 0) throw new Error(`TikTok logical error: ${txt}`);
}

// ---------- main ----------
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json();
    console.log('[Paradise Webhook] received:', JSON.stringify(body));

    // Extract identifiers from Paradise payload
    const txId = body.transaction_id || body.id;
    const externalRef = body.external_id || body.reference;
    const rawStatus = body.status || body.raw_status || '';

    if (!txId && !externalRef) {
      return new Response(JSON.stringify({ success: false, error: 'missing identifiers' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Validation: re-query Paradise to confirm status (anti-spoof) ----
    const { data: gatewayConfig } = await supabaseAdmin
      .from('gateway_config').select('paradise_api_key').eq('id', 'active').maybeSingle();

    const paradiseKey = gatewayConfig?.paradise_api_key || Deno.env.get('PARADISE_API_KEY');
    if (!paradiseKey) {
      console.error('[Paradise Webhook] PARADISE key not configured — cannot validate');
      return new Response(JSON.stringify({ success: false, error: 'not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let confirmedStatus = rawStatus;
    if (txId) {
      const validated = await validateWithParadise(paradiseKey, txId);
      if (validated === null) {
        console.warn('[Paradise Webhook] could not validate — rejecting');
        return new Response(JSON.stringify({ success: false, error: 'validation failed' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      confirmedStatus = validated;
    }

    const normalized = normalizeStatus(confirmedStatus);
    console.log(`[Paradise Webhook] tx=${txId} ref=${externalRef} raw=${rawStatus} confirmed=${confirmedStatus} → ${normalized}`);

    // Find order
    let order: any = null;
    if (externalRef) {
      const { data } = await supabaseAdmin
        .from('orders').select('*').eq('external_ref', externalRef).maybeSingle();
      order = data;
    }
    if (!order && txId) {
      const { data } = await supabaseAdmin
        .from('orders').select('*').eq('gateway_transaction_id', String(txId)).maybeSingle();
      order = data;
    }

    if (!order) {
      console.warn('[Paradise Webhook] order not found:', externalRef, txId);
      return new Response(JSON.stringify({ success: true, ignored: 'order not found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Idempotency: skip if already in target status (except paid → re-fire UTMify if not yet sent)
    if (order.status === normalized && normalized !== 'paid') {
      return new Response(JSON.stringify({ success: true, duplicate: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update order
    if (order.status !== normalized) {
      const updates: Record<string, any> = { status: normalized };
      if (normalized === 'paid') updates.paid_at = new Date().toISOString();
      await supabaseAdmin.from('orders').update(updates).eq('id', order.id);
      console.log(`[Paradise Webhook] order ${order.external_ref} → ${normalized}`);
    }

    // Side-effects only on paid
    if (normalized === 'paid') {
      // UTMify
      const UTMIFY_TOKEN = Deno.env.get('UTMIFY_TOKEN');
      if (UTMIFY_TOKEN && !order.utmify_paid_sent) {
        try {
          await sendToUtmify(UTMIFY_TOKEN, { ...order, status: 'paid' });
          await supabaseAdmin.from('orders').update({ utmify_paid_sent: true }).eq('id', order.id);
        } catch (e) {
          console.error('[Paradise→UTMify] error:', e);
        }
      }

      // TikTok S2S Purchase
      if (!order.tiktok_paid_sent) {
        const { data: pixels } = await supabaseAdmin
          .from('tiktok_pixels').select('pixel_id, access_token_env')
          .eq('is_active', true).eq('track_paid', true);

        if (pixels?.length) {
          let allOk = true;
          for (const pixel of pixels) {
            const token = resolveTikTokToken(pixel.access_token_env);
            if (!token) { allOk = false; continue; }
            try {
              await sendTikTokPurchase(order, pixel.pixel_id, token);
            } catch (e) {
              console.error('[Paradise→TikTok] error:', e);
              allOk = false;
            }
          }
          if (allOk) {
            await supabaseAdmin.from('orders').update({ tiktok_paid_sent: true }).eq('id', order.id);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, status: normalized }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Paradise Webhook] fatal:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
