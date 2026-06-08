import { Link } from "react-router-dom";
import { ArrowLeft, Truck, Clock } from "lucide-react";

const ShippingPolicy = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Política de Envio</h1>
        
        <div className="prose prose-sm text-gray-600 space-y-4">
          <p className="text-sm text-gray-500">Última atualização: Fevereiro de 2025</p>
          
          {/* Highlights */}
          <div className="grid grid-cols-2 gap-3 my-6">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <Truck className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-800">Frete Grátis</p>
              <p className="text-xs text-green-600">Para todo o Brasil</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-800">Envio Rápido</p>
              <p className="text-xs text-blue-600">1-2 dias úteis</p>
            </div>
          </div>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">1. Prazo de Envio</h2>
            <p>
              Seu pedido será preparado e enviado em até 2 (dois) dias úteis após a confirmação 
              do pagamento. O prazo de entrega varia de acordo com a região:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Sudeste:</strong> 3 a 7 dias úteis</li>
              <li><strong>Sul e Centro-Oeste:</strong> 5 a 10 dias úteis</li>
              <li><strong>Nordeste:</strong> 7 a 12 dias úteis</li>
              <li><strong>Norte:</strong> 10 a 15 dias úteis</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">2. Frete Grátis</h2>
            <p>
              Oferecemos <strong>frete grátis</strong> para todo o território nacional em todas 
              as compras realizadas em nosso site. Esta promoção pode ser alterada sem aviso prévio.
            </p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">3. Rastreamento</h2>
            <p>
              Após o envio, você receberá um e-mail com o código de rastreamento. 
              Você poderá acompanhar a entrega diretamente no site dos Correios ou da transportadora.
            </p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">4. Endereço de Entrega</h2>
            <p>
              Certifique-se de que o endereço de entrega está correto e completo. Não nos 
              responsabilizamos por atrasos ou devoluções causados por informações incorretas.
            </p>
            <p>
              Caso não haja ninguém para receber o produto, a transportadora poderá deixar com 
              um vizinho ou realizar nova tentativa de entrega.
            </p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">5. Problemas na Entrega</h2>
            <p>
              Em caso de problemas com a entrega (produto danificado, extravio, etc.), 
              entre em contato conosco imediatamente pelo e-mail contato@mesamaleta.com.
            </p>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3">6. Contato</h2>
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

export default ShippingPolicy;
