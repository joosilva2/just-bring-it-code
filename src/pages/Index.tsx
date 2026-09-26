import { useEffect, lazy, Suspense } from "react";
import ProductHeader from "@/components/product/ProductHeader";
import ProductGallery from "@/components/product/ProductGallery";
import ProductInfo from "@/components/product/ProductInfo";
import ShippingInfo from "@/components/product/ShippingInfo";
import TrustBadges from "@/components/product/TrustBadges";
import SizeSelector from "@/components/product/SizeSelector";
import QuantitySelector from "@/components/product/QuantitySelector";
import BuyButton from "@/components/product/BuyButton";
import BelowFold from "@/components/product/BelowFold";
import { trackPageView, getVisitorId } from "@/lib/tracking";
import { supabase } from "@/integrations/supabase/client";
import useVisitorPresence from "@/hooks/useVisitorPresence";
import { initTikTokPixels } from "@/lib/tiktokPixel";
import { prefetchCheckoutOnIdle } from "@/lib/prefetchCheckout";

// Mounted directly (not behind BelowFold) so the auto-trigger timer
// starts as soon as the user lands on "/", not only after they scroll.
const ExitIntentPopup = lazy(() => import("@/components/product/ExitIntentPopup"));


const Index = () => {
  useVisitorPresence();

  useEffect(() => {
    // Defer non-critical tracking until browser is idle so it doesn't block render
    const run = () => {
      trackPageView("/");
      supabase.from("checkout_events").insert({ visitor_id: getVisitorId(), event_type: "site_visit" })
        .then(({ error }) => { if (error) console.error('site_visit insert error:', error); });
      initTikTokPixels();
    };
    const ric = (window as any).requestIdleCallback;
    if (ric) ric(run, { timeout: 2000 });
    else setTimeout(run, 1);
    // Prefetch Checkout chunk while idle so navigation is instant
    prefetchCheckoutOnIdle();
  }, []);

  return (
    <div className="min-h-screen bg-commerce-canvas pb-16">
      <div className="mx-auto w-full max-w-6xl bg-commerce-surface shadow-sm lg:my-6 lg:overflow-hidden lg:rounded-md">
        <ProductHeader />
        <main>
          <section className="grid items-start lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:border-t lg:border-border">
            <div className="lg:sticky lg:top-0 lg:border-r lg:border-border">
              <ProductGallery />
            </div>
            <div>
              <ProductInfo />
              <ShippingInfo />
              <div className="h-2 bg-commerce-canvas" />
              <TrustBadges />
              <div className="h-2 bg-commerce-canvas" />
              <SizeSelector />
              <QuantitySelector />
            </div>
          </section>

          <div className="h-2 bg-commerce-canvas" />
          <div className="mx-auto w-full max-w-3xl">
            <BelowFold />
          </div>
        </main>
      </div>
      <BuyButton />
      <Suspense fallback={null}>
        <ExitIntentPopup />
      </Suspense>
    </div>
  );
};

export default Index;
