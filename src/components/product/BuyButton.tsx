import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, X } from "lucide-react";
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

const BuyButton = () => {
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
            <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Fechar seleção">
              <X className="h-5 w-5 text-gray-400" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {variants.map((v) => (
              <Button
                variant="outline"
                key={v.value}
                onClick={() => handleSelect(v.value)}
                className={`h-auto whitespace-normal flex flex-col items-center gap-2 rounded-xl border-2 p-2 transition-colors ${
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
              </Button>
            ))}
          </div>
          <Button
            onClick={handleConfirmPurchase}
            disabled={!selectedVariant}
            className={`w-full h-auto rounded-full py-3 text-sm font-bold transition-colors ${
              selectedVariant ? "bg-primary hover:bg-red-600" : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            Comprar agora
          </Button>
        </div>
      )}

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-2 h-16 px-3 max-w-md mx-auto">
            <Button variant="ghost" onClick={() => setChatOpen(true)} className="h-11 w-16 flex-col gap-0.5 text-muted-foreground">
              <MessageCircle className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">Chat</span>
            </Button>
            <Button
              onClick={handleBuyClick}
              className="flex-1 h-11 rounded-md bg-destructive text-destructive-foreground text-sm font-bold uppercase tracking-normal active:bg-destructive/90"
            >
              Comprar agora
            </Button>
        </div>
      </div>
    </>
  );
};

export default BuyButton;
