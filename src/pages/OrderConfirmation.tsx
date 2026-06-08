import { CheckCircle, Package, Truck, Clock } from "lucide-react";

const OrderConfirmation = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-4 flex justify-center">
        <span className="text-lg font-bold text-gray-800">Confirmação de Pedido</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Success card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Obrigado pela sua compra! 🎉
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Seu pedido foi recebido com sucesso e está sendo processado. Agradecemos pela confiança!
          </p>
        </div>

        {/* Status timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Status do seu pedido</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Pedido confirmado</p>
                <p className="text-xs text-gray-500">Seu pagamento foi aprovado</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Package className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Preparando envio</p>
                <p className="text-xs text-gray-500">Estamos separando seu produto</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Truck className="h-4 w-4 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500">Em trânsito</p>
                <p className="text-xs text-gray-400">Aguardando envio</p>
              </div>
            </div>
          </div>
        </div>

        {/* Wait message */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <Clock className="h-6 w-6 text-blue-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-900 mb-1">
            Aguarde a atualização do seu pedido
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Você receberá atualizações sobre o envio no e-mail cadastrado. O prazo estimado de entrega é de <span className="font-bold text-gray-700">7 a 15 dias úteis</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
