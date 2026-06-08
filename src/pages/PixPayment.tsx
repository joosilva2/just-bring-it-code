import { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Copy, CheckCircle } from "lucide-react";
import { initTikTokPixels, identifyTikTokUser, trackCompletePaymentAsync } from "@/lib/tiktokPixel";
import { supabase } from "@/integrations/supabase/client";

const formatBRL = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PixPayment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const state = location.state as { pixData: any; total: number; color: string; externalRef?: string; customerEmail?: string; customerPhone?: string } | null;

  const pixData = state?.pixData;
  const total = state?.total || 0;
  const externalRef = state?.externalRef || pixData?.externalRef || pixData?.external_ref || searchParams.get('ref') || '';
  const customerEmail = state?.customerEmail || '';
  const customerPhone = state?.customerPhone || '';
  const color = state?.color || '2pretos';

  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(600);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');
  const [orderAmount, setOrderAmount] = useState(total);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [paidTracked, setPaidTracked] = useState(false);

  const variantNames: Record<string, string> = {
    '2pretos': 'Armário HomeFlex de Aço Multifuncional - 2 Pretos',
    '2brancos': 'Armário HomeFlex de Aço Multifuncional - 2 Brancos',
    '1cada': 'Armário HomeFlex de Aço Multifuncional - 1 Preto e 1 Branco',
  };

  // Init TikTok pixels + identify user + fetch redirect URL
  useEffect(() => {
    const init = async () => {
      await initTikTokPixels();
      const visitorId = (() => { try { return localStorage.getItem('visitor_id') || undefined; } catch { return undefined; } })();
      identifyTikTokUser(customerEmail, customerPhone, visitorId);
      // Fetch redirect URL from config
      const { data: config } = await supabase
        .from('gateway_config')
        .select('redirect_url')
        .eq('id', 'active')
        .maybeSingle();
      if (config?.redirect_url) {
        setRedirectUrl(config.redirect_url);
      }
    };
    init();
  }, [customerEmail, customerPhone]);

  // Poll for payment status - aggressive polling for Duttyfy since it has no webhooks
  useEffect(() => {
    if (!externalRef || paymentStatus === 'paid') return;

    let isActive = true;
    let pollInterval = 3000; // Start at 3s
    let timeoutId: ReturnType<typeof setTimeout>;
    let consecutiveChecks = 0;

    const checkStatus = async () => {
      if (!isActive) return;
      consecutiveChecks++;
      try {
        const { data: fnData, error } = await supabase.functions.invoke('check-pix-status', {
          body: { externalRef },
        });

        if (!error && fnData?.status === 'paid') {
          setPaymentStatus('paid');
          setOrderAmount(prev => prev || fnData.amount);
          return; // Stop polling
        }
      } catch (e) {
        console.error('Poll error:', e);
      }

      if (isActive) {
        // Keep 3s for first 60 checks (~3 min), then slow to 5s
        if (consecutiveChecks > 60) {
          pollInterval = 5000;
        }
        timeoutId = setTimeout(checkStatus, pollInterval);
      }
    };

    // First check immediately
    checkStatus();

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [externalRef, paymentStatus]);

  // Timer
  useEffect(() => {
    if (secondsLeft <= 0 || paymentStatus === 'paid') return;
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft, paymentStatus]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const timerStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const now = new Date();
  const deadline = new Date(now.getTime() + 600000);
  const deadlineTime = deadline.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const deadlineDate = `${deadline.getDate()} de ${months[deadline.getMonth()]} ${deadline.getFullYear()}`;

  const copyPasteCode = pixData?.paymentData?.copyPaste || pixData?.pixCode || pixData?.paymentData?.qrCode || '';
  const qrCodeBase64 = pixData?.paymentData?.qrCodeBase64 || pixData?.qrCodeBase64 || null;
  const qrCodeUrl = pixData?.paymentData?.qrCode || pixData?.pixCode || '';

  const handleCopy = async () => {
    if (!copyPasteCode) return;
    try {
      await navigator.clipboard.writeText(copyPasteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = copyPasteCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // ===== PAID: Redirect to /envioup (Upsell 1) =====
  useEffect(() => {
    if (paymentStatus !== 'paid' || paidTracked || !externalRef) return;

    let cancelled = false;

    const sendPurchase = async () => {
      await trackCompletePaymentAsync(orderAmount || total, 'BRL', `purchase_${externalRef}`, {
        contentId: 'armario-homeflex',
        contentName: variantNames[color] || 'Armário HomeFlex de Aço Multifuncional',
        quantity: 1,
      });

      if (!cancelled) {
        setPaidTracked(true);
      }
    };

    sendPurchase();

    return () => {
      cancelled = true;
    };
  }, [paymentStatus, paidTracked, externalRef, orderAmount, total, color]);

  useEffect(() => {
    if (paymentStatus !== 'paid' || !paidTracked) return;
    try { navigate('/envioup', { replace: true }); } catch {}
    const t = setTimeout(() => { window.location.replace('/envioup'); }, 700);
    return () => clearTimeout(t);
  }, [paymentStatus, paidTracked, navigate]);

  // No pixData and no ref param = nothing to show
  if (!pixData && !externalRef) {
    return (
      <div className="min-h-screen bg-white max-w-md mx-auto flex flex-col items-center justify-center p-6">
        <p className="text-gray-500 text-sm mb-4">Nenhum pagamento encontrado.</p>
        <button onClick={() => navigate('/')} className="text-primary font-medium text-sm">Voltar ao início</button>
      </div>
    );
  }

  const displayTotal = orderAmount || total;

  if (paymentStatus === 'paid') {
    return (
      <div className="min-h-screen max-w-md mx-auto flex items-center justify-center">
        <p className="text-gray-500 text-sm">Redirecionando...</p>
      </div>
    );
  }

  // ===== PENDING PAYMENT SCREEN =====
  const displayCode = copyPasteCode.length > 36 ? copyPasteCode.slice(0, 36) + '...' : copyPasteCode;

  return (
    <div className="min-h-screen max-w-md mx-auto flex flex-col" style={{ background: 'linear-gradient(180deg, #c9daf8 0%, #e8edf8 15%, #f5f0f0 30%, #fce8ec 50%, #fce4ec 70%, #fce4ec 100%)' }}>
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="p-1">
          <ArrowLeft className="h-5 w-5 text-gray-800" />
        </button>
        <h1 className="flex-1 text-center text-[15px] font-semibold text-gray-900">Código do pagamento</h1>
        <div className="w-6" />
      </div>

      <div className="px-5 pt-6 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[22px] font-extrabold text-gray-900 leading-tight">Aguardando o pagamento</h2>
            <p className="text-[22px] font-extrabold text-gray-900">{formatBRL(displayTotal)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <span className="text-[13px] text-gray-600">Vence em</span>
          <span className="inline-flex items-center gap-1 text-white text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: '#2dc653' }}>
            🕐 {timerStr}
          </span>
        </div>

        <p className="text-[13px] text-gray-500 mt-1">
          Prazo <span className="font-bold text-gray-900">{deadlineTime}, {deadlineDate}</span>
        </p>
      </div>

      <div className="px-5 pt-5 pb-4">
        <div className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.08)] border border-gray-100 px-5 py-5">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-sm">💠</span>
            <span className="text-sm font-bold text-gray-900">PIX</span>
          </div>

          {(qrCodeBase64 || qrCodeUrl || copyPasteCode) && (
            <div className="flex justify-center mb-5">
              {qrCodeBase64 ? (
                <img
                  src={qrCodeBase64.startsWith('data:') ? qrCodeBase64 : qrCodeBase64.startsWith('http') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="w-48 h-48 rounded-lg"
                />
              ) : (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl || copyPasteCode)}`}
                  alt="QR Code PIX"
                  className="w-48 h-48 rounded-lg"
                />
              )}
            </div>
          )}

          <p className="text-[17px] font-mono font-semibold text-gray-900 leading-relaxed mb-5 break-all">
            {displayCode}
          </p>

          <button
            onClick={handleCopy}
            className={`w-full flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold transition-colors ${
              copied ? "text-white" : "text-white active:opacity-90"
            }`}
            style={{ background: copied ? '#2dc653' : '#F23D6B' }}
          >
            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>

        <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
          Para acessar esta página no app, abra <span className="font-bold text-gray-700">Loja</span> &gt; <span className="font-bold text-gray-700">Pedidos</span> &gt; <span className="font-bold text-gray-700">Sem pagamento</span>{"\n"}&gt; <span className="text-primary font-semibold">Visualizar o código</span>
        </p>
      </div>

      <div className="px-5 pt-5 pb-8 flex-1 space-y-4 bg-white">
        <div className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.06)] border border-gray-100 p-5">
          <h3 className="text-[15px] font-bold text-gray-900 mb-2">Como fazer pagamentos com PIX?</h3>
          <p className="text-[13px] text-gray-500 leading-relaxed">
            Copie o código de pagamento acima, selecione Pix no seu app de internet ou de banco e cole o código.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.06)] border border-gray-100 p-5">
          <p className="text-[14px] font-bold text-gray-900 mb-1">⚠️ Atenção:</p>
          <p className="text-[13px] text-gray-500 leading-relaxed">
            Os bancos reforçaram a segurança do Pix e podem exibir avisos preventivos. Não se preocupe, sua transação está protegida.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PixPayment;
