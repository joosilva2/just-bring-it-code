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
      <div className="bg-[#ED7E2D] px-5 py-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-5 flex-1">
            <div className="flex items-start gap-1.5">
              <Zap className="h-4 w-4 text-yellow-300 fill-yellow-300 mt-0.5 flex-shrink-0" />
              <span className="text-[15px] font-extrabold text-white uppercase leading-[1.05] tracking-tight">
                Pague 1<br />Leve 2
              </span>
            </div>
            <div className="flex items-start gap-1.5">
              <Zap className="h-4 w-4 text-yellow-300 fill-yellow-300 mt-0.5 flex-shrink-0" />
              <span className="text-[15px] font-extrabold text-white uppercase leading-[1.05] tracking-tight">
                Promoção<br />Relâmpago
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="bg-[#7A3A12] text-white text-[13px] font-bold px-2 py-1 rounded-md tabular-nums min-w-[28px] text-center">
              {pad(timeLeft.hours)}
            </span>
            <span className="text-white text-sm font-bold">:</span>
            <span className="bg-[#7A3A12] text-white text-[13px] font-bold px-2 py-1 rounded-md tabular-nums min-w-[28px] text-center">
              {pad(timeLeft.minutes)}
            </span>
            <span className="text-white text-sm font-bold">:</span>
            <span className="bg-[#7A3A12] text-white text-[13px] font-bold px-2 py-1 rounded-md tabular-nums min-w-[28px] text-center">
              {pad(timeLeft.seconds)}
            </span>
          </div>
        </div>
        <div className="flex items-baseline gap-2.5">
          <span className="text-[34px] leading-none font-extrabold text-white tracking-tight">R$ 64,20</span>
          <span className="text-base text-white/70 line-through">R$ 149,90</span>
          <span className="bg-[#7A3A12] text-white text-[13px] font-bold px-2 py-0.5 rounded-md">
            -55%
          </span>
        </div>
      </div>

      {/* Installments */}
      <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-100">
        <CreditCard className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-gray-600">
          6x de <span className="font-semibold text-gray-800">R$ 10,70</span> sem juros no cartão
        </span>
      </div>

      {/* Coupon badge */}
      <div className="px-4 pt-3 pb-2">
        <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-sm font-bold px-3 py-1.5 rounded-full">
          <Tag className="h-3.5 w-3.5" />
          Pague 1 Leve 2
        </span>
      </div>

      {/* Product title & rating */}
      <div className="px-4 pb-3">
        <h1 className="text-base font-medium text-gray-800 leading-snug mb-2">
          [PAGUE 1 LEVE 2] Armário HomeFlex de Aço Multifuncional — Organizador Resistente para Cozinha, Banheiro e Lavanderia
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
