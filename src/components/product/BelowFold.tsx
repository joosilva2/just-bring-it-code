import { lazy, Suspense, useEffect, useState } from "react";

const Reviews = lazy(() => import("@/components/product/Reviews"));
const StoreInfo = lazy(() => import("@/components/product/StoreInfo"));
const ProductDescription = lazy(() => import("@/components/product/ProductDescription"));
const TechSpecs = lazy(() => import("@/components/product/TechSpecs"));
const ShippingDetails = lazy(() => import("@/components/product/ShippingDetails"));
const FAQ = lazy(() => import("@/components/product/FAQ"));
const ProductFooter = lazy(() => import("@/components/product/ProductFooter"));


const Fallback = () => <div className="h-32 bg-white" />;

/**
 * Renders below-the-fold content only after the user starts scrolling
 * or after the browser is idle. Keeps the initial paint as fast as possible.
 */
const BelowFold = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;
      setShow(true);
      window.removeEventListener("scroll", trigger);
      window.removeEventListener("touchstart", trigger);
      window.removeEventListener("pointerdown", trigger);
    };

    window.addEventListener("scroll", trigger, { passive: true });
    window.addEventListener("touchstart", trigger, { passive: true });
    window.addEventListener("pointerdown", trigger, { passive: true });

    // Fallback: render after browser is idle (so SEO/users on slow scroll still get content)
    const ric = (window as any).requestIdleCallback;
    const idleId = ric
      ? ric(trigger, { timeout: 2500 })
      : window.setTimeout(trigger, 1500);

    return () => {
      window.removeEventListener("scroll", trigger);
      window.removeEventListener("touchstart", trigger);
      window.removeEventListener("pointerdown", trigger);
      if (ric && (window as any).cancelIdleCallback) (window as any).cancelIdleCallback(idleId);
      else clearTimeout(idleId as number);
    };
  }, [show]);

  if (!show) return <div className="h-32 bg-white" aria-hidden />;

  return (
    <Suspense fallback={<Fallback />}>
      <Reviews />
      <div className="h-2 bg-gray-100" />
      <StoreInfo />
      <div className="h-2 bg-gray-100" />
      <ProductDescription />
      <TechSpecs />
      <div className="h-2 bg-gray-100" />
      <ShippingDetails />
      <div className="h-2 bg-gray-100" />
      <FAQ />
      <div className="h-2 bg-gray-100" />
      <ProductFooter />
    </Suspense>
  );
};

export default BelowFold;
