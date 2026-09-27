import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

// Send paid event to UTMify
async function sendToUtmify(token: string, order: any) {
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  const amount = order.amount || 8760;

  const utmifyPayload = {
    orderId: order.external_ref,
    platform: "MesaMaleta",
    paymentMethod: "pix",
    status: "paid",
    createdAt: order.created_at
      ? new Date(order.created_at).toISOString().replace("T", " ").slice(0, 19)
      : now,
    approvedDate: now,
    refundedAt: null,
    customer: {
      name: order.customer_name || "",
      email: order.customer_email || "",
      phone: order.customer_phone || null,
      document: order.customer_document || null,
    },
    products: [
      {
        id: "mesa-dobravel-maleta",
        name: "Mesa Dobrável Tipo Maleta 180x60cm",
        planId: null,
        planName: null,
        quantity: order.quantity || 1,
        priceInCents: amount,
      },
    ],
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
      currency: "BRL",
    },
  };

  console.log(
    "[CheckPix→UTMify] Sending paid event:",
    JSON.stringify(utmifyPayload),
  );
  const response = await fetch(
    "https://api.utmify.com.br/api-credentials/orders",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-token": token },
      body: JSON.stringify(utmifyPayload),
    },
  );
  const responseText = await response.text();
  console.log(`[CheckPix→UTMify] Response [${response.status}]:`, responseText);
  if (!response.ok) {
    throw new Error(`UTMify API error [${response.status}]: ${responseText}`);
  }
}

// Send TikTok S2S CompletePayment
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

  console.log(
    "[CheckPix→TikTok] Sending S2S event:",
    JSON.stringify(eventPayload),
  );
  const resp = await fetch(
    "https://business-api.tiktok.com/open_api/v1.3/event/track/",
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
  console.log(`[CheckPix→TikTok] Response [${resp.status}]:`, respText);
  if (!resp.ok)
    throw new Error(`TikTok API error [${resp.status}]: ${respText}`);

  const json = JSON.parse(respText);
  if (json.code && json.code !== 0) {
    throw new Error(`TikTok logical error: ${respText}`);
  }
}

