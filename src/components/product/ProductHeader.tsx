import { ShieldCheck } from "lucide-react";
import logoCasaPratica from "@/assets/casapratica-logo.png";

const ProductHeader = () => {
  return <header className="w-full bg-background px-4 py-2.5 flex items-center border-b border-border">
      <div className="flex items-center gap-2.5 min-w-0">
        <img src={logoCasaPratica} alt="Casa Prática" className="h-9 w-9 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="font-heading text-sm font-bold text-foreground leading-none">Casa Prática</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-primary" /> Compra segura
          </p>
        </div>
      </div>
    </header>;
};
export default ProductHeader;