import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

const ProductFooter = () => {
  return (
    <footer className="bg-white px-4 py-6 pb-28 border-t border-border">
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1 mb-2">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Compre
          </h3>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Mais vendidos</p>
            <p>Novidades</p>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1 mb-2">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Sobre
          </h3>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Sobre nós</p>
            <p>Carreiras</p>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1 mb-2">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Suporte
          </h3>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Central de Ajuda</p>
            <Link to="/contato" className="block hover:text-primary">Contato</Link>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1 mb-2">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Política & Legal
          </h3>
          <div className="space-y-1 text-xs text-muted-foreground">
            <Link to="/politica-de-privacidade" className="block hover:text-primary">Política de privacidade</Link>
            <Link to="/termos-de-uso" className="block hover:text-primary">Termos de uso</Link>
          </div>
        </div>
      </div>

      <div className="text-center border-t border-border pt-4 space-y-1">
        <p className="text-xs text-muted-foreground">© 2025 CasaPrática.</p>
        <div className="flex justify-center gap-2 text-xs text-primary">
          <Link to="/politica-de-privacidade">Política de privacidade</Link>
          <span className="text-muted-foreground">•</span>
          <Link to="/termos-de-uso">Termos de uso</Link>
        </div>
      </div>
    </footer>
  );
};

export default ProductFooter;
