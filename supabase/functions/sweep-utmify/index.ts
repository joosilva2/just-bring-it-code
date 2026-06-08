import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function sendToUtmify(token: string, order: any) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const utmifyPayload = {
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
    products: [{
      id: 'mesa-dobravel-maleta',
      name: 'Mesa Dobrável Tipo Maleta 180x60cm',
      planId: null, planName: null,
      quantity: order.quantity || 1,
      priceInCents: order.amount,
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
      totalPriceInCents: order.amount,
      gatewayFeeInCents: Math.round(order.amount * 0.06) + 197,
      userCommissionInCents: order.amount - (Math.round(order.amount * 0.06) + 197),
      currency: 'BRL',
    },
  };

  console.log(`[Sweep→UTMify] Sending paid for ${order.external_ref}:`, JSON.stringify(utmifyPayload));
  const response = await fetch('https://api.utmify.com.br/api-credentials/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-token': token },
    body: JSON.stringify(utmifyPayload),
  });
  const responseText = await response.text();
  console.log(`[Sweep→UTMify] Response [${response.status}]:`, responseText);
  if (!response.ok) {
    throw new Error(`UTMify API error [${response.status}]: ${responseText}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let body: any = {};
    if (req.method === 'POST') {
      try { body = await req.json(); } catch {}
    }
    const forceRefs: string[] = Array.isArray(body?.external_refs) ? body.external_refs : [];

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const UTMIFY_TOKEN = Deno.env.get('UTMIFY_TOKEN');

    if (!UTMIFY_TOKEN) {
      return new Response(JSON.stringify({ error: 'UTMIFY_TOKEN not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find all paid orders that haven't been sent to UTMify (or specific refs if forced)
    let query = supabaseAdmin.from('orders').select('*').eq('status', 'paid');
    if (forceRefs.length > 0) {
      query = query.in('external_ref', forceRefs);
    } else {
      query = query.eq('utmify_paid_sent', false).order('created_at', { ascending: true }).limit(50);
    }
    const { data: pendingOrders, error } = await query;

    if (error) throw error;

    if (!pendingOrders?.length) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'No pending UTMify notifications' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Sweep] Found ${pendingOrders.length} paid orders not sent to UTMify`);

    let sentCount = 0;
    const errors: string[] = [];

    for (const order of pendingOrders) {
      try {
        await sendToUtmify(UTMIFY_TOKEN, order);

        // Mark as sent
        await supabaseAdmin
          .from('orders')
          .update({ utmify_paid_sent: true })
          .eq('id', order.id);

        sentCount++;
        console.log(`[Sweep] ✓ Sent ${order.external_ref}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        console.error(`[Sweep] ✗ Failed ${order.external_ref}:`, msg);
        errors.push(`${order.external_ref}: ${msg}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      found: pendingOrders.length,
      sent: sentCount,
      failed: errors.length,
      errors: errors.length ? errors : undefined,
    }), {
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
