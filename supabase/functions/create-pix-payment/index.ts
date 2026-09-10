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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const APP_BASE_URL = "https://amrlifefacilxc.lovable.app";

const variantLabelMap: Record<string, string> = {
  "2pretos": "2 Pretos",
  "2brancos": "2 Brancos",
  "1cada": "1 Preto e 1 Branco",
  "preta": "Preta",
  "branca": "Branca",
};

const getTrackingMeta = (
  productType?: string | null,
  color?: string | null,
  explicitName?: string | null,
) => {
  if (productType === "envioup") {
    return {
      contentId: "envioup",
      productTitle: explicitName || "Liberação de Envio Prioritário",
      pageUrl: `${APP_BASE_URL}/envioup`,
    };
  }

  if (productType === "nfe") {
    return {
      contentId: "nfe",
      productTitle: explicitName || "Taxa de Emissão da Nota Fiscal",
      pageUrl: `${APP_BASE_URL}/nfe`,
    };
  }

  if (productType === "taxa") {
    return {
      contentId: "taxa",
      productTitle: explicitName || "Taxa Complementar",
      pageUrl: `${APP_BASE_URL}/taxa`,
    };
  }

  const variantLabel = variantLabelMap[color || ""] || "";
  return {
    contentId: "armario-homeflex",
    productTitle:
      explicitName ||
      (variantLabel
        ? `Armário HomeFlex de Aço Multifuncional - ${variantLabel}`
        : "Armário HomeFlex de Aço Multifuncional"),
    pageUrl: `${APP_BASE_URL}/pix`,
  };
};

// Helper: call BlackCat API with timeout
async function callBlackCat(
  apiKey: string,
  saleData: any,
): Promise<{ data: any; duration: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const start = Date.now();

  try {
    console.log(`[BlackCat] Iniciando chamada...`);
    const response = await fetch(
      "https://api.blackcatpagamentos.online/api/sales/create-sale",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify(saleData),
        signal: controller.signal,
      },
    );
    const duration = Date.now() - start;
    const data = await response.json();

    console.log(
      `[BlackCat] Resposta em ${(duration / 1000).toFixed(2)}s | Status: ${response.status}`,
    );
    console.log(`[BlackCat] Body:`, JSON.stringify(data));

    if (!response.ok) {
      throw new Error(
        `BlackCat API error [${response.status}]: ${JSON.stringify(data)}`,
      );
    }
    if (!data.data) {
      throw new Error(
        `BlackCat retornou resposta sem dados válidos: ${JSON.stringify(data)}`,
      );
    }

    return { data: data.data, duration };
  } finally {
    clearTimeout(timeout);
  }
}

// Helper: call Paradise API
async function callParadise(
  apiKey: string,
  saleData: any,
): Promise<{ data: any; duration: number }> {
  const start = Date.now();
  console.log(`[Paradise] Iniciando chamada...`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(
      "https://multi.paradisepags.com/api/v1/transaction.php",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify(saleData),
        signal: controller.signal,
      },
    );
    const duration = Date.now() - start;
    const data = await response.json();

    console.log(
      `[Paradise] Resposta em ${(duration / 1000).toFixed(2)}s | Status: ${response.status}`,
    );
    console.log(`[Paradise] Body:`, JSON.stringify(data));

    if (!response.ok || (data.status && data.status !== "success" && !data.transaction_id && !data.id)) {
      throw new Error(
        `Paradise API error [${response.status}]: ${JSON.stringify(data)}`,
      );
    }

    return {
      data: {
        transactionId: data.transaction_id || data.id,
        pixCode: data.qr_code,
        qrCodeBase64: data.qr_code_base64,
        amount: data.amount,
      },
      duration,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// Helper: call Duttyfy API (key is embedded in URL, no auth header needed)
async function callDuttyfy(
  url: string,
  saleData: any,
): Promise<{ data: any; duration: number }> {
  const start = Date.now();
  console.log(`[Duttyfy] Iniciando chamada para: ${url}`);
  console.log(`[Duttyfy] Payload:`, JSON.stringify(saleData));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saleData),
      signal: controller.signal,
    });
    const duration = Date.now() - start;
    const data = await response.json();
    const payload = data?.data || data;

    console.log(
      `[Duttyfy] Resposta em ${(duration / 1000).toFixed(2)}s | Status: ${response.status}`,
    );
    console.log(`[Duttyfy] Body:`, JSON.stringify(data));

    if (!response.ok || data?.error || payload?.error) {
      throw new Error(
        `Duttyfy API error [${response.status}]: ${data?.error || payload?.error || JSON.stringify(data)}`,
      );
    }

    const transactionId =
      payload?.transactionId ||
      payload?.transaction_id ||
      payload?.id ||
      payload?._id?.$oid ||
      data?.transactionId ||
      data?.transaction_id ||
      data?.id ||
      data?._id?.$oid ||
      null;

    if (!transactionId) {
      throw new Error(
        `Duttyfy retornou sem transactionId: ${JSON.stringify(data)}`,
      );
    }

    return {
      data: {
        transactionId,
        pixCode:
          payload?.pixCode ||
          payload?.pix_code ||
          payload?.copyPaste ||
          payload?.copy_paste ||
          payload?.qrCode ||
          payload?.qr_code ||
          payload?.pix?.code ||
          "",
        qrCodeBase64:
          payload?.qrCodeBase64 ||
          payload?.qr_code_base64 ||
          payload?.qrcode_base64 ||
          payload?.pix?.qrcode_base64 ||
          null,
        amount: saleData.amount,
      },
      duration,
    };
  } finally {
    clearTimeout(timeout);
  }

}

