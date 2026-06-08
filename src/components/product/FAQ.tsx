import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqData = [
  {
    q: "Qual o peso que a mesa suporta?",
    a: "A mesa suporta até 100 kg de carga distribuída sobre o tampo.",
  },
  {
    q: "De que material é feita?",
    a: "O tampo é de HDPE (plástico de alta densidade) e a estrutura é de aço tubular com pintura epóxi anticorrosiva.",
  },
  {
    q: "Como funciona o sistema de maleta?",
    a: "A mesa dobra ao meio e possui uma alça ergonômica, virando uma maleta compacta para transporte fácil.",
  },
  {
    q: "Posso usar ao ar livre na chuva?",
    a: "Sim, o material HDPE e a pintura anticorrosiva permitem uso ao ar livre, mas recomendamos guardar após o uso para maior durabilidade.",
  },
  {
    q: "Qual o prazo de entrega?",
    a: "O prazo é de 5 a 8 dias úteis após confirmação do pagamento, com frete grátis para todo o Brasil.",
  },
  {
    q: "Tem garantia?",
    a: "Sim, a mesa possui garantia de 1 ano contra defeitos de fabricação.",
  },
];

const FAQ = () => {
  return (
    <div className="px-4 py-5 bg-white">
      <h2 className="text-base font-bold text-foreground mb-3">Perguntas Frequentes</h2>
      <Accordion type="single" collapsible className="w-full">
        {faqData.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-sm font-medium text-foreground text-left">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default FAQ;
