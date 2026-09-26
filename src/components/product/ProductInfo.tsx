import { Star, CreditCard, Tag } from "lucide-react";

const ProductInfo = () => {
  return (
    <div className="bg-commerce-surface">
      <div className="px-4 pb-4 pt-3 sm:px-5">
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-foreground px-2.5 py-1 text-xs font-bold uppercase text-background">
          <Tag className="h-3.5 w-3.5" />
          Pague 1, Leve 2
        </span>

        <h1 className="mt-3 text-xl font-bold leading-tight text-foreground">
          Armário HomeFlex de Aço Multifuncional
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Organização prática para cozinha, banheiro e lavanderia.
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <Star className="h-4 w-4 fill-commerce-star text-commerce-star" />
          <span className="font-semibold text-foreground">4.8</span>
          <span className="text-muted-foreground">(327 avaliações)</span>
          <span className="text-border">|</span>
          <span className="text-muted-foreground">5.821 vendidos</span>
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground line-through">R$ 149,90</span>
            <span className="rounded bg-commerce-success-soft px-2 py-0.5 font-semibold text-commerce-success">40% OFF</span>
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[30px] font-light leading-none text-foreground">R$ 89,90</span>
            <span className="text-sm font-semibold text-commerce-success">Economize R$ 60,00</span>
          </div>
          <p className="mt-2 text-sm text-commerce-success">R$ 89,90 no Pix</p>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span>6x de <strong className="text-foreground">R$ 14,98</strong> sem juros</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductInfo;
