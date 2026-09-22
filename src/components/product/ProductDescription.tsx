import flexDesc1 from "@/assets/flex-product-description.png";
import flexDesc2 from "@/assets/flex-product-description2.png";

const ProductDescription = () => {
  return (
    <div className="bg-white px-4 py-5">
      <h2 className="text-base font-bold text-foreground mb-4">Sobre o produto</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
        <p>
          O <strong className="text-foreground">Armário HomeFlex de Aço Multifuncional</strong> é o
          organizador definitivo para sua casa: portas dobráveis tipo "harmônica", estrutura em aço
          reforçado e prateleiras espaçosas que se adaptam a cozinha, banheiro, lavanderia, quarto ou
          garagem. Pegue 2 pelo preço de 1!
        </p>

        <img
          src={flexDesc1}
          alt="HomeFlex - Armário Multifuncional"
          className="w-full rounded-lg"
          loading="lazy"
          decoding="async"
        />

        <p>
          <strong className="text-foreground">✅ AÇO REFORÇADO:</strong> Estrutura em aço com pintura
          anticorrosiva. Suporta peso real distribuído nas prateleiras sem entortar nem balançar.
        </p>

        <p>
          <strong className="text-foreground">✅ PORTAS DOBRÁVEIS:</strong> Sistema de portas em
          "harmônica" que abrem e fecham com um leve toque, protegendo do pó sem ocupar espaço quando
          abertas.
        </p>

        <img
          src={flexDesc2}
          alt="Medidas e características"
          className="w-full rounded-lg"
          loading="lazy"
          decoding="async"
        />

        <p>
          <strong className="text-foreground">✅ PÉS AJUSTÁVEIS:</strong> Niveladores nos pés que se
          adaptam a pisos irregulares e protegem contra riscos. Estabilidade total mesmo em superfícies
          imperfeitas.
        </p>

        <p>
          <strong className="text-foreground">✅ MULTIFUNCIONAL:</strong> Use na cozinha (armazenar
          utensílios, panelas e mantimentos), banheiro (toalhas e produtos), lavanderia (produtos de
          limpeza), quarto das crianças (brinquedos) ou garagem (ferramentas).
        </p>

        <p>
          <strong className="text-foreground">✅ MONTAGEM FÁCIL:</strong> Vem com manual ilustrado passo
          a passo. Monte sozinho em poucos minutos, sem ferramentas profissionais.
        </p>

        <p>
          <strong className="text-foreground">✅ PAGUE 1 LEVE 2:</strong> Promoção relâmpago — compre 1 e
          leve 2 unidades. Combine cores (2 pretos, 2 brancos ou 1 de cada) para organizar diferentes
          ambientes.
        </p>
      </div>
    </div>
  );
};

export default ProductDescription;