// Helper: call BuckPay API
async function callBuckPay(
  apiKey: string,
  userAgent: string | null,
  saleData: any,
): Promise<{ data: any; duration: number }> {
  const start = Date.now();
  console.log(`[BuckPay] Iniciando chamada...`);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (userAgent) headers["User-Agent"] = userAgent;

  const response = await fetch(
    "https://api.realtechdev.com.br/v1/transactions",
    {
      method: "POST",
      headers,
      body: JSON.stringify(saleData),
    },
  );
  const duration = Date.now() - start;
  const data = await response.json();

  console.log(
    `[BuckPay] Resposta em ${(duration / 1000).toFixed(2)}s | Status: ${response.status}`,
  );
  console.log(`[BuckPay] Body:`, JSON.stringify(data));

  if (!response.ok) {
    throw new Error(
      `BuckPay API error [${response.status}]: ${JSON.stringify(data)}`,
    );
  }

  const txData = data.data || data;

  return {
    data: {
      transactionId: txData.id,
      pixCode: txData.pix?.code || "",
      qrCodeBase64: txData.pix?.qrcode_base64 || "",
      amount: txData.total_amount,
    },
    duration,
  };
}

// Helper: call IronPay API
async function callIronPay(
  apiKey: string,
  saleData: any,
): Promise<{ data: any; duration: number }> {
  const start = Date.now();
  console.log(`[IronPay] Iniciando chamada...`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(
      "https://api.ironpayapp.com.br/api/public/v1/transactions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...saleData, api_token: apiKey }),
        signal: controller.signal,
      },
    );
    const duration = Date.now() - start;
    const data = await response.json();

    console.log(
      `[IronPay] Resposta em ${(duration / 1000).toFixed(2)}s | Status: ${response.status}`,
    );
    console.log(`[IronPay] Body:`, JSON.stringify(data));

    if (!response.ok) {
      throw new Error(
        `IronPay API error [${response.status}]: ${JSON.stringify(data)}`,
      );
    }

    return {
      data: {
        transactionId: data.transaction_hash || data.id || data.hash,
        pixCode: data.pix_code || data.qr_code || data.copy_paste || "",
        qrCodeBase64: data.qr_code_base64 || data.qrcode_base64 || null,
        amount: data.amount || saleData.amount,
      },
      duration,
    };
  } finally {
    clearTimeout(timeout);
  }
}



serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(SUPABASE_URL, supabaseServiceKey);

    const { data: gatewayConfig } = await supabaseAdmin
      .from("gateway_config")
      .select("*")
      .eq("id", "active")
      .single();

    const activeGateway = gatewayConfig?.active_gateway || "paradise";

    let apiKey: string | null = null;
    let duttyfyUrl: string | null = null;
    let buckpayUserAgent: string | null = null;

    if (activeGateway === "blackcat") {
      apiKey =
        gatewayConfig?.blackcat_api_key ||
        Deno.env.get("BLACKCAT_API_KEY") ||
        null;
    } else if (activeGateway === "paradise") {
      apiKey =
        gatewayConfig?.paradise_api_key ||
        Deno.env.get("PARADISE_API_KEY") ||
        null;
    } else if (activeGateway === "duttyfy") {
      duttyfyUrl = gatewayConfig?.duttyfy_api_url || null;
    } else if (activeGateway === "buckpay") {
      apiKey =
        Deno.env.get("BUCKPAY_API_KEY") ||
        gatewayConfig?.buckpay_api_key ||
        null;
      buckpayUserAgent =
        Deno.env.get("BUCKPAY_USER_AGENT") ||
        gatewayConfig?.buckpay_user_agent ||
        "BuckPay-Client/1.0";
    } else if (activeGateway === "ironpay") {
      apiKey =
        gatewayConfig?.ironpay_api_key ||
        Deno.env.get("IRONPAY_API_KEY") ||
        null;
    }

    if (activeGateway === "buckpay" && !apiKey) {
      throw new Error("BuckPay API key não configurada");
    }
    if (activeGateway === "ironpay" && !apiKey) {
      throw new Error("IronPay API key não configurada");
    }
    if (
      activeGateway !== "duttyfy" &&
      activeGateway !== "buckpay" &&
      activeGateway !== "ironpay" &&
      !apiKey
    ) {
      throw new Error(`API key not configured for gateway: ${activeGateway}`);
    }
    if (activeGateway === "duttyfy" && !duttyfyUrl) {
      throw new Error("URL não configurada para o Duttyfy");
    }
    // Duttyfy doesn't need a separate API key (key is in URL)

    const UTMIFY_TOKEN = Deno.env.get("UTMIFY_TOKEN");
    const body = await req.json();
    const { customer, shipping, color, amount, tracking, product_type, product_name } = body;

    // Capture client IP / User-Agent for TikTok EMQ
    const xff = req.headers.get("x-forwarded-for") || "";
    const clientIp =
      (
        xff.split(",")[0] ||
        req.headers.get("cf-connecting-ip") ||
        req.headers.get("x-real-ip") ||
        ""
      ).trim() || null;
    const userAgent = req.headers.get("user-agent") || null;
    const ttpCookie = tracking?.ttp || null;

    if (
      !customer?.name ||
      !customer?.email ||
      !customer?.phone ||
      !customer?.document?.number
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Dados do cliente incompletos",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (
      !shipping?.street ||
      !shipping?.number ||
      !shipping?.neighborhood ||
      !shipping?.city ||
      !shipping?.state ||
      !shipping?.zipCode
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Dados de endereço incompletos",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const postbackUrl = `${SUPABASE_URL}/functions/v1/payment-webhook`;
    const paradisePostbackUrl = `${SUPABASE_URL}/functions/v1/paradise-webhook`;
    const externalRef = `ORDER-${Date.now()}`;
    let responseData: any;
    let usedGateway = activeGateway;

    const { contentId, productTitle, pageUrl } = getTrackingMeta(product_type, color, product_name);
    const finalAmount = amount || 6420;

    if (activeGateway === "blackcat") {
      const blackcatSaleData = {
        amount: finalAmount,
        currency: "BRL",
        paymentMethod: "pix",
        items: [
          {
            title: productTitle,
            unitPrice: finalAmount,
            quantity: 1,
            tangible: true,
          },
        ],
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone.replace(/\D/g, ""),
          document: {
            number: customer.document.number.replace(/\D/g, ""),
            type: "cpf",
          },
        },
        shipping: {
          name: customer.name,
          street: shipping.street,
          number: shipping.number,
          complement: shipping.complement || "",
          neighborhood: shipping.neighborhood,
          city: shipping.city,
          state: shipping.state,
          zipCode: shipping.zipCode.replace(/\D/g, ""),
        },
        pix: { expiresInDays: 1 },
        postbackUrl,
        externalRef,
      };

      try {
        const result = await callBlackCat(apiKey!, blackcatSaleData);
        responseData = result.data;
        usedGateway = "blackcat";
        console.log(
          `[BlackCat] ✅ Sucesso em ${(result.duration / 1000).toFixed(2)}s`,
        );
      } catch (bcError: any) {
        const reason =
          bcError.name === "AbortError" ? "timeout (10s)" : bcError.message;
        console.error(`[FALLBACK] BlackCat falhou | Motivo: ${reason}`);
        console.log(`[FALLBACK] BlackCat -> Paradise | Tentando backup...`);

        const paradiseKey =
          gatewayConfig?.paradise_api_key || Deno.env.get("PARADISE_API_KEY");
        if (!paradiseKey) {
          throw new Error(
            `BlackCat falhou (${reason}) e Paradise API key não está configurada para fallback`,
          );
        }

        const paradiseSaleData = {
          amount: finalAmount,
          description: productTitle,
          reference: externalRef,
          source: "api_externa",
          postback_url: paradisePostbackUrl,
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone.replace(/\D/g, ""),
            document: customer.document.number.replace(/\D/g, ""),
          },
        };

        const fallbackResult = await callParadise(
          paradiseKey,
          paradiseSaleData,
        );
        responseData = { ...fallbackResult.data, externalRef };
        usedGateway = "paradise";
        console.log(
          `[FALLBACK] ✅ Paradise processou com sucesso em ${(fallbackResult.duration / 1000).toFixed(2)}s`,
        );
      }
    } else if (activeGateway === "paradise") {
      const saleData = {
        amount: finalAmount,
        description: productTitle,
        reference: externalRef,
        source: "api_externa",
        postback_url: paradisePostbackUrl,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone.replace(/\D/g, ""),
          document: customer.document.number.replace(/\D/g, ""),
        },
      };

      try {
        const result = await callParadise(apiKey!, saleData);
        responseData = { ...result.data, externalRef };
        usedGateway = "paradise";
        console.log(
          `[Paradise] ✅ Sucesso em ${(result.duration / 1000).toFixed(2)}s`,
        );
      } catch (pError: any) {
        const reason = pError.message;
        console.error(`[FALLBACK] Paradise falhou | Motivo: ${reason}`);
        console.log(`[FALLBACK] Paradise -> Duttyfy | Tentando backup...`);

        const fbDuttyfyUrl = gatewayConfig?.duttyfy_api_url || null;
        if (!fbDuttyfyUrl) {
          throw new Error(
            `Paradise falhou (${reason}) e Duttyfy URL não está configurada para fallback`,
          );
        }

        const utmParts: string[] = [];
        if (tracking?.utm_source) utmParts.push(`utm_source=${tracking.utm_source}`);
        if (tracking?.utm_medium) utmParts.push(`utm_medium=${tracking.utm_medium}`);
        if (tracking?.utm_campaign) utmParts.push(`utm_campaign=${tracking.utm_campaign}`);
        if (tracking?.utm_content) utmParts.push(`utm_content=${tracking.utm_content}`);
        if (tracking?.utm_term) utmParts.push(`utm_term=${tracking.utm_term}`);
        const utmString = utmParts.length > 0 ? utmParts.join("&") : undefined;

        // Duttyfy faz strict validation: só aceita estas propriedades.
        // Qualquer campo extra (externalRef, postback_url, webhook, etc.) retorna HTTP 400.
        const duttyfySaleData: any = {
          amount: finalAmount,
          description: productTitle,
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone.replace(/\D/g, ""),
            document: customer.document.number.replace(/\D/g, ""),
          },
          item: { title: productTitle, price: finalAmount, quantity: 1 },
          paymentMethod: "PIX",
        };
        if (utmString) duttyfySaleData.utm = utmString;

        const fallbackResult = await callDuttyfy(fbDuttyfyUrl, duttyfySaleData);
        responseData = { ...fallbackResult.data, externalRef };
        usedGateway = "duttyfy";
        console.log(
          `[FALLBACK] ✅ Duttyfy processou com sucesso em ${(fallbackResult.duration / 1000).toFixed(2)}s`,
        );
      }
    } else if (activeGateway === "buckpay") {
      const buckpaySaleData = {
        external_id: externalRef,
        payment_method: "pix",
        amount: finalAmount,
        buyer: {
          name: customer.name,
          email: customer.email,
          document: customer.document.number.replace(/\D/g, ""),
          phone: `55${customer.phone.replace(/\D/g, "")}`,
        },
        product: {
          id: "armario-homeflex",
          name: productTitle,
        },
        offer: {
          id: "offer-armario-homeflex",
          name: productTitle,
          quantity: 1,
        },
        tracking: {
          ref: externalRef,
          src: tracking?.utm_source || null,
          sck: null,
          utm_source: tracking?.utm_source || null,
          utm_medium: tracking?.utm_medium || null,
          utm_campaign: tracking?.utm_campaign || null,
          utm_id: null,
          utm_term: tracking?.utm_term || null,
          utm_content: tracking?.utm_content || null,
        },
        postbackUrl,
      };

      try {
        const result = await callBuckPay(
          apiKey!,
          buckpayUserAgent!,
          buckpaySaleData,
        );
        responseData = { ...result.data, externalRef };
        usedGateway = "buckpay";
        console.log(
          `[BuckPay] ✅ Sucesso em ${(result.duration / 1000).toFixed(2)}s`,
        );
      } catch (bpError: any) {
        const reason = bpError.message;
        console.error(`[FALLBACK] BuckPay falhou | Motivo: ${reason}`);

        // Try Paradise as fallback
        const paradiseKey =
          gatewayConfig?.paradise_api_key || Deno.env.get("PARADISE_API_KEY");
        if (!paradiseKey) {
          throw new Error(
            `BuckPay falhou (${reason}) e Paradise API key não está configurada para fallback`,
          );
        }

        const paradiseSaleData = {
          amount: finalAmount,
          description: productTitle,
          reference: externalRef,
          source: "api_externa",
          postback_url: paradisePostbackUrl,
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone.replace(/\D/g, ""),
            document: customer.document.number.replace(/\D/g, ""),
          },
        };

        const fallbackResult = await callParadise(
          paradiseKey,
          paradiseSaleData,
        );
        responseData = { ...fallbackResult.data, externalRef };
        usedGateway = "paradise";
        console.log(
          `[FALLBACK] ✅ Paradise processou com sucesso em ${(fallbackResult.duration / 1000).toFixed(2)}s`,
        );
      }
    } else if (activeGateway === "duttyfy") {
      // Build UTM string from tracking params
      const utmParts: string[] = [];
      if (tracking?.utm_source)
        utmParts.push(`utm_source=${tracking.utm_source}`);
      if (tracking?.utm_medium)
        utmParts.push(`utm_medium=${tracking.utm_medium}`);
      if (tracking?.utm_campaign)
        utmParts.push(`utm_campaign=${tracking.utm_campaign}`);
      if (tracking?.utm_content)
        utmParts.push(`utm_content=${tracking.utm_content}`);
      if (tracking?.utm_term) utmParts.push(`utm_term=${tracking.utm_term}`);
      const utmString = utmParts.length > 0 ? utmParts.join("&") : undefined;

      // Duttyfy faz strict validation: só aceita estas propriedades.
      // Qualquer campo extra (externalRef, postback_url, webhook, etc.) retorna HTTP 400.
      const saleData: any = {
        amount: finalAmount,
        description: productTitle,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone.replace(/\D/g, ""),
          document: customer.document.number.replace(/\D/g, ""),
        },
        item: { title: productTitle, price: finalAmount, quantity: 1 },
        paymentMethod: "PIX",
      };
      if (utmString) saleData.utm = utmString;

      try {
        const result = await callDuttyfy(duttyfyUrl!, saleData);
        responseData = { ...result.data, externalRef };
        usedGateway = "duttyfy";
        console.log(
          `[Duttyfy] ✅ Sucesso em ${(result.duration / 1000).toFixed(2)}s`,
        );
      } catch (dtError: any) {
        const reason = dtError?.message || "Erro desconhecido";
        console.error(`[Duttyfy] Falhou | Motivo: ${reason}`);
        console.log(`[FALLBACK] Duttyfy -> Paradise | Tentando backup...`);

        const fbParadiseKey =
          gatewayConfig?.paradise_api_key ||
          Deno.env.get("PARADISE_API_KEY") ||
          null;
        if (!fbParadiseKey) {
          throw new Error(
            `Duttyfy falhou (${reason}) e Paradise API key não está configurada para fallback`,
          );
        }

        const paradiseSaleData = {
          amount: finalAmount,
          description: productTitle,
          reference: externalRef,
          source: "api_externa",
          postback_url: paradisePostbackUrl,
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone.replace(/\D/g, ""),
            document: customer.document.number.replace(/\D/g, ""),
          },
        };

        const fallbackResult = await callParadise(fbParadiseKey, paradiseSaleData);
        responseData = { ...fallbackResult.data, externalRef };
        usedGateway = "paradise";
        console.log(
          `[FALLBACK] ✅ Paradise processou com sucesso em ${(fallbackResult.duration / 1000).toFixed(2)}s`,
        );
      }
    } else if (activeGateway === "ironpay") {
      const ironPaySaleData = {
        amount: finalAmount,
        payment_method: "pix",
        description: productTitle,
        external_reference: externalRef,
        postback_url: postbackUrl,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone.replace(/\D/g, ""),
          document: customer.document.number.replace(/\D/g, ""),
        },
      };

      try {
        const result = await callIronPay(apiKey!, ironPaySaleData);
        responseData = { ...result.data, externalRef };
        usedGateway = "ironpay";
        console.log(
          `[IronPay] ✅ Sucesso em ${(result.duration / 1000).toFixed(2)}s`,
        );
      } catch (ipError: any) {
        const reason = ipError?.message || "Erro desconhecido";
        console.error(`[FALLBACK] IronPay falhou | Motivo: ${reason}`);

        const paradiseKey =
          gatewayConfig?.paradise_api_key || Deno.env.get("PARADISE_API_KEY");
        if (!paradiseKey) {
          throw new Error(
            `IronPay falhou (${reason}) e Paradise API key não está configurada para fallback`,
          );
        }

        const paradiseSaleData = {
          amount: finalAmount,
          description: productTitle,
          reference: externalRef,
          source: "api_externa",
          postback_url: paradisePostbackUrl,
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone.replace(/\D/g, ""),
            document: customer.document.number.replace(/\D/g, ""),
          },
        };

        const fallbackResult = await callParadise(
          paradiseKey,
          paradiseSaleData,
        );
        responseData = { ...fallbackResult.data, externalRef };
        usedGateway = "paradise";
        console.log(
          `[FALLBACK] ✅ Paradise processou com sucesso em ${(fallbackResult.duration / 1000).toFixed(2)}s`,
        );
      }
    }

    // Save order
    const { error: insertError } = await supabaseAdmin.from("orders").insert({
      external_ref: externalRef,
      gateway: usedGateway,
      gateway_transaction_id: String(responseData?.transactionId || ""),
      status: "pending",
      amount: finalAmount,
      color,
      quantity: 1,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone.replace(/\D/g, ""),
      customer_document: customer.document.number.replace(/\D/g, ""),
      shipping_street: shipping.street,
      shipping_number: shipping.number,
      shipping_complement: shipping.complement || "",
      shipping_neighborhood: shipping.neighborhood,
      shipping_city: shipping.city,
      shipping_state: shipping.state,
      shipping_zip: shipping.zipCode.replace(/\D/g, ""),
      pix_code: responseData?.pixCode || "",
      pix_qr_base64: responseData?.qrCodeBase64 || null,
      utm_source: tracking?.utm_source || tracking?.src || null,
      utm_campaign: tracking?.utm_campaign || null,
      utm_medium: tracking?.utm_medium || null,
      utm_content: tracking?.utm_content || null,
      utm_term: tracking?.utm_term || null,
      ttclid: tracking?.ttclid || null,
      campaign_id: tracking?.campaign_id || null,
      adset_id: tracking?.adset_id || null,
      ad_id: tracking?.ad_id || null,
      campaign_name: tracking?.campaign_name || null,
      adset_name: tracking?.adset_name || null,
      ad_name: tracking?.ad_name || null,
      product_type: product_type || "mesa",
      customer_ip: clientIp,
      customer_user_agent: userAgent,
      tiktok_ttp: ttpCookie,
    });

    if (insertError) {
      console.error("Error saving order:", insertError);
      throw new Error(`Erro ao salvar pedido: ${insertError.message}`);
    }

    // TikTok S2S PlaceAnOrder on pending (per-pixel token via resolveTikTokToken)
    {
      try {
        const sha256 = async (str: string) => {
          const data = new TextEncoder().encode(str.trim().toLowerCase());
          const hash = await crypto.subtle.digest("SHA-256", data);
          return Array.from(new Uint8Array(hash))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        };

        const phone = customer.phone.replace(/\D/g, "");
        const emailHash = await sha256(customer.email);
        const phoneE164 = `55${phone}`;
        const phoneE164Hash = await sha256(phoneE164);
        const cpfHash = await sha256(
          customer.document.number.replace(/\D/g, ""),
        );
        const nameParts = (customer.name || "").trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName =
          nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
        const firstNameHash = firstName ? await sha256(firstName) : undefined;
        const lastNameHash = lastName ? await sha256(lastName) : undefined;
        const city = shipping?.city ? String(shipping.city).trim() : undefined;
        const state = shipping?.state ? String(shipping.state).trim().toUpperCase() : undefined;
        const zipCode = shipping?.zipCode ? shipping.zipCode.replace(/\D/g, "") : undefined;

        const { data: pixels } = await supabaseAdmin
          .from("tiktok_pixels")
          .select("pixel_id, access_token_env")
          .eq("is_active", true)
          .eq("track_pending", true);

        if (pixels?.length) {
          for (const pixel of pixels) {
            const pixelToken = resolveTikTokToken(pixel.access_token_env);
            if (!pixelToken) {
              console.warn(
                `No token for pixel ${pixel.pixel_id} (env: ${pixel.access_token_env})`,
              );
              continue;
            }
            const eventPayload = {
              event_source: "web",
              event_source_id: pixel.pixel_id,
              data: [
                {
                  event: "PlaceAnOrder",
                  event_time: Math.floor(Date.now() / 1000),
                  event_id: `pending_${externalRef}`,
                  user: {
                    email: emailHash,
                    phone: phoneE164Hash,
                    external_id: cpfHash,
                    ...(firstNameHash && { first_name: firstNameHash }),
                    ...(lastNameHash && { last_name: lastNameHash }),
                    ...(city && { city }),
                    ...(state && { state }),
                    ...(zipCode && { zip_code: zipCode }),
                    country: "BR",
                    ...(clientIp && { ip: clientIp }),
                    ...(userAgent && { user_agent: userAgent }),
                    ...(ttpCookie && { ttp: ttpCookie }),
                    ...(tracking?.ttclid && { ttclid: tracking.ttclid }),
                  },
                  properties: {
                    contents: [
                      {
                        content_id: contentId,
                        content_name: productTitle,
                        content_type: "product",
                        quantity: 1,
                        price: finalAmount / 100,
                      },
                    ],
                    value: finalAmount / 100,
                    currency: "BRL",
                  },
                  page: {
                    url: tracking?.page_url || pageUrl,
                    ...(tracking?.referrer && { referrer: tracking.referrer }),
                  },
                },
              ],
            };

            console.log(
              `[TikTok S2S] Pixel: ${pixel.pixel_id} | Event: PlaceAnOrder | Order: ${externalRef}`,
            );
            const resp = await fetch(
              "https://business-api.tiktok.com/open_api/v1.3/event/track/",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Access-Token": pixelToken,
                },
                body: JSON.stringify(eventPayload),
              },
            );
            console.log(
              `[TikTok S2S] Response [${resp.status}]:`,
              await resp.text(),
            );
          }
        }
      } catch (ttErr) {
        console.error("TikTok S2S pending error (non-blocking):", ttErr);
      }
    }

    // UTMify initial event
    if (UTMIFY_TOKEN && responseData) {
      try {
        const now = new Date().toISOString().replace("T", " ").slice(0, 19);
        const utmifyPayload = {
          orderId: externalRef,
          platform: "MesaMaleta",
          paymentMethod: "pix",
          status: "waiting_payment",
          createdAt: now,
          approvedDate: null,
          refundedAt: null,
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone.replace(/\D/g, ""),
            document: customer.document.number.replace(/\D/g, ""),
          },
          products: [
            {
              id: "mesa-dobravel-maleta",
              name: productTitle,
              planId: null,
              planName: null,
              quantity: 1,
              priceInCents: finalAmount,
            },
          ],
          trackingParameters: {
            src: tracking?.src || tracking?.utm_source || null,
            sck: tracking?.sck || null,
            utm_source: tracking?.utm_source || tracking?.src || null,
            utm_campaign: tracking?.utm_campaign || null,
            utm_medium: tracking?.utm_medium || null,
            utm_content: tracking?.utm_content || null,
            utm_term: tracking?.utm_term || null,
          },
          commission: {
            totalPriceInCents: finalAmount,
            gatewayFeeInCents: Math.round(finalAmount * 0.06) + 197,
            userCommissionInCents:
              finalAmount - (Math.round(finalAmount * 0.06) + 197),
            currency: "BRL",
          },
        };
        const utmRes = await fetch(
          "https://api.utmify.com.br/api-credentials/orders",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-token": UTMIFY_TOKEN,
            },
            body: JSON.stringify(utmifyPayload),
          },
        );
        console.log(
          `UTMify initial response [${utmRes.status}]:`,
          await utmRes.text(),
        );
      } catch (utmError) {
        console.error("UTMify initial event error (non-blocking):", utmError);
      }
    }

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error creating PIX payment:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
