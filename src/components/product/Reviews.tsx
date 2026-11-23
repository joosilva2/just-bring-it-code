import { Star, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
        className={`h-4 w-4 ${i < count ? "review-star" : "text-muted"}`}
      />
    ))}
  </div>
);

const Reviews = () => {
  const [expandedPhoto, setExpandedPhoto] = useState<{ src: string; name: string } | null>(null);
  return (
    <section className="reviews-section px-4 py-5 bg-background">
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
                  <Button
                    key={idx}
                    variant="outline"
                    aria-label={`Ampliar foto ${idx + 1} de ${r.name.trim()}`}
                    onClick={() => setExpandedPhoto({ src: img, name: r.name.trim() })}
                    className="h-16 w-16 p-0 rounded overflow-hidden border border-border flex-shrink-0"
                  >
                    <img src={img} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  </Button>
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
        <span>5 <Star className="h-3 w-3 inline review-star" /> (155)</span>
        <span>4 <Star className="h-3 w-3 inline review-star" /> (22)</span>
      </div>
      <Dialog open={!!expandedPhoto} onOpenChange={(open) => { if (!open) setExpandedPhoto(null); }}>
        <DialogContent className="review-photo-dialog w-[calc(100%-2rem)] max-w-3xl p-4 pt-14" aria-describedby="review-photo-description">
          <DialogTitle className="sr-only">Foto da avaliação de {expandedPhoto?.name}</DialogTitle>
          <DialogDescription id="review-photo-description" className="sr-only">Imagem ampliada do armário enviada na avaliação.</DialogDescription>
          {expandedPhoto && <img src={expandedPhoto.src} alt={`Armário na avaliação de ${expandedPhoto.name}`} className="w-full max-h-[75dvh] object-contain" />}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default Reviews;