async function ensurePaidTracking(supabaseAdmin: any, order: any) {
  const UTMIFY_TOKEN = Deno.env.get("UTMIFY_TOKEN");

  if (UTMIFY_TOKEN && !order.utmify_paid_sent) {
    try {
      await sendToUtmify(UTMIFY_TOKEN, order);
      await supabaseAdmin
        .from("orders")
        .update({ utmify_paid_sent: true })
        .eq("id", order.id);
      order.utmify_paid_sent = true;
      console.log(`[CheckPix] UTMify paid flag set for ${order.external_ref}`);
    } catch (e) {
      console.error("[CheckPix→UTMify] Error:", e);
    }
  }

  if (!order.tiktok_paid_sent) {
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
          allOk = false;
          continue;
        }
        try {
          await sendTikTokEvent(order, pixel.pixel_id, token);
        } catch (e) {
          console.error(
            `[CheckPix→TikTok] Error for pixel ${pixel.pixel_id}:`,
            e,
          );
          allOk = false;
        }
      }

      if (allOk) {
        await supabaseAdmin
          .from("orders")
          .update({ tiktok_paid_sent: true })
          .eq("id", order.id);
        order.tiktok_paid_sent = true;
        console.log(
          `[CheckPix] TikTok paid flag set for ${order.external_ref}`,
        );
      }
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { externalRef } = await req.json();
    if (!externalRef) {
      return new Response(JSON.stringify({ error: "externalRef required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Get order and gateway config
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("external_ref", externalRef)
      .maybeSingle();

    if (!order) {
      return new Response(JSON.stringify({ status: "not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already paid in our DB
    if (order.status === "paid") {
      await ensurePaidTracking(supabaseAdmin, order);
      return new Response(
        JSON.stringify({ status: "paid", amount: order.amount }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // For Paradise orders, check status via API
    if (order.gateway === "paradise" && order.gateway_transaction_id) {
      const { data: config } = await supabaseAdmin
        .from("gateway_config")
        .select("paradise_api_key")
        .eq("id", "active")
        .maybeSingle();

      const paradiseKey =
        config?.paradise_api_key || Deno.env.get("PARADISE_API_KEY");
      if (paradiseKey) {
        const checkUrl = `https://multi.paradisepags.com/api/v1/query.php?action=get_transaction&id=${order.gateway_transaction_id}`;
        console.log(`[CheckPix] Checking Paradise status: ${checkUrl}`);

        let gatewayStatus = "";
        try {
          const resp = await fetch(checkUrl, {
            method: "GET",
            headers: { "X-API-Key": paradiseKey },
          });
          const data = await resp.json();
          console.log(`[CheckPix] Paradise response:`, JSON.stringify(data));
          gatewayStatus = String(data?.status || "")
            .trim()
            .toLowerCase();
        } catch (fetchErr) {
          console.error(`[CheckPix] Paradise fetch error:`, fetchErr);
        }

        const isPaidStatus = [
          "approved",
          "paid",
          "completed",
          "confirmed",
        ].includes(gatewayStatus);

        if (isPaidStatus) {
          await supabaseAdmin
            .from("orders")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("external_ref", externalRef)
            .neq("status", "paid");

          const UTMIFY_TOKEN = Deno.env.get("UTMIFY_TOKEN");
          if (UTMIFY_TOKEN) {
            try {
              await sendToUtmify(UTMIFY_TOKEN, order);
              await supabaseAdmin
                .from("orders")
                .update({ utmify_paid_sent: true })
                .eq("external_ref", externalRef);
            } catch (e) {
              console.error("[CheckPix→UTMify] Error:", e);
            }
          }

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
                allOk = false;
                continue;
              }
              try {
                await sendTikTokEvent(order, pixel.pixel_id, token);
              } catch (e) {
                console.error(
                  `[CheckPix→TikTok] Error for pixel ${pixel.pixel_id}:`,
                  e,
                );
                allOk = false;
              }
            }
            if (allOk) {
              await supabaseAdmin
                .from("orders")
                .update({ tiktok_paid_sent: true })
                .eq("external_ref", externalRef);
            }
          }

          return new Response(
            JSON.stringify({ status: "paid", amount: order.amount }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    // For Duttyfy orders, check status via API
    if (order.gateway === "duttyfy" && order.gateway_transaction_id) {
      const { data: config } = await supabaseAdmin
        .from("gateway_config")
        .select("duttyfy_api_url")
        .eq("id", "active")
        .maybeSingle();

      if (config?.duttyfy_api_url) {
        const checkUrl = `${config.duttyfy_api_url}?transactionId=${order.gateway_transaction_id}`;
        console.log(`[CheckPix] Checking Duttyfy status: ${checkUrl}`);

        let gatewayStatus = "";
        let data: any = {};
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const resp = await fetch(checkUrl, { method: "GET" });
            data = await resp.json();
            gatewayStatus = String(data?.status || data?.data?.status || "")
              .trim()
              .toUpperCase();
            const isPaid = [
              "COMPLETED",
              "PAID",
              "APPROVED",
              "CONFIRMED",
              "RECEIVED",
            ].includes(gatewayStatus);
            if (isPaid) break;
            if (attempt < 2 && gatewayStatus === "PENDING") {
              await new Promise((r) => setTimeout(r, 1000));
            }
          } catch (fetchErr) {
            console.error(
              `[CheckPix] Duttyfy fetch error (attempt ${attempt}):`,
              fetchErr,
            );
          }
        }

        const isPaidStatus = [
          "COMPLETED",
          "PAID",
          "APPROVED",
          "CONFIRMED",
          "RECEIVED",
        ].includes(gatewayStatus);

        if (isPaidStatus) {
          await supabaseAdmin
            .from("orders")
            .update({
              status: "paid",
              paid_at: data.paidAt || new Date().toISOString(),
            })
            .eq("external_ref", externalRef)
            .neq("status", "paid");

          const trackedOrder = {
            ...order,
            status: "paid",
            paid_at: data.paidAt || new Date().toISOString(),
          };
          await ensurePaidTracking(supabaseAdmin, trackedOrder);

          return new Response(
            JSON.stringify({ status: "paid", amount: order.amount }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    // For BuckPay orders, check status via API (GET /v1/transactions/external_id/:external_id)
    if (order.gateway === "buckpay") {
      const { data: config } = await supabaseAdmin
        .from("gateway_config")
        .select("buckpay_api_key, buckpay_user_agent")
        .eq("id", "active")
        .maybeSingle();

      const bpKey = Deno.env.get("BUCKPAY_API_KEY") || config?.buckpay_api_key;
      const bpUa =
        Deno.env.get("BUCKPAY_USER_AGENT") || config?.buckpay_user_agent;

      if (bpKey) {
        const checkUrl = `https://api.realtechdev.com.br/v1/transactions/external_id/${encodeURIComponent(externalRef)}`;
        console.log(`[CheckPix] Checking BuckPay status: ${checkUrl}`);

        let gatewayStatus = "";
        try {
          const headers: Record<string, string> = {
            Authorization: `Bearer ${bpKey}`,
          };
          if (bpUa) headers["User-Agent"] = bpUa;
          const resp = await fetch(checkUrl, { method: "GET", headers });
          const data = await resp.json();
          console.log(`[CheckPix] BuckPay response:`, JSON.stringify(data));
          gatewayStatus = String(data?.data?.status || data?.status || "")
            .trim()
            .toLowerCase();
        } catch (fetchErr) {
          console.error(`[CheckPix] BuckPay fetch error:`, fetchErr);
        }

        const isPaidStatus = [
          "paid",
          "approved",
          "completed",
          "confirmed",
        ].includes(gatewayStatus);

        if (isPaidStatus) {
          await supabaseAdmin
            .from("orders")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("external_ref", externalRef)
            .neq("status", "paid");

          const UTMIFY_TOKEN = Deno.env.get("UTMIFY_TOKEN");
          if (UTMIFY_TOKEN) {
            try {
              await sendToUtmify(UTMIFY_TOKEN, order);
              await supabaseAdmin
                .from("orders")
                .update({ utmify_paid_sent: true })
                .eq("external_ref", externalRef);
            } catch (e) {
              console.error("[CheckPix→UTMify] Error:", e);
            }
          }

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
                allOk = false;
                continue;
              }
              try {
                await sendTikTokEvent(order, pixel.pixel_id, token);
              } catch (e) {
                console.error(`[CheckPix→TikTok] Error:`, e);
                allOk = false;
              }
            }
            if (allOk) {
              await supabaseAdmin
                .from("orders")
                .update({ tiktok_paid_sent: true })
                .eq("external_ref", externalRef);
            }
          }

          return new Response(
            JSON.stringify({ status: "paid", amount: order.amount }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
      }
    }

    // For IronPay orders, check status via API
    if (order.gateway === "ironpay") {
      const { data: config } = await supabaseAdmin
        .from("gateway_config")
        .select("ironpay_api_key")
        .eq("id", "active")
        .maybeSingle();
      const ipKey = Deno.env.get("IRONPAY_API_KEY") || config?.ironpay_api_key;
      if (ipKey && order.gateway_transaction_id) {
        try {
          const resp = await fetch(
            `https://api.ironpayapp.com.br/api/public/v1/transactions/${encodeURIComponent(order.gateway_transaction_id)}?api_token=${encodeURIComponent(ipKey)}`,
            { method: "GET" },
          );
          const data = await resp.json();
          console.log(`[CheckPix] IronPay response:`, JSON.stringify(data));
          const gs = String(data?.status || data?.data?.status || "").trim().toLowerCase();
          if (["paid", "approved", "completed", "confirmed"].includes(gs)) {
            await ensurePaidTracking(supabaseAdmin, order);
            return new Response(
              JSON.stringify({ status: "paid", amount: order.amount }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        } catch (e) {
          console.error("[CheckPix] IronPay fetch error:", e);
        }
      }
    }

    }

    return new Response(
      JSON.stringify({ status: order.status, amount: order.amount }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("Error checking PIX status:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
