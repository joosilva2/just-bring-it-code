import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, MessageCircle, ShoppingCart, X } from "lucide-react";
import { trackClick } from "@/lib/tracking";
import { prefetchCheckout } from "@/lib/prefetchCheckout";
import ChatWidget from "@/components/product/ChatWidget";
import flexV2pretos from "@/assets/flex-variant-2pretos.png";
import flexV2brancos from "@/assets/flex-variant-2brancos.png";
import flexV1cada from "@/assets/flex-variant-1cada.png";
import { Button } from "@/components/ui/button";

type VariantValue = "2pretos" | "2brancos" | "1cada";

const variants: { value: VariantValue; label: string; image: string }[] = [
  { value: "2pretos", label: "2 Pretos", image: flexV2pretos },
  { value: "2brancos", label: "2 Brancos", image: flexV2brancos },
  { value: "1cada", label: "1 Preto e 1 Branco", image: flexV1cada },
];

const BuyButton = ({ inline = false }: { inline?: boolean }) => {
  const navigate = useNavigate();
  const [showColors, setShowColors] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<VariantValue | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const handleBuyClick = () => {
    prefetchCheckout();
    setShowColors(true);
  };
  const handleSelect = (v: VariantValue) => {
    prefetchCheckout();
    setSelectedVariant(v);
  };

  const handleConfirmPurchase = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedVariant) return;
    trackClick("comprar_agora", selectedVariant);
    navigate("/checkout", { state: { color: selectedVariant } });
    setShowColors(false);
    setSelectedVariant(null);
  };

  const handleClose = () => {
    setShowColors(false);
    setSelectedVariant(null);
  };

  return (
    <>
      <ChatWidget open={chatOpen} onClose={() => setChatOpen(false)} />
      {showColors && <div className="fixed inset-0 z-50 bg-black/50" onClick={handleClose} />}

      {showColors && (
        <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white p-5 shadow-2xl animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800">Escolha a variante</h3>
            <button onClick={handleClose}>
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {variants.map((v) => (
              <button
                key={v.value}
                onClick={() => handleSelect(v.value)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-2 transition-colors ${
                  selectedVariant === v.value
                    ? "border-primary bg-red-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="w-full aspect-square rounded-lg overflow-hidden bg-white">
                  <img src={v.image} alt={v.label} className="w-full h-full object-contain" />
                </div>
                <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">
                  {v.label}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={handleConfirmPurchase}
            disabled={!selectedVariant}
            className={`w-full rounded-full py-3 text-sm font-bold text-white transition-colors ${
              selectedVariant ? "bg-primary hover:bg-red-600" : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            Comprar agora
          </button>
        </div>
      )}

      {inline ? (
        <div className="hidden md:block px-4 py-3">
          <Button onClick={handleBuyClick} className="w-full rounded h-11 gap-2 text-sm font-semibold"><ShoppingCart className="h-4 w-4" />Comprar agora</Button>
        </div>
      ) : (
      <div className="storefront-buybar fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border md:hidden">
        <div className="flex items-center h-16">
          <div className="flex items-center">
            <button className="flex flex-col items-center justify-center w-14 h-14 text-gray-500">
              <Home className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">Loja</span>
            </button>
            <button onClick={() => setChatOpen(true)} className="flex flex-col items-center justify-center w-14 h-14 text-gray-500 active:text-red-500">
              <MessageCircle className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">Chat</span>
            </button>
          </div>

          <div className="flex flex-1 items-center gap-2 px-2">
            <button
              onClick={handleBuyClick}
              aria-label="Carrinho"
              className="flex items-center justify-center w-9 h-9 text-destructive flex-shrink-0"
            >
              <ShoppingCart className="h-6 w-6" />
            </button>
            <button
              onClick={handleBuyClick}
              className="flex-1 flex items-center justify-center rounded-md border border-primary py-2.5 text-xs font-bold text-primary leading-tight text-center transition-colors active:bg-accent"
            >
              Adicionar ao<br />carrinho
            </button>
            <button
              onClick={handleBuyClick}
              className="flex-1 flex items-center justify-center rounded-md bg-primary py-2.5 text-xs font-bold text-primary-foreground uppercase leading-tight text-center transition-colors active:bg-primary/90"
            >
              COMPRAR<br />AGORA
            </button>
          </div>
        </div>
      </div>
      )}
    </>
  );
};

export default BuyButton;
