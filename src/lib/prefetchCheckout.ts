// Prefetches the Checkout route chunk so navigation feels instant.
// Safe to call multiple times — the dynamic import is cached.
let started = false;
export const prefetchCheckout = () => {
  if (started) return;
  started = true;
  // Fire-and-forget; ignore failures (offline, etc.)
  import("@/pages/Checkout").catch(() => {
    started = false;
  });
};

export const prefetchCheckoutOnIdle = () => {
  const ric = (window as any).requestIdleCallback;
  if (ric) ric(() => prefetchCheckout(), { timeout: 2500 });
  else setTimeout(prefetchCheckout, 1500);
};
