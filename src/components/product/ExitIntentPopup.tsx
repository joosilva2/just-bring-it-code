/**
 * ExitIntentPopup – coupon popup shown on real exit intent.
 */

import { useState, useEffect, useCallback } from "react";
import { X, Gift, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import flexV2pretos from "@/assets/flex-variant-2pretos.png";
import flexV2brancos from "@/assets/flex-variant-2brancos.png";
import flexV1cada from "@/assets/flex-variant-1cada.png";
import useExitIntent, { markPopupClosed, markPopupConverted } from "@/hooks/useExitIntent";

const COUPON_CODE = "VOLTA25";
const TIMER_SECONDS = 300; // 5 minutes

type VariantValue = "2pretos" | "2brancos" | "1cada";

const variants: { value: VariantValue; label: string; image: string }[] = [
  { value: "2pretos", label: "2 Pretos", image: flexV2pretos },
  { value: "2brancos", label: "2 Brancos", image: flexV2brancos },
  { value: "1cada", label: "1 Preto e 1 Branco", image: flexV1cada },
];

const ExitIntentPopup = () => {
  const [show, setShow] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<VariantValue | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  // ── Exit intent detection ────────────────────────────────
  const handleTrigger = useCallback(() => {
    setShow(true);
  }, []);

  useExitIntent({ onTrigger: handleTrigger });

  // Dispara a promoção quando o usuário volta do /checkout (clicou em voltar no iPhone).
  useEffect(() => {
    try {
      const cameFromCheckout = sessionStorage.getItem("visited_checkout") === "true";
      if (!cameFromCheckout) return;
      sessionStorage.removeItem("visited_checkout");
      if (
        sessionStorage.getItem("exit_popup_closed") === "true" ||
        sessionStorage.getItem("exit_popup_converted") === "true"
      ) return;
      sessionStorage.setItem("exit_popup_shown", "true");
      setShow(true);
    } catch {}
  }, []);

  // ── Countdown timer ──────────────────────────────────────
  useEffect(() => {
    if (!show) return;
    setTimeLeft(TIMER_SECONDS);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [show]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressPercent = (timeLeft / TIMER_SECONDS) * 100;

  // ── Handlers ─────────────────────────────────────────────
  const handleClose = () => {
    markPopupClosed();
    setShow(false);
    setSelectedVariant(null);
  };

  const handleCopyCoupon = async () => {
    try {
      await navigator.clipboard.writeText(COUPON_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = COUPON_CODE;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGoToCheckout = () => {
    if (!selectedVariant) return;
    markPopupConverted();
    sessionStorage.setItem("exit_coupon_applied", COUPON_CODE);
    setShow(false);
    navigate("/checkout", { state: { color: selectedVariant } });
  };

  if (!show) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={handleClose}
      />

      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-sm pointer-events-auto rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          <div className="h-1.5 bg-gradient-to-r from-destructive via-red-400 to-orange-400" />

          <div className="bg-white px-5 pt-4 pb-5">
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Fechar"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <Gift className="h-7 w-7 text-destructive" strokeWidth={1.8} />
              </div>
            </div>

            <h2 className="text-lg font-extrabold text-foreground text-center leading-tight mb-1">
              Espere! Antes de sair 🎁
            </h2>
            <p className="text-xs text-muted-foreground text-center mb-3">
              Pegue seu <span className="font-bold text-destructive">cupom de desconto exclusivo</span>!
            </p>

            <div className="bg-red-50 border-2 border-dashed border-destructive/30 rounded-xl p-3 mb-3">
              <p className="text-[10px] text-muted-foreground text-center mb-1.5 uppercase tracking-wide font-semibold">
                Cupom de desconto
              </p>

              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-black tracking-widest text-destructive">
                  {COUPON_CODE}
                </span>
                <button
                  onClick={handleCopyCoupon}
                  className="p-1.5 rounded-lg bg-white border border-destructive/20 hover:bg-red-100 transition-colors"
                  aria-label="Copiar cupom"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-destructive" />
                  )}
                </button>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-1.5 mb-2">
                <span className="font-bold text-foreground">25% OFF</span> na sua compra
              </p>

              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <span className="text-xs font-semibold text-destructive">⏳ Expira em</span>
                <span className="text-sm font-black text-destructive tabular-nums">
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-destructive/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-destructive transition-all duration-1000 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <p className="text-xs font-semibold text-foreground text-center mb-2">
              Escolha a cor e vá direto pro checkout:
            </p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {variants.map((v) => (
                <button
                  key={v.value}
                  onClick={() => setSelectedVariant(v.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition-all ${
                    selectedVariant === v.value
                      ? "border-destructive bg-red-50 scale-[1.02]"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-white">
                    <img src={v.image} alt={v.label} className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[10px] font-medium text-gray-700 text-center leading-tight">
                    {v.label}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={handleGoToCheckout}
              disabled={!selectedVariant}
              className={`w-full rounded-full py-3 text-sm font-bold transition-colors active:scale-[0.98] ${
                selectedVariant
                  ? "text-destructive-foreground bg-destructive hover:bg-red-600"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Aproveitar desconto 🔥
            </button>

            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Válido por tempo limitado. Não perca!
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExitIntentPopup;
