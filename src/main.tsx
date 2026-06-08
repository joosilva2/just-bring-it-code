import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// CRITICAL: Capture UTM/ttclid params from URL SYNCHRONOUSLY on first load.
// Done here (not in a per-page idle callback) so the params are saved
// to sessionStorage before any navigation or click can lose them.
try {
  const params = new URLSearchParams(window.location.search);
  const utmKeys = [
    "src", "sck", "xcod",
    "utm_source", "utm_campaign", "utm_medium", "utm_content", "utm_term",
    "utm_id", "utm_adgroup",
    "ttclid",
    "campaign_id", "adset_id", "ad_id",
    "campaign_name", "adset_name", "ad_name",
  ];
  utmKeys.forEach((key) => {
    const val = params.get(key);
    if (val) {
      sessionStorage.setItem(`tiktok_${key}`, val);
      try { localStorage.setItem(`tiktok_${key}`, val); } catch {}
    } else {
      const persisted = localStorage.getItem(`tiktok_${key}`);
      if (persisted && !sessionStorage.getItem(`tiktok_${key}`)) {
        sessionStorage.setItem(`tiktok_${key}`, persisted);
      }
    }
  });

  // COMPENSAÇÃO p/ UTM incompleto do TikTok:
  // A URL traz `utm_id` (= campaign_id) e `utm_campaign` (= nome da campanha).
  // Mapeamos esses pra campaign_id / campaign_name pra aparecerem no admin
  // mesmo sem os parâmetros nativos campaign_id/adset_id/ad_id na URL.
  const aliasMap: Array<[string, string]> = [
    ["utm_id", "campaign_id"],
    ["utm_campaign", "campaign_name"],
    ["utm_content", "ad_id"],
    ["utm_term", "ad_name"],
    ["utm_adgroup", "adset_id"],
  ];
  aliasMap.forEach(([from, to]) => {
    const src = sessionStorage.getItem(`tiktok_${from}`);
    const dstExisting = sessionStorage.getItem(`tiktok_${to}`);
    if (src && !dstExisting) {
      sessionStorage.setItem(`tiktok_${to}`, src);
      try { localStorage.setItem(`tiktok_${to}`, src); } catch {}
    }
  });

  // Captura _ttp cookie do TikTok Pixel (substitui o ttclid pra CAPI
  // quando o anúncio não passa ttclid na URL — atribui via cookie do navegador).
  try {
    const m = document.cookie.match(/(?:^|;\s*)_ttp=([^;]+)/);
    if (m) {
      const ttp = decodeURIComponent(m[1]);
      sessionStorage.setItem("tiktok_ttp", ttp);
      try { localStorage.setItem("tiktok_ttp", ttp); } catch {}
    }
  } catch {}
} catch (e) {
  console.error("UTM sync capture failed:", e);
}

// Auto-recover from stale chunk errors after a new deploy.
// When the bundle hash changes, old lazy-loaded chunks 404; reload once.
const CHUNK_RELOAD_KEY = "__chunk_reload_attempt__";
const isChunkError = (msg: string) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(msg);

const tryReload = () => {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (Date.now() - last < 10_000) return; // avoid reload loop
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    window.location.reload();
  } catch {
    window.location.reload();
  }
};

window.addEventListener("error", (e) => {
  if (e?.message && isChunkError(e.message)) tryReload();
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = e?.reason?.message || String(e?.reason || "");
  if (isChunkError(msg)) tryReload();
});

createRoot(document.getElementById("root")!).render(<App />);
