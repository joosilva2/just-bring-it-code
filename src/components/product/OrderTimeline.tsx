import { useState, useEffect, useRef } from "react";
import { CheckCircle, Package, Box, Truck, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StepData {
  icon: React.ElementType;
  label: string;
  subtitle: string;
  date: string;
  status: "done" | "warning" | "pending";
}

const OrderTimeline = ({ onAnimationComplete }: { onAnimationComplete?: () => void }) => {
  const [animatedIndex, setAnimatedIndex] = useState(-1);
  const [city, setCity] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState("");

  // Format current date/time on mount
  useEffect(() => {
    const now = new Date();
    const formatted = now.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    setEntryDate(formatted);
  }, []);

  // Get geolocation (with guard against duplicate calls)
  const locationFetched = useRef(false);
  useEffect(() => {
    if (locationFetched.current) return;
    locationFetched.current = true;
    const fetchLocation = async () => {
      try {
        const { data } = await supabase.functions.invoke("get-location");
        if (data?.city && data.city !== "Desconhecido") {
          setCity(data.city);
        }
      } catch {
        // silent
      }
    };
    fetchLocation();
  }, []);

  // Animate steps sequentially
  useEffect(() => {
    const totalSteps = 5;
    let current = -1;
    const interval = setInterval(() => {
      current++;
      setAnimatedIndex(current);
      if (current >= totalSteps - 1) {
        clearInterval(interval);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const shippingSubtitle = city
    ? `Pedido pronto para envio para ${city}`
    : "Pedido pronto para envio";

  const steps: StepData[] = [
    {
      icon: CheckCircle,
      label: "Pedido recebido",
      subtitle: `Pedido gerado em: ${entryDate}`,
      date: entryDate,
      status: "done",
    },
    {
      icon: Box,
      label: "Processando pedido",
      subtitle: "Verificando dados do pedido",
      date: entryDate,
      status: "done",
    },
    {
      icon: Package,
      label: "Separando produto",
      subtitle: "Produto sendo preparado",
      date: entryDate,
      status: "done",
    },
    {
      icon: Truck,
      label: "Pedido pronto para envio",
      subtitle: shippingSubtitle,
      date: entryDate,
      status: "done",
    },
    {
      icon: AlertCircle,
      label: "Taxa de nota fiscal",
      subtitle: "Aguardando pagamento da taxa TENF",
      date: "",
      status: "warning",
    },
  ];

  const getIconStyle = (step: StepData, index: number) => {
    if (index > animatedIndex) return "bg-gray-200 text-gray-400 scale-90 opacity-40";
    if (step.status === "warning") return "bg-red-500 text-white scale-100 opacity-100 animate-pulse";
    return "bg-green-500 text-white scale-100 opacity-100";
  };

  const getLineProgress = (index: number) => {
    if (index >= animatedIndex) return 0;
    return 100;
  };

  const isStepVisible = (index: number) => index <= animatedIndex;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="relative">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start gap-4 relative">
            {/* Animated connecting line */}
            {index < steps.length - 1 && (
              <div className="absolute left-5 top-10 w-0.5 h-14 bg-gray-200 overflow-hidden">
                <div
                  className="w-full bg-green-500 transition-all duration-700 ease-out"
                  style={{
                    height: `${getLineProgress(index)}%`,
                    transitionDelay: `${index * 1500 + 700}ms`,
                  }}
                />
              </div>
            )}

            {/* Icon circle */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${getIconStyle(step, index)}`}
              style={{ transitionDelay: `${index * 200}ms` }}
            >
              <step.icon className="h-5 w-5" />
            </div>

            {/* Step content */}
            <div
              className={`pb-7 transition-all duration-500 ${
                isStepVisible(index)
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-4"
              }`}
              style={{ transitionDelay: `${index * 1500 + 400}ms` }}
            >
              <p className={`text-sm font-bold ${step.status === "warning" && index <= animatedIndex ? "text-red-600" : "text-gray-900"}`}>
                {step.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{step.subtitle}</p>
              {step.date && index <= animatedIndex && (
                <p className="text-xs text-gray-400 mt-0.5">{step.date}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderTimeline;
