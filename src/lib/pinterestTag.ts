import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    pintrk?: ((...args: unknown[]) => void) & { queue?: unknown[]; version?: string };
  }
}

let initialized = false;

function ensureStub() {
  if (window.pintrk) return;
  const n = function (...args: unknown[]) {
    n.queue.push(args);
  } as NonNullable<Window["pintrk"]>;
  n.queue = [];
  n.version = "3.0";
  window.pintrk = n;
}

function injectScript() {
  if (document.querySelector('script[src="https://s.pinimg.com/ct/core.js"]')) return;
  const t = document.createElement("script");
  t.async = true;
  t.src = "https://s.pinimg.com/ct/core.js";
  const r = document.getElementsByTagName("script")[0];
  r?.parentNode?.insertBefore(t, r);
}

/**
 * Loads the Pinterest Tag for every active tag ID saved in the admin
 * (tabela pinterest_tags) and fires a page visit event.
 */
export async function initPinterestTags() {
  if (initialized) return;
  initialized = true;
  try {
    const { data, error } = await (supabase as any)
      .from("pinterest_tags")
      .select("tag_id")
      .eq("is_active", true);
    if (error || !data || data.length === 0) return;

    ensureStub();
    injectScript();
    for (const row of data as { tag_id: string }[]) {
      window.pintrk!("load", row.tag_id);
    }
    window.pintrk!("page");
  } catch (e) {
    console.error("Pinterest tag init failed:", e);
  }
}

/** Fires a Pinterest event (ex: 'checkout', 'addtocart') on all loaded tags. */
export function trackPinterestEvent(event: string, data?: Record<string, unknown>) {
  try {
    if (window.pintrk) window.pintrk("track", event, data);
  } catch {}
}
