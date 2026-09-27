import { ShieldCheck, Package, PenLine, ShieldCheck as ShieldIcon, Truck } from "lucide-react";

const items = [
  { icon: Package, text: "Pague 1 Leve 2", color: "text-orange-500" },
  { icon: PenLine, text: "Aço multifuncional", color: "text-blue-500" },
  { icon: ShieldIcon, text: "Garantia de 1 ano", color: "text-green-600" },
  { icon: Truck, text: "Frete grátis", color: "text-green-600" },
];

const TrustBadges = () => {
  return (
    <div className="px-4 py-4 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-foreground" />
          <span className="text-base font-bold text-foreground">Benefícios da compra</span>
        </div>
        <span className="text-sm font-bold text-primary">100% Protegido</span>
      </div>

      {/* Grid 2x2 */}
      <div className="grid grid-cols-2 gap-2.5">
        {items.map((item) => (
          <div
            key={item.text}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-3"
          >
            <item.icon className={`h-5 w-5 flex-shrink-0 ${item.color}`} />
            <span className="text-sm text-foreground">{item.text}</span>
          </div>
        ))}
      </div>

      {/* Guarantee banner */}
      <div className="mt-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
        <p className="text-sm text-green-800 text-center leading-relaxed">
          Sua compra é <strong>100% protegida</strong>. Garantimos devolução do valor
          integral caso o produto não corresponda à descrição.
        </p>
      </div>
    </div>
  );
};

export default TrustBadges;
