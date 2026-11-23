import { Star, CreditCard, Tag } from "lucide-react";

const ProductInfo = () => (
  <div className="product-information bg-background px-4 pt-5 pb-3">
    <p className="text-xs font-medium text-muted-foreground mb-2">Casa Prática</p>
    <h1 className="text-lg font-semibold text-foreground leading-snug mb-3">
      [PAGUE 1 LEVE 2] Armário HomeFlex de Aço Multifuncional — Organizador Resistente para Cozinha, Banheiro e Lavanderia
    </h1>
    <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-muted-foreground">
      <Star className="h-4 w-4 review-star" />
      <span className="font-semibold text-foreground">4.8</span>
      <span>(327)</span><span>•</span><span>5.821 vendidos</span>
    </div>
    <div className="flex flex-wrap items-baseline gap-3 mb-2">
      <span className="text-3xl font-semibold text-primary">R$ 64,20</span>
      <span className="text-sm text-muted-foreground line-through">R$ 149,90</span>
      <span className="text-xs font-semibold text-primary">-55%</span>
    </div>
    <div className="flex items-start gap-2 text-xs text-muted-foreground mb-4">
      <CreditCard className="h-4 w-4 shrink-0" />
      <span>6x de <strong className="font-medium text-foreground">R$ 10,70</strong> sem juros no cartão</span>
    </div>
    <div className="inline-flex items-center gap-2 border border-primary/20 bg-accent px-3 py-2 text-xs font-medium text-primary">
      <Tag className="h-3.5 w-3.5" />Pague 1 Leve 2
    </div>
    <p className="text-xs text-primary mt-3">1.4K+ pessoas compraram nos últimos 3 dias</p>
  </div>
);

export default ProductInfo;