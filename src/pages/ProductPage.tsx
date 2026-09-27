import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Star, Zap, CreditCard, Tag, ChevronLeft, ChevronRight, Truck, Clock, MapPin, ShieldCheck, Home, MessageCircle, ShoppingCart, X, ChevronDown, ChevronUp, Package } from "lucide-react";
import { getProduct, ProductConfig } from "@/data/products";
import { trackPageView, getVisitorId } from "@/lib/tracking";
import { supabase } from "@/integrations/supabase/client";
import { initTikTokPixels } from "@/lib/tiktokPixel";
import { prefetchCheckout, prefetchCheckoutOnIdle } from "@/lib/prefetchCheckout";
import ProductHeader from "@/components/product/ProductHeader";
import ProductFooter from "@/components/product/ProductFooter";
import ChatWidget from "@/components/product/ChatWidget";

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const resolvedSlug = slug || "popozuda-cream";
  const product = getProduct(resolvedSlug);

  const [currentImage, setCurrentImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [showVariants, setShowVariants] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 11, seconds: 39 });
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!product) return;
    trackPageView(`/produto/${resolvedSlug}`);
    supabase.from("checkout_events").insert({ visitor_id: getVisitorId(), event_type: "site_visit", metadata: { product: resolvedSlug } })
      .then(({ error }) => { if (error) console.error('site_visit insert error:', error); });
    initTikTokPixels();
    prefetchCheckoutOnIdle();
  }, [slug, product]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; minutes = 59; seconds = 59; }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-100 max-w-md mx-auto flex items-center justify-center">
        <p className="text-muted-foreground">Produto não encontrado.</p>
      </div>
    );
  }

  const pad = (n: number) => n.toString().padStart(2, "0");
  const formatBRL = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleBuyClick = () => {
    prefetchCheckout();
    setShowVariants(true);
  };
  const handleVariantSelect = (value: string) => {
    prefetchCheckout();
    setSelectedVariant(value);
  };
  const handleConfirmPurchase = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedVariant) return;
    navigate("/checkout", { state: { color: selectedVariant, productSlug: resolvedSlug } });
    setShowVariants(false);
    setSelectedVariant(null);
  };
  const handleClose = () => { setShowVariants(false); setSelectedVariant(null); };

  return (
    <div className="min-h-screen bg-gray-100 max-w-md mx-auto">
      <ChatWidget open={chatOpen} onClose={() => setChatOpen(false)} />
      <ProductHeader />

      {/* Gallery */}
      <div className="relative bg-white z-10">
        <div className="aspect-square w-full overflow-hidden relative">
          <img src={product.images[currentImage]} alt={product.name} className="h-full w-full object-contain" loading={currentImage === 0 ? "eager" : "lazy"} decoding="async" fetchPriority={currentImage === 0 ? "high" : "auto"} />
          <button onClick={() => setCurrentImage((p) => (p === 0 ? product.images.length - 1 : p - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center">
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <button onClick={() => setCurrentImage((p) => (p === product.images.length - 1 ? 0 : p + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center">
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
          <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
            {currentImage + 1}/{product.images.length}
          </div>
        </div>
        <div className="flex gap-2 px-4 py-2 overflow-x-auto">
          {product.images.map((img, i) => (
            <button key={i} onClick={() => setCurrentImage(i)} className={`w-14 h-14 rounded border-2 overflow-hidden flex-shrink-0 ${i === currentImage ? "border-primary" : "border-transparent"}`}>
              <img src={img} alt="" className="w-full h-full object-contain" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      </div>

      {/* Price / Flash sale */}
      <div className="bg-white">
        <div className="bg-gradient-to-r from-[hsl(24,82%,50%)] to-[hsl(30,86%,55%)] px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-white fill-white" />
            <span className="text-xs font-bold text-white uppercase tracking-wide">Oferta Relâmpago</span>
            <div className="flex items-center gap-1 ml-1">
              {[timeLeft.hours, timeLeft.minutes, timeLeft.seconds].map((v, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-white text-xs font-bold">:</span>}
                  <span className="bg-white/20 text-white text-xs font-bold px-1.5 py-0.5 rounded">{pad(v)}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{formatBRL(product.price)}</span>
            <span className="text-sm text-white/70 line-through">{formatBRL(product.originalPrice)}</span>
            <span className="bg-white/20 text-white text-xs font-bold px-1.5 py-0.5 rounded ml-1">{product.discount}</span>
          </div>
        </div>
        <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-100">
          <CreditCard className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">{product.installments}</span>
        </div>
        <div className="px-4 py-2 border-b border-gray-100">
          <span className="inline-flex items-center gap-1.5 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            <Tag className="h-3 w-3" />Cupom Aplicado
          </span>
        </div>
        <div className="px-4 py-3">
          <h1 className="text-sm font-medium text-gray-800 leading-tight mb-2">{product.title}</h1>
          <div className="flex items-center gap-2 mb-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-semibold text-gray-800">{product.rating}</span>
            <span className="text-sm text-gray-400">({product.reviewCount.toLocaleString("pt-BR")})</span>
            <span className="text-sm text-gray-400">•</span>
            <span className="text-sm text-gray-500">{product.soldCount}</span>
          </div>
          <span className="text-xs text-orange-500 font-medium">{product.recentBuyers}</span>
        </div>
      </div>

      {/* Shipping */}
      <div className="bg-white px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <Truck className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-gray-800">Frete Grátis</span>
          <span className="text-xs text-green-600 font-medium ml-auto">Economize R$ 15,90</span>
        </div>
        <p className="text-xs text-gray-500 ml-6">Receba em 4-7 dias úteis</p>
      </div>

      <div className="h-2 bg-gray-100" />

      {/* Trust badges */}
      <div className="bg-white px-4 py-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: ShieldCheck, text: "Compra Segura" },
            { icon: Package, text: "Frete Grátis" },
            { icon: Clock, text: "4-7 dias úteis" },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex flex-col items-center gap-1 py-2">
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-[10px] text-gray-500 text-center">{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-2 bg-gray-100" />

      {/* Variants selector */}
      <div className="px-4 py-3 bg-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{product.variantLabel}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {product.variants.map((v) => (
            <button
              key={v.value}
              onClick={() => v.available && setSelectedVariant(v.value)}
              disabled={!v.available}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
                !v.available
                  ? "border-gray-100 text-gray-300 line-through cursor-not-allowed bg-gray-50"
                  : selectedVariant === v.value
                    ? "border-primary bg-red-50 text-primary"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-2 bg-gray-100" />

      {/* Store info */}
      <div className="bg-white px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
            <span className="text-lg">💖</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">{product.storeName}</p>
            <p className="text-xs text-gray-500">{product.storeFollowers} vendido(s)</p>
          </div>
        </div>
      </div>

      <div className="h-2 bg-gray-100" />

      {/* Description */}
      <div className="bg-white px-4 py-5">
        <h2 className="text-base font-bold text-foreground mb-4">Descrição do produto</h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
          {product.description.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {product.descriptionImages.map((img, i) => (
            <img key={i} src={img} alt={product.name} className="w-full rounded-lg" loading="lazy" decoding="async" />
          ))}
        </div>
      </div>

      {/* Specs */}
      <div className="px-4 py-5 bg-white">
        <h2 className="text-sm font-bold text-foreground uppercase mb-3">Especificações:</h2>
        <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
          {product.specs.map((s, i) => (
            <li key={i}><strong className="text-foreground">{s.label}:</strong> {s.value}</li>
          ))}
        </ul>
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">AVISO:</strong> {product.guarantee}
          </p>
        </div>
      </div>

      <div className="h-2 bg-gray-100" />

      {/* Shipping details */}
      <div className="bg-white px-4 py-5">
        <h2 className="text-base font-bold text-foreground mb-3">Envio e entrega</h2>
        <div className="bg-green-50 rounded-lg p-3 mb-4 flex items-center gap-3">
          <Truck className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Frete Grátis para todo o Brasil!</p>
            <p className="text-xs text-green-600">Economize R$ 15,90 no envio</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { icon: Clock, label: "Prazo de entrega", value: "4 a 7 dias úteis" },
            { icon: MapPin, label: "Rastreamento", value: "Código enviado por e-mail" },
            { icon: ShieldCheck, label: "Garantia", value: "7 dias para troca ou devolução" },
          ].map(({ icon: Icon, label, value }, i) => (
            <div key={i} className="flex items-start gap-3">
              <Icon className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
                <p className="text-xs text-gray-500">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-2 bg-gray-100" />

      {/* FAQ */}
      <div className="bg-white px-4 py-5">
        <h2 className="text-base font-bold text-foreground mb-3">Perguntas frequentes</h2>
        <div className="space-y-0">
          {product.faq.map((item, i) => (
            <div key={i} className="border-b border-gray-100 last:border-0">
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full flex items-center justify-between py-3 text-left"
              >
                <span className="text-sm font-medium text-gray-700 pr-4">{item.question}</span>
                {expandedFaq === i ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
              </button>
              {expandedFaq === i && (
                <p className="text-sm text-muted-foreground pb-3 leading-relaxed">{item.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="h-2 bg-gray-100" />
      <ProductFooter />

      {/* Buy button overlay */}
      {showVariants && <div className="fixed inset-0 z-50 bg-black/50" onClick={handleClose} />}
      {showVariants && (
        <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white p-5 shadow-2xl animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800">Escolha a opção</h3>
            <button onClick={handleClose}><X className="h-5 w-5 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {product.variants.filter(v => v.available).map((v) => (
              <button
                key={v.value}
                onClick={() => handleVariantSelect(v.value)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-colors ${selectedVariant === v.value ? "border-primary bg-red-50" : "border-gray-200 hover:border-gray-300"}`}
              >
                <div className="w-full aspect-square rounded-lg overflow-hidden bg-white">
                  <img src={product.images[0]} alt={v.label} className="w-full h-full object-contain" />
                </div>
                <span className="text-sm font-medium text-gray-700">{v.label}</span>
              </button>
            ))}
          </div>
          <button onClick={handleConfirmPurchase} disabled={!selectedVariant} className={`w-full rounded-full py-3 text-sm font-bold text-white transition-colors ${selectedVariant ? "bg-primary hover:bg-red-600" : "bg-gray-300 cursor-not-allowed"}`}>
            Comprar agora
          </button>
        </div>
      )}

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
        <div className="flex items-center h-16">
          <div className="flex items-center">
            <button className="flex flex-col items-center justify-center w-14 h-14 text-gray-500">
              <Home className="h-5 w-5" /><span className="text-[10px] mt-0.5">Loja</span>
            </button>
            <button onClick={() => setChatOpen(true)} className="flex flex-col items-center justify-center w-14 h-14 text-gray-500 active:text-red-500">
              <MessageCircle className="h-5 w-5" /><span className="text-[10px] mt-0.5">Chat</span>
            </button>
          </div>
          <div className="flex flex-1 items-center gap-2 px-2">
            <button onClick={handleBuyClick} aria-label="Carrinho" className="flex items-center justify-center w-9 h-9 text-destructive flex-shrink-0">
              <ShoppingCart className="h-6 w-6" />
            </button>
            <button onClick={handleBuyClick} className="flex-1 flex items-center justify-center rounded-md border border-destructive py-2.5 text-xs font-bold text-destructive leading-tight text-center transition-colors active:bg-red-50">
              Adicionar ao<br />carrinho
            </button>
            <button onClick={handleBuyClick} className="flex-1 flex items-center justify-center rounded-md bg-destructive py-2.5 text-xs font-bold text-white uppercase tracking-wide leading-tight text-center transition-colors active:bg-red-700">
              COMPRAR<br />AGORA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
