import { describe, expect, it, vi } from "vitest";
import { buildMangofyPix, normalizeMangofyStatus, matchesMangofyOrder, requestMangofy } from "../../supabase/functions/_shared/mangofy";

const input = {
  externalRef: "ORDER-integration-test", amount: 6420, productTitle: "Armário HomeFlex", postbackUrl: "https://example.com/webhook",
  customer: { name: "Maria Teste", email: "maria@example.com", phone: "11999999999", document: { number: "52998224725" } },
  shipping: { street: "Rua Teste", number: "10", neighborhood: "Centro", city: "São Paulo", state: "SP", zipCode: "01001000" },
  clientIp: null,
};

describe("Mangofy PIX integration", () => {
  it("sends R$ 64,20 in cents as a single PIX installment", () => {
    const payment = buildMangofyPix(input);
    expect(payment.payment_amount).toBe(6420);
    expect(payment.items[0].price).toBe(6420);
    expect(payment.installments).toBe(1);
    expect(payment.payment_method).toBe("pix");
  });
  it("rejects invalid amounts before contacting Mangofy", () => {
    expect(() => buildMangofyPix({ ...input, amount: -6420 })).toThrow();
    expect(() => buildMangofyPix({ ...input, amount: 64.2 })).toThrow();
  });
  it("marks only approved payments as paid", () => {
    expect(normalizeMangofyStatus("approved")).toBe("paid");
    for (const status of ["pending", "in_process", "in_review", "gateway_error"]) expect(normalizeMangofyStatus(status)).not.toBe("paid");
  });
  it("requires provider transaction, reference and amount to match before approval", () => {
    const order = { external_ref: input.externalRef, gateway_transaction_id: "pay-test", amount: 6420 };
    const payment = { payment_code: "pay-test", external_code: input.externalRef, payment_status: "approved", payment_amount: 6420 };
    expect(matchesMangofyOrder(payment, order)).toBe(true);
    expect(matchesMangofyOrder({ ...payment, payment_amount: 500 }, order)).toBe(false);
    expect(matchesMangofyOrder({ ...payment, external_code: "another-order" }, order)).toBe(false);
    expect(matchesMangofyOrder({ ...payment, payment_code: "another-payment" }, order)).toBe(false);
  });
  it("uses both documented authentication headers and the documented endpoint", async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ payment_code: "pay-test", external_code: input.externalRef, payment_status: "pending", payment_amount: 6420 })));
    vi.stubGlobal("fetch", mock);
    try {
      await requestMangofy("test-api-value", "test-store-value", "/api/v1/payment", buildMangofyPix(input));
      expect(mock.mock.calls[0][0]).toBe("https://checkout.mangofy.com.br/api/v1/payment");
      expect(mock.mock.calls[0][1].headers.Authorization).toBe("test-api-value");
      expect(mock.mock.calls[0][1].headers["Store-Code"]).toBe("test-store-value");
    } finally { vi.unstubAllGlobals(); }
  });
});