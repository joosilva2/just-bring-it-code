/**
 * useExitIntent – detects real exit intent on desktop & mobile.
 *
 * Desktop: mouse leaves through the top of the viewport (with 300ms debounce).
 * Mobile:  visibility change (tab switch) OR rapid scroll-up (abandonment signal).
 *
 * Guards:
 *  - Won't fire in the first 10 seconds.
 *  - Won't fire until user has interacted (scroll / click / mousemove).
 *  - Won't fire on excluded routes (/checkout, /pix, /nfe, /obrigado).
 *  - Fires at most once per session (controlled via sessionStorage).
 */

import { useEffect, useRef, useCallback } from "react";

// ── Storage keys ──────────────────────────────────────────────
export const EXIT_STORAGE = {
  SHOWN: "exit_popup_shown",       // popup was displayed
  CLOSED: "exit_popup_closed",     // user explicitly closed
  CONVERTED: "exit_popup_converted", // user clicked CTA
} as const;

// Routes where we never show the popup
const EXCLUDED_ROUTES = ["/checkout", "/pix", "/nfe", "/obrigado", "/admin", "/resultados"];

/** Returns true if the popup should be permanently suppressed this session */
export function isPopupSuppressed(): boolean {
  return (
    sessionStorage.getItem(EXIT_STORAGE.SHOWN) === "true" ||
    sessionStorage.getItem(EXIT_STORAGE.CLOSED) === "true" ||
    sessionStorage.getItem(EXIT_STORAGE.CONVERTED) === "true"
  );
}

export function markPopupShown() {
  sessionStorage.setItem(EXIT_STORAGE.SHOWN, "true");
}
export function markPopupClosed() {
  sessionStorage.setItem(EXIT_STORAGE.CLOSED, "true");
}
export function markPopupConverted() {
  sessionStorage.setItem(EXIT_STORAGE.CONVERTED, "true");
}

interface UseExitIntentOptions {
  onTrigger: () => void;
  /** If set, popup auto-fires after this many ms on the page (no interaction required). */
  autoTriggerMs?: number;
  /** Routes (exact match) where autoTriggerMs is allowed. Defaults to ["/"]. */
  autoTriggerRoutes?: string[];
}

export default function useExitIntent({ onTrigger, autoTriggerMs, autoTriggerRoutes = ["/"] }: UseExitIntentOptions) {
  const hasInteracted = useRef(false);
  const minTimeElapsed = useRef(false);
  const desktopTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canTrigger = useCallback((): boolean => {
    // Already shown / closed / converted
    if (isPopupSuppressed()) return false;
    // Not enough time on page
    if (!minTimeElapsed.current) return false;
    // No interaction yet
    if (!hasInteracted.current) return false;
    // Excluded route
    if (EXCLUDED_ROUTES.some((r) => window.location.pathname.startsWith(r))) return false;
    return true;
  }, []);

  // Auto-trigger by timer (no interaction required), only on whitelisted routes
  const canAutoTrigger = useCallback((): boolean => {
    if (isPopupSuppressed()) return false;
    if (EXCLUDED_ROUTES.some((r) => window.location.pathname.startsWith(r))) return false;
    if (!autoTriggerRoutes.includes(window.location.pathname)) return false;
    return true;
  }, [autoTriggerRoutes]);

  const safeTrigger = useCallback(() => {
    if (!canTrigger()) return;
    markPopupShown();
    onTrigger();
  }, [canTrigger, onTrigger]);

  useEffect(() => {
    // ── 10-second protection timer ─────────────────────────
    const timer = setTimeout(() => {
      minTimeElapsed.current = true;
    }, 10_000);

    // ── Auto-trigger by timer (homepage / whitelisted routes) ──
    let autoTimer: ReturnType<typeof setTimeout> | null = null;
    if (autoTriggerMs && autoTriggerMs > 0) {
      autoTimer = setTimeout(() => {
        if (!canAutoTrigger()) return;
        markPopupShown();
        onTrigger();
      }, autoTriggerMs);
    }

    // ── Interaction tracking ───────────────────────────────
    const markInteraction = () => {
      hasInteracted.current = true;
    };
    window.addEventListener("scroll", markInteraction, { passive: true, once: true });
    window.addEventListener("click", markInteraction, { once: true });
    window.addEventListener("mousemove", markInteraction, { once: true });
    window.addEventListener("touchstart", markInteraction, { passive: true, once: true });

    // ── Desktop: mouse leaves top of viewport ──────────────
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY > 5) return; // only top edge
      if (desktopTimeout.current) return; // already scheduled
      // 300ms debounce to avoid false positives
      desktopTimeout.current = setTimeout(() => {
        desktopTimeout.current = null;
        safeTrigger();
      }, 300);
    };
    const handleMouseEnter = () => {
      // Cancel if user came back quickly
      if (desktopTimeout.current) {
        clearTimeout(desktopTimeout.current);
        desktopTimeout.current = null;
      }
    };
    document.documentElement.addEventListener("mouseleave", handleMouseLeave);
    document.documentElement.addEventListener("mouseenter", handleMouseEnter);

    // ── Mobile: visibility change (tab switch) ─────────────
    const handleVisibility = () => {
      if (document.visibilityState !== "hidden") return;
      // Show when they come back
      const onVisible = () => {
        if (document.visibilityState === "visible") {
          safeTrigger();
          document.removeEventListener("visibilitychange", onVisible);
        }
      };
      if (canTrigger()) {
        document.addEventListener("visibilitychange", onVisible);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // (gatilho de scroll rápido pra cima removido — disparava sem o lead querer sair)


    // ── Mobile: back button (popstate) ─────────────────────
    // Push a dummy state so pressing back triggers popstate instead of leaving
    const currentPath = window.location.pathname + window.location.search;
    window.history.pushState({ exitGuard: true }, "", currentPath);
    const handlePopState = (e: PopStateEvent) => {
      if (canTrigger()) {
        // Re-push state so they don't actually leave
        window.history.pushState({ exitGuard: true }, "", currentPath);
        safeTrigger();
      }
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      clearTimeout(timer);
      if (autoTimer) clearTimeout(autoTimer);
      if (desktopTimeout.current) clearTimeout(desktopTimeout.current);
      document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
      document.documentElement.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("popstate", handlePopState);
      // Clean up interaction listeners (they're `once` so may already be gone)
      window.removeEventListener("scroll", markInteraction);
      window.removeEventListener("click", markInteraction);
      window.removeEventListener("mousemove", markInteraction);
      window.removeEventListener("touchstart", markInteraction);
    };
  }, [safeTrigger, canTrigger, canAutoTrigger, autoTriggerMs, onTrigger]);
}
