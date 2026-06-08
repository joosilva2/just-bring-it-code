import popozudaMain from "@/assets/popozuda-main.jpeg";
import popozudaPromo from "@/assets/popozuda-promo.jpeg";
import popozudaFront from "@/assets/popozuda-front.jpeg";
import popozudaTexture from "@/assets/popozuda-texture.jpeg";
import popozudaDuo from "@/assets/popozuda-duo.jpeg";
import popozudaAviso from "@/assets/popozuda-aviso.jpeg";

export interface ProductVariant {
  label: string;
  value: string;
  available: boolean;
}

export interface ProductConfig {
  slug: string;
  name: string;
  title: string;
  price: number; // in cents
  originalPrice: number; // in cents
  discount: string;
  installments: string;
  rating: number;
  reviewCount: number;
  soldCount: string;
  recentBuyers: string;
  images: string[];
  descriptionImages: string[];
  variants: ProductVariant[];
  variantLabel: string;
  description: string[];
  specs: { label: string; value: string }[];
  guarantee: string;
  faq: { question: string; answer: string }[];
  storeName: string;
  storeFollowers: string;
}

export const products: Record<string, ProductConfig> = {
  "popozuda-cream": {
    slug: "popozuda-cream",
    name: "Popozuda Cream",
    title: "Popozuda Cream – Creme para um Bumbum mais Firme e Uniforme 200g",
    price: 6001,
    originalPrice: 18557,
    discount: "-68%",
    installments: "3x de R$ 20,00 sem juros",
    rating: 4.5,
    reviewCount: 11300,
    soldCount: "68.7K vendidos",
    recentBuyers: "2.8K+ pessoas compraram nos últimos 3 dias",
    images: [popozudaPromo, popozudaFront, popozudaTexture, popozudaDuo, popozudaAviso],
    descriptionImages: [popozudaFront, popozudaDuo],
    variants: [
      { label: "1 Frasco", value: "1-frasco", available: true },
      { label: "2 Frascos", value: "2-frascos", available: true },
      { label: "4 Frascos", value: "4-frascos", available: true },
    ],
    variantLabel: "Frascos",
    description: [
      "O Popozuda Cream é um creme corporal termogênico desenvolvido para deixar o bumbum mais firme, uniforme e com aparência saudável. Sua fórmula combina ativos poderosos como cafeína, mentol e castanha da índia.",
      "MODO DE USO: Aplicar uma pequena quantidade do creme na pele limpa e seca. Massagear com movimentos circulares nas regiões desejadas (coxas, glúteos, abdômen ou braços) até completa absorção. Usar 1 a 2 vezes por dia.",
      "INGREDIENTES ATIVOS: O produto contém ativos com ação termogênica, como cafeína, mentol, nicotinato de metila, gengibre, castanha da índia e arnica, que podem causar leve vermelhidão, calor ou formigamento temporário. Esses efeitos são esperados devido à ativação da circulação local.",
      "AVISO IMPORTANTE: Antes do uso contínuo, fazer um teste de sensibilidade. Aplique uma pequena quantidade no antebraço. Se houver ardência excessiva, vermelhidão intensa ou coceira persistente, suspender o uso e consultar um profissional.",
    ],
    specs: [
      { label: "Peso líquido", value: "200g" },
      { label: "Tipo", value: "Creme corporal termogênico" },
      { label: "Registro ANVISA", value: "25351.456064/2024-98" },
      { label: "Uso recomendado", value: "Adulto, maiores de 18 anos" },
      { label: "Aplicação", value: "Coxas, glúteos, abdômen e braços" },
      { label: "Frequência", value: "1 a 2 vezes por dia" },
    ],
    guarantee: "ATENÇÃO: Pode causar sensação de calor, vermelhidão e leve ardência nos primeiros minutos após a aplicação — efeito normal do termogênico. Contraindicado para gestantes, lactantes e pessoas com pele sensível ou alergia a algum dos componentes.",
    faq: [
      { question: "O creme funciona mesmo?", answer: "Sim! O Popozuda Cream contém ativos termogênicos que ativam a circulação local, ajudando a firmar e uniformizar a pele. Resultados visíveis com uso contínuo." },
      { question: "Posso usar em outras partes do corpo?", answer: "Sim! Além dos glúteos, pode ser aplicado em coxas, abdômen e braços." },
      { question: "Quanto tempo dura um frasco?", answer: "Com uso diário (1-2 aplicações), um frasco de 200g dura em média 30 a 45 dias." },
      { question: "Tem contraindicação?", answer: "Contraindicado para gestantes, lactantes e pessoas com pele sensível ou alergia aos componentes. Sempre faça o teste de sensibilidade antes." },
      { question: "A entrega é rápida?", answer: "Sim! Enviamos para todo o Brasil. Prazo médio de 4-7 dias úteis dependendo da região." },
    ],
    storeName: "Loja Popozuda",
    storeFollowers: "85.1K",
  },
};

export const getProduct = (slug: string): ProductConfig | undefined => products[slug];
