export const MANGOFY_BASE_URL = "https://checkout.mangofy.com.br";

type PixInput = {
  externalRef: string;
  amount: number;
  productTitle: string;
  postbackUrl: string;
  customer: { name: string; email: string; phone: string; document: { number: string } };
  shipping: { street: string; number: string; neighborhood: string; city: string; state: string; zipCode: string; complement?: string };
  clientIp: string | null;
  tracking?: Record<string, unknown>;
};

export type MangofyPayment = {
  payment_code: string;
  external_code: string;
  payment_status: string;
  payment_amount: number;
  approved_at?: string | null;
  pix?: { pix_qrcode_text?: string; pix_qrcode_image?: string; pix_expires_at?: string };
};

export function buildMangofyPix(input: PixInput) {
  if (!Number.isInteger(input.amount) || input.amount < 500 || input.amount > 200000) {
    throw new Error("Valor do PIX Mangofy inválido");
  }
  if (!input.externalRef || input.externalRef.length > 100 || !input.productTitle ||
      !input.customer?.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customer.email) ||
      !/^\d{10,15}$/.test(input.customer.phone.replace(/\D/g, "")) ||
      !/^\d{11}$|^\d{14}$/.test(input.customer.document.number.replace(/\D/g, ""))) {
    throw new Error("Dados do cliente inválidos para a Mangofy");
  }
  return {
    external_code: input.externalRef,
    payment_method: "pix",
    payment_format: "regular",
    installments: 1,
    payment_amount: input.amount,
    shipping_amount: 0,
    postback_url: input.postbackUrl,
    items: [{ code: "armario-homeflex", name: input.productTitle, quantity: 1, price: input.amount }],
    customer: {
      name: input.customer.name,
      email: input.customer.email,
      phone: input.customer.phone.replace(/\D/g, ""),
      document: input.customer.document.number.replace(/\D/g, ""),
      ...(input.clientIp ? { ip: input.clientIp } : {}),
    },
    shipping: {
      street: input.shipping.street,
      number: input.shipping.number,
      complement: input.shipping.complement || "",
      neighborhood: input.shipping.neighborhood,
      city: input.shipping.city,
      state: input.shipping.state,
      zip_code: input.shipping.zipCode.replace(/\D/g, ""),
    },
    pix: { expires_in_days: 1 },
    extra: { metadata: input.tracking || {} },
  };
}

export function normalizeMangofyStatus(status: string): "paid" | "pending" | "cancelled" | "refunded" {
  const value = status.trim().toLowerCase();
  if (value === "approved") return "paid";
  if (["refused", "canceled", "canceled_antifraud", "expired"].includes(value)) return "cancelled";
  if (value === "refunded") return "refunded";
  return "pending";
}

export function matchesMangofyOrder(payment: MangofyPayment, order: { external_ref: string; gateway_transaction_id: string; amount: number }) {
  return payment.payment_code === order.gateway_transaction_id &&
    payment.external_code === order.external_ref && payment.payment_amount === order.amount;
}

export async function requestMangofy(apiKey: string, storeCode: string, path: string, payload?: unknown): Promise<MangofyPayment> {
  if (!apiKey || !storeCode) throw new Error("Mangofy: chave API e Store Code não configurados");
  const response = await fetch(`${MANGOFY_BASE_URL}${path}`, {
    method: payload ? "POST" : "GET",
    headers: { Authorization: apiKey, "Store-Code": storeCode, "Content-Type": "application/json", Accept: "application/json" },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  // Provider responses can echo credentials: never log or return raw error bodies.
  if (!response.ok) {
    const message = response.status === 401 || response.status === 403 ? "Verifique a chave API e o Store Code" :
      response.status === 422 ? "Dados do pagamento recusados pela Mangofy" : "A Mangofy não conseguiu processar a solicitação";
    throw new Error(`Mangofy [${response.status}]: ${message}`);
  }
  const data = await response.json();
  if (!data || typeof data.payment_code !== "string" || typeof data.external_code !== "string" ||
      typeof data.payment_status !== "string" || !Number.isInteger(data.payment_amount)) {
    throw new Error("Mangofy retornou dados de pagamento inválidos");
  }
  return data as MangofyPayment;
}