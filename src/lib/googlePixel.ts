import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

type GooglePixel = { pixel_id: string; conversion_label: string | null };

let initialized = false;
let loadedPixels: GooglePixel[] = [];
let readyPromise: Promise<void> | null = null;

function ensureGtag() {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function (...args: unknown[]) {
      window.dataLayer!.push(args);
    };
  }
}

function injectScript(pixelId: string) {
  const src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(pixelId)}`;
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

/**
 * Carrega todos os pixels do Google ativos (tabela google_pixels)
 * e dispara o evento de page_view.
 */
export function initGooglePixels(): Promise<void> {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    if (initialized) return;
    initialized = true;
    try {
      const { data, error } = await (supabase as any)
        .from("google_pixels")
        .select("pixel_id,conversion_label")
        .eq("is_active", true);
      if (error || !data || data.length === 0) return;

      loadedPixels = data as GooglePixel[];
      ensureGtag();
      injectScript(loadedPixels[0].pixel_id);
      window.gtag!("js", new Date());
      for (const p of loadedPixels) {
        window.gtag!("config", p.pixel_id, { send_page_view: true });
      }
    } catch (e) {
      console.error("Google pixel init failed:", e);
    }
  })();
  return readyPromise;
}

/** Dispara conversão de compra aprovada para todos os pixels do Google. */
export async function trackGooglePurchase(
  value: number,
  transactionId: string,
  currency = "BRL",
) {
  try {
    await initGooglePixels();
    if (!window.gtag || loadedPixels.length === 0) return;
    for (const p of loadedPixels) {
      const sendTo = p.conversion_label
        ? `${p.pixel_id}/${p.conversion_label}`
        : p.pixel_id;
      window.gtag("event", "conversion", {
        send_to: sendTo,
        value,
        currency,
        transaction_id: transactionId,
      });
      window.gtag("event", "purchase", {
        send_to: p.pixel_id,
        value,
        currency,
        transaction_id: transactionId,
      });
    }
  } catch (e) {
    console.error("Google purchase event failed:", e);
  }
}
