import { Truck } from "lucide-react";

const ShippingInfo = () => {
  return (
    <div className="px-4 pb-3 bg-white">
      <div className="rounded-lg border border-gray-200 px-3 py-3 flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 bg-green-600 text-white text-sm font-bold px-3 py-2 rounded">
          <Truck className="h-4 w-4" />
          Frete grátis
        </span>
        <div>
          <div className="text-sm text-foreground">
            Receba em <strong>5 - 8 dias úteis</strong>
          </div>
          <div className="text-xs text-muted-foreground">
            Taxa de envio: <span className="line-through">R$ 29,90</span>{" "}
            <span className="text-green-600 font-semibold">Grátis</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingInfo;
