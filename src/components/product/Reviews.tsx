import { useEffect, useState } from "react";
import { Star, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import reviewFlex1 from "@/assets/review-flex-1.png";
import reviewFlex2 from "@/assets/review-flex-2.png";
import reviewFlex3 from "@/assets/review-flex-3.png";
import reviewFlex4 from "@/assets/review-flex-4.png";
import reviewFlex5 from "@/assets/review-flex-5.png";
import reviewFlex6 from "@/assets/review-flex-6.png";

const reviewsData = [
  {
    name: "​Mariana L.",
    date: "22 Mar 2026",
    rating: 5,
    text: "​Confesso que tinha receio de comprar online por causa da promoção \"pague 1 leve 2\", achei que fosse golpe. Mas chegaram OS DOIS armários certinhos em 4 dias úteis. A montagem é super fácil, levei uns 25 minutos cada. O aço é bem grosso, nada balança. Vale cada centavo!",
    images: [reviewFlex1],
    useful: 28,
  },
  {
    name: "​Carlos H.",
    date: "14 Mar 2026",
    rating: 5,
    text: "​Que achado! Paguei por um e vieram dois mesmo, igual no anúncio. Coloquei um na cozinha e outro no quarto das crianças para os brinquedos. Organização total, entrega rápida (3 dias) e embalagem super segura. Recomendo demais! Já indiquei pra três amigas.",
    images: [reviewFlex2],
    useful: 19,
  },
  {
    name: "Juliana S.",
    date: "05 Mar 2026",
    rating: 5,
    text: "Que achado! Paguei por um e vieram dois. Coloquei um na cozinha e outro no quarto das crianças. Organização total, entrega rápida e embalagem super segura. Recomendo demais!",
    images: [reviewFlex3],
    useful: 42,
  },
  {
    name: "​Roberto M.",
    date: "27 Fev 2026",
    rating: 5,
    text: "​Pesquisei em vários lugares e o frete grátis aqui foi o que me convenceu — em outro site sai por mais de 250 só um, aqui paguei menos da metade pelos dois. Aguenta bem o peso (coloquei microondas, sanduicheira, liquidificador) e os pés ajustáveis ajudam em piso desnivelado. Produto sério.",
    images: [reviewFlex4],
    useful: 15,
  },
  {
    name: "Patrícia G.",
    date: "03 Fev 2026",
    rating: 5,
    text: "​Apartamento pequeno e essa foi a melhor solução que achei. Ocupa pouco espaço de chão e tem bastante volume interno. Acabei usando como armário de varanda também — não enferruja porque o aço é tratado. Ótimo acabamento, parece muito mais caro do que é.",
    images: [reviewFlex5],
    useful: 17,
  },
  {
    name: "Thiago N.",
    date: "29 Jan 2026",
    rating: 5,
    text: "​Tava na dúvida porque era promoção meio \"boa demais\". Comprei mesmo assim e foi a melhor decisão. Os dois armários chegaram em perfeito estado, frete grátis cumprido, suporte respondeu rápido quando perguntei sobre prazo. Empilhei dois no escritório, ficou show de bola.",
    images: [reviewFlex6],
    useful: 12,
  },
];

const Stars = ({ count }: { count: number }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < count ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
      />
    ))}
  </div>
);

const Reviews = () => {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!expandedImage) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedImage(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [expandedImage]);

  return (
    <div className="px-4 py-5 bg-commerce-surface sm:px-6">
      <h2 className="text-base font-semibold text-foreground mb-2">
        Avaliações dos clientes (207)
      </h2>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl font-bold text-foreground">4.8</span>
        <span className="text-sm text-muted-foreground">/5</span>
        <Stars count={5} />
      </div>

      <div className="space-y-5">
        {reviewsData.map((r) => (
          <div key={r.name} className="border-b border-border pb-5 last:border-0 last:pb-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-foreground">{r.name}</span>
              <span className="text-xs text-muted-foreground">{r.date}</span>
            </div>
            <Stars count={r.rating} />
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">{r.text}</p>
            {r.images && r.images.length > 0 && (
              <div className="flex items-center gap-3 mt-2.5">
                {r.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setExpandedImage(img)}
                    className="h-16 w-16 overflow-hidden rounded-md border border-border bg-commerce-surface flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={`Ampliar foto da avaliação de ${r.name}`}
                  >
                    <img src={img} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  </button>
                ))}
                <span className="text-sm text-muted-foreground">
                  Útil ({r.useful})
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-border text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <ImageIcon className="h-3.5 w-3.5" /> Inclui imagens (52)
        </span>
        <span>5 <Star className="h-3 w-3 inline fill-yellow-400 text-yellow-400" /> (155)</span>
        <span>4 <Star className="h-3 w-3 inline fill-yellow-400 text-yellow-400" /> (22)</span>
      </div>

      {expandedImage && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-commerce-overlay/90 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Foto ampliada da avaliação"
          onClick={() => setExpandedImage(null)}
        >
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-4 top-4 z-10 rounded-full shadow-lg sm:right-8 sm:top-8"
            onClick={() => setExpandedImage(null)}
            aria-label="Fechar foto"
          >
            <X className="h-5 w-5" />
          </Button>
          <img
            src={expandedImage}
            alt="Foto ampliada enviada por cliente"
            className="max-h-[88vh] max-w-full rounded-md object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

    </div>
  );
};

export default Reviews;
