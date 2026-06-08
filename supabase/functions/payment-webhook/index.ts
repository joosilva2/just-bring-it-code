import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-event, x-webhook-source, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

const APP_BASE_URL = "https://amrlifefacilxc.lovable.app";

const getTikTokOrderMeta = (order: any) => {
  if (order.product_type === "envioup") {
    return { contentId: "envioup", contentName: "Liberação de Envio Prioritário", pageUrl: `${APP_BASE_URL}/envioup` };
  }
  if (order.product_type === "nfe") {
    return { contentId: "nfe", contentName: "Taxa de Emissão da Nota Fiscal", pageUrl: `${APP_BASE_URL}/nfe` };
  }

  const variantMap: Record<string, string> = {
    "2pretos": "2 Pretos",
    "2brancos": "2 Brancos",
    "1cada": "1 Preto e 1 Branco",
  };
  const variant = variantMap[order.color || ""];
  return {
    contentId: "armario-homeflex",
    contentName: variant ? `Armário HomeFlex de Aço Multifuncional - ${variant}` : "Armário HomeFlex de Aço Multifuncional",
    pageUrl: `${APP_BASE_URL}/pix`,
  };
};

// Send Purchase event to TikTok Events API (S2S)
async function sendTikTokEvent(
  order: any,
  pixelId: string,
  accessToken: string,
) {
  const { contentId, contentName, pageUrl } = getTikTokOrderMeta(order);
  const sha256 = async (str: string) => {
    const data = new TextEncoder().encode(str.trim().toLowerCase());
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const emailHash = order.customer_email
    ? await sha256(order.customer_email)
    : undefined;
  const rawPhone = order.customer_phone
    ? order.customer_phone.replace(/\D/g, "")
    : "";
  const phoneE164 = rawPhone ? `55${rawPhone}` : "";
  const phoneHash = phoneE164 ? await sha256(phoneE164) : undefined;
  const cpfRaw = order.customer_document
    ? order.customer_document.replace(/\D/g, "")
    : "";
  const cpfHash = cpfRaw ? await sha256(cpfRaw) : undefined;
  const nameParts = (order.customer_name || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const firstNameHash = firstName ? await sha256(firstName) : undefined;
  const lastNameHash = lastName ? await sha256(lastName) : undefined;
  const city = order.shipping_city ? String(order.shipping_city).trim() : undefined;
  const state = order.shipping_state ? String(order.shipping_state).trim().toUpperCase() : undefined;
  const zipCode = order.shipping_zip ? order.shipping_zip.replace(/\D/g, "") : undefined;

  const eventPayload = {
    event_source: "web",
    event_source_id: pixelId,
    data: [
      {
        event: "CompletePayment",
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
          country: "BR",
          ...(order.customer_ip && { ip: order.customer_ip }),
          ...(order.customer_user_agent && { user_agent: order.customer_user_agent }),
          ...(order.tiktok_ttp && { ttp: order.tiktok_ttp }),
          ...(order.ttclid && { ttclid: order.ttclid }),
        },
        properties: {
          contents: [
            {
              content_id: contentId,
              content_name: contentName,
              content_type: "product",
              quantity: order.quantity || 1,
              price: (order.amount || 0) / 100,
            },
          ],
          value: (order.amount || 0) / 100,
          currency: "BRL",
        },
        page: { url: pageUrl },
      },
    ],
  };

  console.log("Sending TikTok S2S event:", JSON.stringify(eventPayload));
  const resp = await fetch(
    `https://business-api.tiktok.com/open_api/v1.3/event/track/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": accessToken,
      },
      body: JSON.stringify(eventPayload),
    },
  );
  const respText = await resp.text();
  console.log(`TikTok S2S response [${resp.status}]:`, respText);
  if (!resp.ok)
    throw new Error(`TikTok API error [${resp.status}]: ${respText}`);

  const json = JSON.parse(respText);
  if (json.code && json.code !== 0) {
    throw new Error(`TikTok logical error: ${respText}`);
  }
}

async function sendToUtmify(token: string, data: any) {
  const statusMap: Record<string, string> = {
    pending: "waiting_payment",
    waiting_payment: "waiting_payment",
    paid: "paid",
    approved: "paid",
    completed: "paid",
    cancelled: "refused",
    failed: "refused",
    refused: "refused",
    refunded: "refunded",
  };

  const normalizedStatus = String(data.status || "")
    .trim()
    .toLowerCase();
  const utmifyStatus = statusMap[normalizedStatus] || "waiting_payment";
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  const utmifyPayload = {
    orderId:
      data.externalRef ||
      data.externalReference ||
      data.external_id ||
      data.transactionId ||
      data.transaction_id ||
      `ORDER-${Date.now()}`,
    platform: "MesaMaleta",
    paymentMethod: "pix",
    status: utmifyStatus,
    createdAt: data.timestamp
      ? new Date(data.timestamp).toISOString().replace("T", " ").slice(0, 19)
      : now,
    approvedDate: utmifyStatus === "paid" ? now : null,
    refundedAt: null,
    customer: {
      name: data.customer?.name || "",
      email: data.customer?.email || "",
      phone: data.customer?.phone || data.customerPhone || null,
      document: data.customer?.document || data.customerDocument || null,
    },
    products: [
      {
        id: "mesa-dobravel-maleta",
        name: `Mesa Dobrável Tipo Maleta 180x60cm`,
        planId: null,
        planName: null,
        quantity: 1,
        priceInCents: data.amount || 7790,
      },
    ],
    trackingParameters: {
      src: data.tracking?.src || data.utm?.utm_source || null,
      sck: data.tracking?.sck || null,
      utm_source: data.tracking?.utm_source || data.utm?.utm_source || null,
      utm_campaign:
        data.tracking?.utm_campaign || data.utm?.utm_campaign || null,
      utm_medium: data.tracking?.utm_medium || data.utm?.utm_medium || null,
      utm_content: data.tracking?.utm_content || data.utm?.utm_content || null,
      utm_term: data.tracking?.utm_term || data.utm?.utm_term || null,
    },
    commission: {
      totalPriceInCents: data.amount || 7790,
      gatewayFeeInCents: Math.round((data.amount || 7790) * 0.06) + 197,
      userCommissionInCents:
        (data.amount || 7790) -
        (Math.round((data.amount || 7790) * 0.06) + 197),
      currency: "BRL",
    },
  };

  console.log("Sending to UTMify:", JSON.stringify(utmifyPayload));
  const response = await fetch(
    "https://api.utmify.com.br/api-credentials/orders",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-token": token },
      body: JSON.stringify(utmifyPayload),
    },
  );
  const responseText = await response.text();
  console.log(`UTMify response [${response.status}]:`, responseText);
  if (!response.ok)
    throw new Error(`UTMify API error [${response.status}]: ${responseText}`);
  return responseText;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const UTMIFY_TOKEN = Deno.env.get("UTMIFY_TOKEN");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log(`Received webhook:`, JSON.stringify(body));

    // Determine status - handle BlackCat, Paradise, Duttyfy, BuckPay, and IronPay formats
    // BuckPay sends: { event: "transaction.processed", data: { status: "paid", ... } }
    // IronPay sends: { transaction_hash, status, amount, payment_method, paid_at }
    const nestedData = body?.data && typeof body.data === 'object' ? body.data : null;
    const isBuckPayWebhook =
      body.event &&
      body.data &&
      (body.event === "transaction.created" ||
        body.event === "transaction.processed");
    const webhookBody = isBuckPayWebhook ? body.data : (nestedData || body);

    const rawStatus =
      webhookBody.status ||
      webhookBody.payment_status ||
      webhookBody.transaction_status ||
      body.status ||
      body.payment_status ||
      body.transaction_status ||
      "";
    let normalizedStatus = "pending";
    if (
      ["PAID", "approved", "COMPLETED", "paid", "APPROVED", "CONFIRMED", "confirmed", "RECEIVED", "received"].includes(rawStatus) ||
      webhookBody.raw_status === "COMPLETED" ||
      body.raw_status === 'COMPLETED' ||
      body.event === "transaction.processed" ||
      body.event === 'payment.approved' ||
      body.event === 'pix.paid'
    ) {
      normalizedStatus = "paid";
    } else if (
      ["CANCELLED", "failed", "FAILED", "cancelled"].includes(rawStatus)
    ) {
      normalizedStatus = "cancelled";
    } else if (["REFUNDED", "refunded"].includes(rawStatus)) {
      normalizedStatus = "refunded";
    }

    // Find transaction ID - handle all gateway formats
    // Duttyfy: transactionId may be missing in COMPLETED; use _id.$oid as fallback
    // BuckPay: data.id is the transaction ID
    // IronPay: transaction_hash is the transaction ID
    const txId =
      webhookBody.transactionId ||
      webhookBody.transaction_id ||
      webhookBody.gateway_transaction_id ||
      webhookBody.transaction_hash ||
      webhookBody.id ||
      webhookBody._id?.$oid ||
      body.transactionId ||
      body.transaction_id ||
      body.gateway_transaction_id ||
      body._id?.$oid;
    const extRef =
      webhookBody.externalRef ||
      webhookBody.externalReference ||
      webhookBody.external_reference ||
      webhookBody.external_id ||
      webhookBody.reference ||
      webhookBody.ref ||
      body.externalRef ||
      body.external_id ||
      body.external_reference ||
      body.reference ||
      body.ref;

    // BuckPay: extract buyer info for UTMify forwarding
    if (isBuckPayWebhook && webhookBody.buyer) {
      webhookBody.customer = webhookBody.buyer;
    }
    if (isBuckPayWebhook && webhookBody.tracking) {
      const bpTracking = webhookBody.tracking;
      webhookBody.tracking = {
        utm_source: bpTracking.utm?.source || null,
        utm_medium: bpTracking.utm?.medium || null,
        utm_campaign: bpTracking.utm?.campaign || null,
        utm_content: bpTracking.utm?.content || null,
        utm_term: bpTracking.utm?.term || null,
        src: bpTracking.src || null,
        sck: bpTracking.sck || null,
      };
    }

    if (txId || extRef) {
      // Deduplication: check if order is already in the target status
      let existingOrder = null;
      if (extRef) {
        const { data } = await supabaseAdmin
          .from("orders")
          .select("id, status, paid_at")
          .eq("external_ref", extRef)
          .limit(1)
          .maybeSingle();
        existingOrder = data;
      }
      if (!existingOrder && txId) {
        const { data } = await supabaseAdmin
          .from("orders")
          .select("id, status, paid_at")
          .eq("gateway_transaction_id", String(txId))
          .limit(1)
          .maybeSingle();
        existingOrder = data;
      }

      // Skip duplicate updates, but keep forwarding duplicate PAID to ensure UTMify consistency
      if (existingOrder && existingOrder.status === normalizedStatus) {
        if (normalizedStatus !== "paid") {
          console.log(
            `Duplicate webhook ignored: order ${extRef || txId} already ${normalizedStatus}`,
          );
          return new Response(
            JSON.stringify({ success: true, duplicate: true }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        console.log(
          `Duplicate paid webhook detected for ${extRef || txId} — forwarding to UTMify again`,
        );
      }

      const updateData: Record<string, any> = { status: normalizedStatus };
      if (normalizedStatus === "paid")
        updateData.paid_at = new Date().toISOString();

      // Conditional update: only update if status is NOT already the target
      // This prevents race conditions when two webhooks arrive simultaneously
      let actuallyUpdated = false;

      if (extRef) {
        const { data: rows } = await supabaseAdmin
          .from("orders")
          .update(updateData)
          .eq("external_ref", extRef)
          .neq("status", normalizedStatus)
          .select();
        if (rows?.length) actuallyUpdated = true;
      }

      if (!actuallyUpdated && txId) {
        const { data: rows } = await supabaseAdmin
          .from("orders")
          .update(updateData)
          .eq("gateway_transaction_id", String(txId))
          .neq("status", normalizedStatus)
          .select();
        if (rows?.length) actuallyUpdated = true;
      }

      if (!actuallyUpdated) {
        console.log(
          `No rows updated: order ${extRef || txId} — will still forward to UTMify`,
        );
      }

      console.log(
        `Order updated: txId=${txId}, extRef=${extRef}, status=${normalizedStatus}`,
      );

      // Fire TikTok S2S Purchase when paid
      if (normalizedStatus === "paid") {
        // Fetch the full order to get attribution data
        const { data: orderRows } = await supabaseAdmin
          .from("orders")
          .select("*")
          .or(
            `gateway_transaction_id.eq.${String(txId)}${extRef ? `,external_ref.eq.${extRef}` : ""}`,
          )
          .limit(1);

        const order = orderRows?.[0];
        if (order) {
          // Fetch active pixels that track paid events (with per-pixel token)
          const { data: pixels } = await supabaseAdmin
            .from("tiktok_pixels")
            .select("pixel_id, access_token_env")
            .eq("is_active", true)
            .eq("track_paid", true);

          if (pixels?.length) {
            let allOk = true;
            for (const pixel of pixels) {
              const token = resolveTikTokToken(pixel.access_token_env);
              if (!token) {
                console.warn(
                  `No token for pixel ${pixel.pixel_id} (env: ${pixel.access_token_env})`,
                );
                allOk = false;
                continue;
              }
              try {
                await sendTikTokEvent(order, pixel.pixel_id, token);
              } catch (e) {
                console.error(
                  `TikTok S2S error for pixel ${pixel.pixel_id}:`,
                  e,
                );
                allOk = false;
              }
            }
            if (allOk && order.id) {
              await supabaseAdmin
                .from("orders")
                .update({ tiktok_paid_sent: true })
                .eq("id", order.id);
            }
          }
        }
      }
    }

    // Forward to UTMify - use stored order amount instead of webhook amount
    // (BlackCat sends wrong amount in paid webhooks)
    let storedOrder = null;
    if (extRef) {
      const { data } = await supabaseAdmin
        .from("orders")
        .select(
          "id, amount, utm_source, utm_campaign, utm_medium, utm_content, utm_term",
        )
        .eq("external_ref", extRef)
        .limit(1)
        .maybeSingle();
      storedOrder = data;
    }
    if (!storedOrder && txId) {
      const { data } = await supabaseAdmin
        .from("orders")
        .select(
          "id, amount, utm_source, utm_campaign, utm_medium, utm_content, utm_term",
        )
        .eq("gateway_transaction_id", String(txId))
        .limit(1)
        .maybeSingle();
      storedOrder = data;
    }

    const webhookData = { ...body };
    webhookData.status = normalizedStatus;

    // Override amount with the correct stored value
    if (storedOrder?.amount) {
      webhookData.amount = storedOrder.amount;
    }
    // For Duttyfy, parse utm string into object if needed
    if (typeof body.utm === "string" && body.utm) {
      const utmObj: Record<string, string> = {};
      body.utm.split("&").forEach((pair: string) => {
        const [k, v] = pair.split("=");
        if (k && v) utmObj[k] = v;
      });
      webhookData.tracking = { ...utmObj };
    }
    // Also inject stored UTM data if webhook doesn't have it
    if (storedOrder) {
      webhookData.tracking = {
        ...(webhookData.tracking || {}),
        src: webhookData.tracking?.src || storedOrder.utm_source || null,
        sck: webhookData.tracking?.sck || null,
        utm_source: webhookData.tracking?.utm_source || storedOrder.utm_source,
        utm_campaign:
          webhookData.tracking?.utm_campaign || storedOrder.utm_campaign,
        utm_medium: webhookData.tracking?.utm_medium || storedOrder.utm_medium,
        utm_content:
          webhookData.tracking?.utm_content || storedOrder.utm_content,
        utm_term: webhookData.tracking?.utm_term || storedOrder.utm_term,
      };
    }

    if (UTMIFY_TOKEN) {
      await sendToUtmify(UTMIFY_TOKEN, webhookData);

      // Mark utmify_paid_sent when paid notification succeeds
      if (normalizedStatus === "paid" && storedOrder?.id) {
        await supabaseAdmin
          .from("orders")
          .update({ utmify_paid_sent: true })
          .eq("id", storedOrder.id);
        console.log(`UTMify paid flag set for order ${storedOrder.id}`);
      }
    } else {
      console.warn("UTMIFY_TOKEN is not configured; skipping UTMify forward");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook processing error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
