import { Truck, Clock, MapPin, ShieldCheck } from "lucide-react";

const ShippingDetails = () => {
  return (
    <div className="px-4 py-5 bg-white">
      <h2 className="text-base font-bold text-foreground mb-4">Envio e Entrega</h2>

      {/* Free shipping banner */}
      <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 mb-5">
        <Truck className="h-5 w-5 text-primary flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-foreground">Frete Grátis para todo o Brasil!</p>
          <p className="text-xs text-muted-foreground">
            Economize <strong className="text-foreground">R$ 29,90</strong> no frete — promoção por tempo limitado.
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Prazo de entrega</p>
            <p className="text-xs text-muted-foreground">
              Receba em <strong>5 a 8 dias úteis</strong> após confirmação do pagamento.
              Pedidos feitos até 14h são despachados no mesmo dia.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Rastreamento completo</p>
            <p className="text-xs text-muted-foreground">
              Acompanhe seu pedido em tempo real pelo código de rastreio
              enviado por e-mail e WhatsApp logo após o despacho.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Entrega garantida</p>
            <p className="text-xs text-muted-foreground">
              Entrega garantida e segurada pelos Correios®. Em caso de
              extravio ou dano no transporte, reenviamos o produto ou
              devolvemos o valor integral sem custo.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[8px] font-bold text-muted-foreground">BR</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Envio rápido, seguro e com rastreamento para <strong className="text-foreground">todos os estados
            do Brasil</strong>. Aproveite essa oferta e leve a praticidade da Mesa
            Dobrável para o seu dia a dia!
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShippingDetails;
