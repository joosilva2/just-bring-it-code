const TechSpecs = () => {
  return (
    <div className="px-4 py-5 bg-white">
      <h2 className="text-sm font-bold text-foreground uppercase mb-3">
        Especificações Técnicas:
      </h2>
      <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
        <li><strong className="text-foreground">Material:</strong> Aço carbono reforçado com pintura epóxi anticorrosiva</li>
        <li><strong className="text-foreground">Capacidade de carga:</strong> até 80 kg distribuídos</li>
        <li><strong className="text-foreground">Cores disponíveis:</strong> Preto e Branco</li>
        <li><strong className="text-foreground">Acabamento:</strong> Pintura eletrostática anticorrosão</li>
        <li><strong className="text-foreground">Montagem:</strong> Fácil, sem ferramentas especiais</li>
        <li><strong className="text-foreground">Uso:</strong> Cozinha, banheiro, lavanderia, área de serviço</li>
        <li><strong className="text-foreground">Pés:</strong> Antiderrapantes em borracha</li>
      </ul>

      {/* Guarantee */}
      <div className="mt-5 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">GARANTIA DE 1 ANO:</strong> A CasaPrática é a escolha de
          milhares de consumidores. Com mais de 4.000 unidades vendidas e nota 4.8 de satisfação, a
          CasaPrática é sinônimo de qualidade e confiança. CasaPrática, a escolha inteligente!
        </p>
      </div>
    </div>
  );
};

export default TechSpecs;
