import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    TiktokAnalyticsObject?: string;
    ttq?: any;
  }
}

const loadedPixels = new Set<string>();
const CACHE_KEY = 'tiktok_pixel_cache';
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

const readTtpCookie = () => {
  try {
    const match = document.cookie.match(/(?:^|;\s*)_ttp=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
};

const persistTtpCookie = () => {
  const ttp = readTtpCookie();
  if (!ttp) return null;
  try {
    sessionStorage.setItem('tiktok_ttp', ttp);
    localStorage.setItem('tiktok_ttp', ttp);
  } catch {}
  return ttp;
};

type TikTokProductPayload = {
  contentId?: string;
  contentName?: string;
  quantity?: number;
};

const DEFAULT_PRODUCT: Required<TikTokProductPayload> = {
  contentId: 'armario-homeflex',
  contentName: 'Armário HomeFlex de Aço Multifuncional',
  quantity: 1,
};

const getTikTokProductPayload = (product?: TikTokProductPayload) => ({
  content_id: product?.contentId || DEFAULT_PRODUCT.contentId,
  content_name: product?.contentName || DEFAULT_PRODUCT.contentName,
  content_type: 'product',
  quantity: product?.quantity || DEFAULT_PRODUCT.quantity,
});

// Capture UTM/UTMify params from URL and store in sessionStorage
export const captureUtmParams = () => {
  const params = new URLSearchParams(window.location.search);
  const utmKeys = ['src', 'sck', 'utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term', 'ttclid', 'campaign_id', 'adset_id', 'ad_id', 'campaign_name', 'adset_name', 'ad_name'];
  utmKeys.forEach(key => {
    const val = params.get(key);
    if (val) sessionStorage.setItem(`tiktok_${key}`, val);
  });
  persistTtpCookie();
};

export const getStoredUtmParams = () => {
  const keys = ['src', 'sck', 'utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term', 'ttclid', 'campaign_id', 'adset_id', 'ad_id', 'campaign_name', 'adset_name', 'ad_name'];
  const result: Record<string, string | null> = {};
  keys.forEach(key => {
    result[key] = sessionStorage.getItem(`tiktok_${key}`) || null;
  });
  result.ttp = sessionStorage.getItem('tiktok_ttp') || localStorage.getItem('tiktok_ttp') || readTtpCookie();
  return result;
};

// Load TikTok Pixel base script
const loadTikTokBaseScript = () => {
  if (window.ttq) return;
  
  const initPixelScript = (w: any, d: any, t: any) => {
    w.TiktokAnalyticsObject = t;
    const ttq = w[t] = w[t] || [];
    ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
    ttq.setAndDefer = function (t: any, e: any) {
      t[e] = function () {
        t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function (tid: any) {
      const inst = ttq._i[tid] || [];
      for (let n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(inst, ttq.methods[n]);
      return inst;
    };
    ttq.load = function (e: any, n?: any) {
      const r = "https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i = ttq._i || {};
      ttq._i[e] = [];
      ttq._i[e]._u = r;
      ttq._t = ttq._t || {};
      ttq._t[e] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[e] = n || {};
      const o = d.createElement("script");
      o.type = "text/javascript";
      o.async = true;
      o.src = r + "?sdkid=" + e + "&lib=" + t;
      const a = d.getElementsByTagName("script")[0];
      a.parentNode.insertBefore(o, a);
    };
  };
  initPixelScript(window, document, "ttq");
};

type PixelConfig = { pixel_id: string; track_pending: boolean; track_paid: boolean };

const normalizePixelConfigs = (pixels: PixelConfig[]): PixelConfig[] => {
  const uniquePixels = new Map<string, PixelConfig>();

  pixels.forEach((pixel) => {
    if (!pixel?.pixel_id) return;

    const existing = uniquePixels.get(pixel.pixel_id);
    uniquePixels.set(pixel.pixel_id, {
      pixel_id: pixel.pixel_id,
      track_pending: Boolean(existing?.track_pending || pixel.track_pending),
      track_paid: Boolean(existing?.track_paid || pixel.track_paid),
    });
  });

  return Array.from(uniquePixels.values());
};

// Get cached pixels or null if expired
const getCachedPixels = (): PixelConfig[] | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { pixels, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return normalizePixelConfigs(pixels || []);
  } catch { return null; }
};

const setCachedPixels = (pixels: PixelConfig[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ pixels: normalizePixelConfigs(pixels), ts: Date.now() }));
  } catch {}
};

const initPixelsFromConfigs = (pixels: PixelConfig[]) => {
  const normalizedPixels = normalizePixelConfigs(pixels);
  loadTikTokBaseScript();
  normalizedPixels.forEach(p => {
    if (!loadedPixels.has(p.pixel_id)) {
      window.ttq?.load(p.pixel_id);
      loadedPixels.add(p.pixel_id);
    }
  });
  window.ttq?.page();
  sessionStorage.setItem('tiktok_pixel_configs', JSON.stringify(normalizedPixels));
};

// Load all active pixels - uses cache first, refreshes in background
export const initTikTokPixels = async () => {
  captureUtmParams();
  persistTtpCookie();

  // 1. Try cache first for instant init
  const cached = getCachedPixels();
  if (cached?.length) {
    initPixelsFromConfigs(cached);
  }

  // 2. Fetch fresh from DB (in background if cache hit, blocking if not)
  try {
    const { data: pixels } = await (supabase as any)
      .from("tiktok_pixels_public")
      .select("pixel_id, track_pending, track_paid");


    if (pixels?.length) {
      const normalizedPixels = normalizePixelConfigs(pixels);
      setCachedPixels(normalizedPixels);
      if (!cached?.length) {
        // No cache was available, init now
        initPixelsFromConfigs(normalizedPixels);
      } else {
        // Update session config with fresh data
        sessionStorage.setItem('tiktok_pixel_configs', JSON.stringify(normalizedPixels));
      }
    }
  } catch (err) {
    console.error('TikTok Pixel init error:', err);
    // If no cache and fetch failed, nothing to do
  }

  window.setTimeout(() => persistTtpCookie(), 800);
  window.setTimeout(() => persistTtpCookie(), 2500);
};

// Get stored pixel configs
const getPixelConfigs = (): PixelConfig[] => {
  try {
    return normalizePixelConfigs(JSON.parse(sessionStorage.getItem('tiktok_pixel_configs') || '[]'));
  } catch { return []; }
};

// Fire TikTok event only for pixels that match the condition
export const fireTikTokEvent = (eventName: string, status: 'pending' | 'paid', data?: Record<string, any>, options?: { eventId?: string }) => {
  const configs = getPixelConfigs();
  configs.forEach(config => {
    const shouldFire = (status === 'pending' && config.track_pending) || (status === 'paid' && config.track_paid);
    if (shouldFire && window.ttq) {
      const trackOptions = options?.eventId ? { event_id: options.eventId } : undefined;
      if (trackOptions) window.ttq.instance(config.pixel_id).track(eventName, data || {}, trackOptions);
      else window.ttq.instance(config.pixel_id).track(eventName, data || {});
    }
  });
};

// Identify user for better attribution / EMQ
export const identifyTikTokUser = (email?: string, phone?: string, externalId?: string) => {
  if (!window.ttq) return;
  const identifyData: Record<string, string> = {};
  if (email) identifyData.email = email;
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    const e164 = digits.startsWith('55') ? `+${digits}` : `+55${digits}`;
    identifyData.phone_number = e164;
  }
  if (externalId) identifyData.external_id = externalId;
  if (Object.keys(identifyData).length > 0) {
    try { window.ttq.identify(identifyData); } catch {}
    // Also identify per-instance
    try {
      const configs = JSON.parse(sessionStorage.getItem('tiktok_pixel_configs') || '[]');
      configs.forEach((c: any) => {
        try { window.ttq.instance(c.pixel_id).identify(identifyData); } catch {}
      });
    } catch {}
  }
};

