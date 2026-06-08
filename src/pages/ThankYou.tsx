import jadlogLogo from "@/assets/jadlog-logo.png";

const ThankYou = () => {
  const handleContinue = () => {
    window.location.href = "/taxa";
  };

  return (
    <div
      className="min-h-screen bg-white flex flex-col items-center px-5 py-10"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="w-full max-w-xl">
        {/* Jadlog Logo */}
        <div className="flex justify-center mb-8">
          <img
            src={jadlogLogo}
            alt="Jadlog"
            className="w-40 h-40 object-contain"
          />
        </div>

        {/* Headline */}
        <h1 className="text-[17px] sm:text-[18px] font-bold text-gray-900 leading-snug mb-6">
          O seu pagamento foi concluído com sucesso,{" "}
          <span className="underline decoration-2 underline-offset-2">
            confira o status do seu pedido!
          </span>
        </h1>

        {/* CTA Button */}
        <button
          onClick={handleContinue}
          className="bg-[#ed1c24] hover:bg-[#c8161d] active:scale-[0.99] text-white font-bold text-[14px] tracking-wide py-4 px-7 rounded-md transition-colors"
        >
          CLIQUE AQUI PARA ACESSAR SEUS PEDIDOS
        </button>

        {/* Footer */}
        <div className="mt-20 text-[13px] text-gray-500 space-y-2">
          <p className="font-semibold uppercase tracking-wide">
            Termos de uso e políticas de privacidade
          </p>
          <p className="text-gray-700">Jadlog Brasil</p>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;
