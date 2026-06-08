import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

// Send paid event to UTMify
async function sendToUtmify(token: string, order: any) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const amount = order.amount || 8760;
  const utmifyPayload = {
    orderId: order.external_ref,
    platform: 'MesaMaleta',
    paymentMethod: 'pix',
    status: 'paid',
    createdAt: order.created_at ? new Date(order.created_at).toISOString().replace('T', ' ').slice(0, 19) : now,
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
      planId: null, planName: null, quantity: order.quantity || 1, priceInCents: amount,
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

  console.log(`[Sweep→UTMify] Sending paid event for ${order.external_ref}`);
  const response = await fetch('https://api.utmify.com.br/api-credentials/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-token': token },
    body: JSON.stringify(utmifyPayload),
  });
  const responseText = await response.text();
  console.log(`[Sweep→UTMify] Response [${response.status}]:`, responseText);
}

// Send TikTok S2S CompletePayment
async function sendTikTokEvent(order: any, pixelId: string, accessToken: string) {
  const { contentId, contentName, pageUrl } = getTikTokOrderMeta(order);
  const sha256 = async (str: string) => {
    const data = new TextEncoder().encode(str.trim().toLowerCase());
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

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
        contents: [{ content_id: contentId, content_name: contentName, content_type: 'product', quantity: order.quantity || 1, price: (order.amount || 0) / 100 }],
        value: (order.amount || 0) / 100,
        currency: 'BRL',
      },
      page: { url: pageUrl },
    }],
  };

  console.log(`[Sweep→TikTok] Pixel: ${pixelId} | Order: ${order.external_ref}`);
  const resp = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Access-Token': accessToken },
    body: JSON.stringify(eventPayload),
  });
  console.log(`[Sweep→TikTok] Response [${resp.status}]:`, await resp.text());
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    async function recoverPendingTracking() {
      const sinceRecovery = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: paidWithoutTikTok } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('status', 'paid')
        .eq('gateway', 'duttyfy')
        .eq('tiktok_paid_sent', false)
        .gte('created_at', sinceRecovery)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!paidWithoutTikTok?.length || !pixels?.length) return 0;

      let recovered = 0;
      for (const order of paidWithoutTikTok) {
        let allOk = true;
        for (const pixel of pixels) {
          const token = resolveTikTokToken(pixel.access_token_env);
          if (!token) {
            allOk = false;
            continue;
          }
          try {
            await sendTikTokEvent(order, pixel.pixel_id, token);
          } catch (e) {
            console.error(`[Sweep recovery→TikTok] Error for ${order.external_ref}:`, e);
            allOk = false;
          }
        }
        if (allOk) {
          await supabaseAdmin.from('orders').update({ tiktok_paid_sent: true }).eq('id', order.id);
          recovered++;
        }
      }

      return recovered;
    }

    // Get Duttyfy API URL
    const { data: config } = await supabaseAdmin
      .from('gateway_config')
      .select('duttyfy_api_url')
      .eq('id', 'active')
      .maybeSingle();

    if (!config?.duttyfy_api_url) {
      return new Response(JSON.stringify({ error: 'Duttyfy URL not configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all pending Duttyfy orders from last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: pendingOrders } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('gateway', 'duttyfy')
      .eq('status', 'pending')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (!pendingOrders?.length) {
      console.log('[Sweep] No pending Duttyfy orders found');
      return new Response(JSON.stringify({ swept: 0, paid: 0, checked: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Sweep] Found ${pendingOrders.length} pending Duttyfy orders to check`);

    const UTMIFY_TOKEN = Deno.env.get('UTMIFY_TOKEN');
    let paidCount = 0;

    // Get TikTok pixels once
    const { data: pixels } = await supabaseAdmin
      .from('tiktok_pixels')
      .select('pixel_id, access_token_env')
      .eq('is_active', true)
      .eq('track_paid', true);

    for (const order of pendingOrders) {
      if (!order.gateway_transaction_id) continue;

      try {
        const checkUrl = `${config.duttyfy_api_url}?transactionId=${order.gateway_transaction_id}`;
        const resp = await fetch(checkUrl, { method: 'GET' });
        const data = await resp.json();
        const status = String(data?.status || '').trim().toUpperCase();

        console.log(`[Sweep] ${order.external_ref} → ${status}`);

        if (['COMPLETED', 'PAID', 'APPROVED', 'CONFIRMED', 'RECEIVED'].includes(status)) {
          const paidAt = new Date().toISOString();
          const paidOrder = { ...order, status: 'paid', paid_at: paidAt };

          // Mark as paid
          await supabaseAdmin
            .from('orders')
            .update({ status: 'paid', paid_at: paidAt })
            .eq('id', order.id)
            .neq('status', 'paid');

          paidCount++;

          // UTMify
          if (UTMIFY_TOKEN && !order.utmify_paid_sent) {
            try {
              await sendToUtmify(UTMIFY_TOKEN, paidOrder);
              await supabaseAdmin.from('orders').update({ utmify_paid_sent: true }).eq('id', order.id);
            } catch (e) {
              console.error(`[Sweep→UTMify] Error for ${order.external_ref}:`, e);
            }
          }

          // TikTok
          if (pixels?.length) {
            let allOk = true;
            for (const pixel of pixels) {
              const token = resolveTikTokToken(pixel.access_token_env);
              if (!token) { allOk = false; continue; }
              try {
                await sendTikTokEvent(paidOrder, pixel.pixel_id, token);
              } catch (e) {
                console.error(`[Sweep→TikTok] Error for ${order.external_ref}:`, e);
                allOk = false;
              }
            }
            if (allOk) {
              await supabaseAdmin.from('orders').update({ tiktok_paid_sent: true }).eq('id', order.id);
            }
          }

          console.log(`[Sweep] ✅ ${order.external_ref} marked as PAID`);
        }

        // Small delay between API calls to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        console.error(`[Sweep] Error checking ${order.external_ref}:`, e);
      }
    }

    const recoveredTikTok = await recoverPendingTracking();

    console.log(`[Sweep] Done: ${paidCount}/${pendingOrders.length} marked as paid | recoveredTikTok=${recoveredTikTok}`);

    return new Response(JSON.stringify({ swept: pendingOrders.length, paid: paidCount, checked: pendingOrders.length, recoveredTikTok }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[Sweep] Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
