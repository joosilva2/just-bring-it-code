import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const ReturnsPolicy = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Política de Trocas e Devoluções</h1>
        
        <div className="prose prose-sm text-gray-600 space-y-4">
          <p className="text-sm text-gray-500">Última atualização: Fevereiro de 2025</p>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">1. Direito de Arrependimento</h2>
            <p>
              De acordo com o Código de Defesa do Consumidor, você tem até 7 (sete) dias corridos após 
              o recebimento do produto para solicitar a devolução e reembolso integral, sem necessidade 
              de justificativa.
            </p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">2. Condições para Troca ou Devolução</h2>
            <p>Para que a troca ou devolução seja aceita, o produto deve:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Estar na embalagem original, sem sinais de uso</li>
              <li>Conter todos os acessórios e manuais</li>
              <li>Não apresentar danos causados pelo cliente</li>
              <li>Estar acompanhado da nota fiscal</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">3. Produtos com Defeito</h2>
            <p>
              Caso o produto apresente defeito de fabricação, você tem até 90 (noventa) dias para 
              solicitar a troca ou reparo. Realizaremos a análise técnica e, comprovado o defeito, 
              ofereceremos as opções de:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Substituição por produto idêntico</li>
              <li>Reembolso integral do valor pago</li>
              <li>Abatimento proporcional do preço</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">4. Como Solicitar</h2>
            <p>Para solicitar troca ou devolução:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Entre em contato pelo e-mail contato@mesamaleta.com</li>
              <li>Informe o número do pedido e motivo da solicitação</li>
              <li>Aguarde as instruções de envio</li>
              <li>Envie o produto conforme orientações recebidas</li>
            </ol>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">5. Custos de Envio</h2>
            <p>
              Em caso de arrependimento, os custos de envio da devolução são de responsabilidade do cliente.
            </p>
            <p>
              Em caso de defeito de fabricação ou erro no envio, os custos de envio serão por nossa conta.
            </p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">6. Prazo de Reembolso</h2>
            <p>
              Após recebermos e aprovarmos a devolução, o reembolso será processado em até 10 (dez) 
              dias úteis. O valor será estornado na mesma forma de pagamento utilizada na compra.
            </p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">7. Contato</h2>
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

export default ReturnsPolicy;
