import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Política de Privacidade</h1>
        
        <div className="prose prose-sm text-gray-600 space-y-4">
          <p className="text-sm text-gray-500">Última atualização: Fevereiro de 2025</p>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">1. Informações que Coletamos</h2>
            <p>
              Coletamos informações que você nos fornece diretamente, como nome, endereço de e-mail, 
              endereço de entrega, número de telefone e informações de pagamento quando você realiza uma compra.
            </p>
            <p>
              Também coletamos automaticamente certas informações quando você visita nosso site, incluindo 
              seu endereço IP, tipo de navegador, páginas visitadas e tempo de permanência.
            </p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">2. Como Usamos suas Informações</h2>
            <p>Utilizamos as informações coletadas para:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Processar e entregar seus pedidos</li>
              <li>Enviar confirmações de pedidos e atualizações de envio</li>
              <li>Responder às suas perguntas e solicitações</li>
              <li>Melhorar nosso site e serviços</li>
              <li>Enviar comunicações de marketing (com seu consentimento)</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">3. Compartilhamento de Informações</h2>
            <p>
              Não vendemos suas informações pessoais. Compartilhamos suas informações apenas com:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Processadores de pagamento para completar transações</li>
              <li>Empresas de logística para entrega de pedidos</li>
              <li>Prestadores de serviços que nos auxiliam na operação do site</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">4. Segurança dos Dados</h2>
            <p>
              Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações 
              contra acesso não autorizado, alteração, divulgação ou destruição.
            </p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">5. Seus Direitos</h2>
            <p>
              De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos ou incorretos</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Revogar seu consentimento a qualquer momento</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">6. Contato</h2>
            <p>
              Para dúvidas sobre esta política ou para exercer seus direitos, entre em contato conosco:
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

export default PrivacyPolicy;
