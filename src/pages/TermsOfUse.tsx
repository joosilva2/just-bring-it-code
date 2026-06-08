import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsOfUse = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Termos de Uso</h1>
        
        <div className="prose prose-sm text-gray-600 space-y-4">
          <p className="text-sm text-gray-500">Última atualização: Fevereiro de 2025</p>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e usar este site, você aceita e concorda em cumprir estes Termos de Uso. 
              Se você não concordar com qualquer parte destes termos, não deve usar nosso site.
            </p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">2. Uso do Site</h2>
            <p>Você concorda em usar este site apenas para fins legais e de maneira que não:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Viole qualquer lei ou regulamento aplicável</li>
              <li>Infrinja os direitos de terceiros</li>
              <li>Interfira no funcionamento adequado do site</li>
              <li>Tente acessar áreas restritas do site sem autorização</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">3. Produtos e Preços</h2>
            <p>
              Nos esforçamos para garantir que as informações sobre produtos e preços sejam precisas. 
              No entanto, erros podem ocorrer. Reservamo-nos o direito de corrigir quaisquer erros e 
              alterar preços a qualquer momento sem aviso prévio.
            </p>
            <p>
              Todas as ofertas estão sujeitas à disponibilidade de estoque. Reservamo-nos o direito 
              de limitar quantidades ou recusar pedidos a nosso critério.
            </p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">4. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo deste site, incluindo textos, imagens, logotipos e design, é propriedade 
              da RCS Sports Management & Solutions LTDA e está protegido por leis de direitos autorais.
            </p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">5. Limitação de Responsabilidade</h2>
            <p>
              Não seremos responsáveis por quaisquer danos indiretos, incidentais, especiais ou 
              consequenciais decorrentes do uso ou incapacidade de uso deste site.
            </p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">6. Modificações dos Termos</h2>
            <p>
              Podemos modificar estes Termos de Uso a qualquer momento. As alterações entrarão em vigor 
              imediatamente após a publicação no site. O uso contínuo do site após as alterações 
              constitui sua aceitação dos novos termos.
            </p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">7. Lei Aplicável</h2>
            <p>
              Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. 
              Qualquer disputa será resolvida nos tribunais da cidade do Rio de Janeiro, RJ.
            </p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">8. Contato</h2>
            <p>
              Para dúvidas sobre estes termos, entre em contato:
            </p>
            <p className="font-medium">
              E-mail: contato@mesamaleta.com<br />
              RCS Sports Management & Solutions LTDA<br />
              CNPJ: 64.657.491/0001-20
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
