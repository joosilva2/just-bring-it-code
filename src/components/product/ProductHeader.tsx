import { X, Share2, ShoppingCart, MoreHorizontal } from "lucide-react";
import logoGardenLife from "@/assets/logo-garden-life.png";
import logoTiktokShop from "@/assets/logo-tiktokshop.png";

const ProductHeader = ({ onCloseClick }: { onCloseClick?: () => void }) => {
  return <header className="w-full bg-white px-3 py-0 flex items-center justify-between">
      <div className="flex items-center gap-0 relative z-10 flex-shrink-0">
        <button className="p-1" onClick={onCloseClick}>
          <X className="h-5 w-5 text-foreground" />
        </button>
        
      </div>
      <div className="flex items-center gap-3">
        
        
        <button className="p-1">
          <Share2 className="h-5 w-5 text-foreground" />
        </button>
        <button className="p-1">
          <ShoppingCart className="h-5 w-5 text-foreground" />
        </button>
        <button className="p-1">
          <MoreHorizontal className="h-5 w-5 text-foreground" />
        </button>
      </div>
    </header>;
};
export default ProductHeader;