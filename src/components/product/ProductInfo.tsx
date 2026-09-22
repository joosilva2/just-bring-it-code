import { Star, Zap, CreditCard, Tag } from "lucide-react";
import { useState, useEffect } from "react";

const ProductInfo = () => {
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 42, seconds: 54 });

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

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="bg-white">
      {/* Flash sale banner */}
      <div className="bg-sale px-4 py-3 text-sale-foreground">
        <div className="flex items-center justify-center gap-2 whitespace-nowrap text-center">
          <Zap className="h-5 w-5 flex-shrink-0 fill-sale-accent text-sale-accent" />
          <span className="font-heading text-lg font-extrabold uppercase leading-tight tracking-normal">
            Pague 1 e Leve 2
          </span>
          <Zap className="h-5 w-5 flex-shrink-0 fill-sale-accent text-sale-accent" />
        </div>

        <div className="mt-2 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-center">
          <span className="font-price text-[34px] font-extrabold leading-none tracking-normal">R$ 82,40</span>
          <span className="text-sm text-sale-foreground/75 line-through">R$ 149,90</span>
          <span className="rounded-md bg-sale-strong px-2 py-0.5 text-[13px] font-bold">
            -45%
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-sale-foreground/25 pt-2">
          <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
            <Zap className="h-4 w-4 flex-shrink-0 fill-sale-accent text-sale-accent" />
            <span className="text-xs font-bold uppercase leading-none">Promoção relâmpago</span>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1" aria-label="Tempo restante da promoção">
            <span className="min-w-[30px] rounded-md bg-sale-strong px-1.5 py-1 text-center text-[13px] font-bold tabular-nums">
              {pad(timeLeft.hours)}
            </span>
            <span className="text-sm font-bold">:</span>
            <span className="min-w-[30px] rounded-md bg-sale-strong px-1.5 py-1 text-center text-[13px] font-bold tabular-nums">
              {pad(timeLeft.minutes)}
            </span>
            <span className="text-sm font-bold">:</span>
            <span className="min-w-[30px] rounded-md bg-sale-strong px-1.5 py-1 text-center text-[13px] font-bold tabular-nums">
              {pad(timeLeft.seconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Installments */}
      <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-100">
        <CreditCard className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-600">
          6x de <span className="font-semibold text-gray-800">R$ 13,73</span> sem juros no cartão
        </span>
      </div>

      {/* Coupon badge */}
      <div className="px-4 pt-3 pb-2">
        <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-sm font-bold px-3 py-1.5 rounded-full">
          <Tag className="h-3.5 w-3.5" />
          Pague 1 e Leve 2
        </span>
      </div>

      {/* Product title & rating */}
      <div className="px-4 pb-3">
        <h1 className="text-base font-medium text-gray-800 leading-snug mb-2">
          [PAGUE 1 E LEVE 2] Armário HomeFlex de Aço Multifuncional — Organizador Resistente para Cozinha, Banheiro e Lavanderia
        </h1>
        <div className="flex items-center gap-2 mb-1">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-semibold text-gray-800">4.8</span>
          <span className="text-sm text-gray-400">(327)</span>
          <span className="text-sm text-gray-400">•</span>
          <span className="text-sm text-gray-500">5.821 vendidos</span>
        </div>
        <span className="text-xs text-orange-500 font-medium">
          1.4K+ pessoas compraram nos últimos 3 dias
        </span>
      </div>
    </div>
  );
};

export default ProductInfo;
