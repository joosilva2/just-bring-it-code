import { CheckCircle2 } from "lucide-react";
import logoCasaPratica from "@/assets/casapratica-logo.png";

const StoreInfo = () => {
  return (
    <div className="px-4 py-4 bg-white">
      <div className="flex items-center gap-3">
        <img
          src={logoCasaPratica}
          alt="CasaPrática"
          className="w-14 h-14 rounded-full object-cover flex-shrink-0"
          loading="lazy"
          decoding="async"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-foreground tracking-wide">CASAPRÁTICA</span>
            <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3.5 w-3.5" /> Loja Verificada
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            · 1.124 produtos · 100% recomenda
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Confiança:</span>
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-primary to-orange-400" />
        </div>
        <span className="text-sm font-bold text-primary">100%</span>
      </div>
    </div>
  );
};

export default StoreInfo;
