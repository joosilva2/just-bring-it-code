import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import flexDetail1 from "@/assets/flex-product-detail1.webp";
import flexDetail2 from "@/assets/flex-product-detail2.webp";
import flexDetail3 from "@/assets/flex-product-detail3.webp";

// Hero image is served from /public so it can be preloaded in index.html
// (stable path with no Vite hash) — see <link rel="preload"> there.
const flexMain = "/flex-product-main.webp";

const images = [flexMain, flexDetail1, flexDetail2, flexDetail3];

const ProductGallery = () => {
  const [current, setCurrent] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    dragging: false,
    startX: 0,
    currentX: 0,
    width: 0,
    startIndex: 0,
  });
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(0); // 0 false, 1 true (number for transition control)

  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(images.length - 1, i));
    setCurrent(clamped);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const width = containerRef.current?.offsetWidth ?? 0;
    dragState.current = {
      dragging: true,
      startX: e.clientX,
      currentX: e.clientX,
      width,
      startIndex: current,
    };
    setIsDragging(1);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.dragging) return;
    dragState.current.currentX = e.clientX;
    let delta = e.clientX - dragState.current.startX;
    // resistance at edges
    if (
      (current === 0 && delta > 0) ||
      (current === images.length - 1 && delta < 0)
    ) {
      delta = delta * 0.3;
    }
    setDragOffset(delta);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragState.current.dragging) return;
    const delta = dragState.current.currentX - dragState.current.startX;
    const width = dragState.current.width || 1;
    const threshold = width * 0.18;
    let next = dragState.current.startIndex;
    if (delta < -threshold) next = Math.min(images.length - 1, next + 1);
    else if (delta > threshold) next = Math.max(0, next - 1);
    dragState.current.dragging = false;
    setIsDragging(0);
    setDragOffset(0);
    setCurrent(next);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const translatePct = -current * 100;
  const translatePx = dragOffset;

  return (
    <div className="relative bg-white z-10">
      {/* Main image carousel */}
      <div
        ref={containerRef}
        className="aspect-square w-full overflow-hidden relative touch-pan-y select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          ref={trackRef}
          className="flex h-full w-full"
          style={{
            transform: `translate3d(calc(${translatePct}% + ${translatePx}px), 0, 0)`,
            transition: isDragging ? "none" : "transform 350ms cubic-bezier(0.22, 1, 0.36, 1)",
            willChange: "transform",
          }}
        >
          {images.map((img, i) => (
            <div key={i} className="h-full w-full flex-shrink-0">
              <img
                src={img}
                alt={`Armário HomeFlex ${i + 1}`}
                className="h-full w-full object-contain pointer-events-none"
                draggable={false}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={i === 0 ? "high" : "auto"}
              />
            </div>
          ))}
        </div>

        {/* Prev/Next arrows */}
        <button
          onClick={() => goTo(current - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center z-10"
          aria-label="Imagem anterior"
        >
          <ChevronLeft className="h-5 w-5 text-white" />
        </button>
        <button
          onClick={() => goTo(current + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center z-10"
          aria-label="Próxima imagem"
        >
          <ChevronRight className="h-5 w-5 text-white" />
        </button>
        {/* Counter */}
        <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
          {current + 1}/{images.length}
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-14 h-14 rounded border-2 overflow-hidden flex-shrink-0 ${
              i === current ? "border-primary" : "border-transparent"
            }`}
          >
            <img src={img} alt="" className="w-full h-full object-contain" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProductGallery;