// Specific events
export const trackInitiateCheckout = (value: number, currency = 'BRL', eventId?: string, product?: TikTokProductPayload) => {
  const fire = () => {
    const configs = getPixelConfigs();
    const payload = { value: value / 100, currency, ...getTikTokProductPayload(product) };
    const opts = eventId ? { event_id: eventId } : undefined;
    if (configs.length && window.ttq) {
      configs.forEach(c => {
        try {
          if (opts) window.ttq.instance(c.pixel_id).track('InitiateCheckout', payload, opts);
          else window.ttq.instance(c.pixel_id).track('InitiateCheckout', payload);
        } catch {}
      });
    } else if (window.ttq) {
      if (opts) window.ttq.track('InitiateCheckout', payload, opts);
      else window.ttq.track('InitiateCheckout', payload);
    }
  };
  let tries = 0;
  const wait = () => {
    const configs = getPixelConfigs();
    if (window.ttq && configs.length) { fire(); return; }
    if (tries++ >= 25) { if (window.ttq) fire(); return; }
    setTimeout(wait, 200);
  };
  wait();
};

export const trackPlaceOrder = (value: number, currency = 'BRL') => {
  fireTikTokEvent('PlaceAnOrder', 'pending', { value: value / 100, currency, ...getTikTokProductPayload() });
};

export const trackCompletePayment = (value: number, currency = 'BRL', eventId?: string, product?: TikTokProductPayload) => {
  fireTikTokEvent('CompletePayment', 'paid', { value: value / 100, currency, ...getTikTokProductPayload(product) }, { eventId });
};

export const trackCompletePaymentAsync = async (value: number, currency = 'BRL', eventId?: string, product?: TikTokProductPayload) => {
  let tries = 0;

  return await new Promise<void>((resolve) => {
    const attempt = () => {
      const configs = getPixelConfigs();
      if (window.ttq && configs.length) {
        trackCompletePayment(value, currency, eventId, product);
        setTimeout(resolve, 150);
        return;
      }

      if (tries++ >= 25) {
        if (window.ttq) {
          trackCompletePayment(value, currency, eventId, product);
          setTimeout(resolve, 150);
          return;
        }

        resolve();
        return;
      }

      setTimeout(attempt, 120);
    };

    attempt();
  });
};
