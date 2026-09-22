import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, ShieldCheck, Star, ChevronRight, ChevronUp, ChevronDown, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId } from "@/lib/tracking";
import { initTikTokPixels, trackInitiateCheckout, getStoredUtmParams } from "@/lib/tiktokPixel";
import useVisitorPresence from "@/hooks/useVisitorPresence";
import flexV2pretos from "@/assets/flex-variant-2pretos.png";
import flexV2brancos from "@/assets/flex-variant-2brancos.png";
import flexV1cada from "@/assets/flex-variant-1cada.png";
import pixIcon from "@/assets/pix-icon.png";
type VariantValue = "2pretos" | "2brancos" | "1cada";

const VARIANT_PRODUCT_LABELS: Record<VariantValue, string> = {
  "2pretos": "Armário HomeFlex de Aço Multifuncional - 2 Pretos",
  "2brancos": "Armário HomeFlex de Aço Multifuncional - 2 Brancos",
  "1cada": "Armário HomeFlex de Aço Multifuncional - 1 Preto e 1 Branco",
};

interface CheckoutState {
  color: VariantValue;
}
const UNIT_PRICE = 6420;
const ORIGINAL_UNIT = 14990;
const EXPRESS_SHIPPING = 853;
const formatCPF = (v: string) => {
  const n = v.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`;
  if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
};
const formatPhone = (v: string) => {
  const n = v.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
};
const formatCEP = (v: string) => {
  const n = v.replace(/\D/g, '').slice(0, 8);
  if (n.length <= 5) return n;
  return `${n.slice(0, 5)}-${n.slice(5)}`;
};
const validateCPF = (cpf: string) => {
  const nums = cpf.replace(/\D/g, '');
  if (nums.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(nums)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(nums[i]) * (10 - i);
  let rest = sum * 10 % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(nums[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(nums[i]) * (11 - i);
  rest = sum * 10 % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(nums[10]);
};
const generateValidCPF = () => {
  const n: number[] = [];
  for (let i = 0; i < 9; i++) n.push(Math.floor(Math.random() * 10));
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += n[i] * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  n.push(d1);
  sum = 0;
  for (let i = 0; i < 10; i++) sum += n[i] * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  n.push(d2);
  return n.join('');
};
const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const formatBRL = (cents: number) => (cents / 100).toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});
const Checkout = () => {
  useVisitorPresence("checkout-users");
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as CheckoutState | null;
  const color: VariantValue = state?.color || "2pretos";
  const errorRef = useRef<HTMLDivElement>(null);
  const addressRef = useRef<HTMLDivElement>(null);
  const cpfRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [couponTime, setCouponTime] = useState({ minutes: 10, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      setCouponTime((prev) => {
        let { minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) {
          seconds = 59;
          minutes--;
        }
        if (minutes < 0) {
          minutes = 9;
          seconds = 59;
        }
        return { minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sections open/close
  const [addressOpen, setAddressOpen] = useState(true);
  const [_cpfOpen, setCpfOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [subtotalOpen, setSubtotalOpen] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [cep, setCep] = useState("");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  // Quantity & Shipping & Coupon
  const [qty, setQty] = useState(1);
  const [shippingOption, setShippingOption] = useState<"standard" | "express">("standard");
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState("");
  const productName = VARIANT_PRODUCT_LABELS[color];

  // Auto-apply coupon from sessionStorage (exit intent popup)
  useEffect(() => {
    const saved = sessionStorage.getItem("exit_coupon_applied");
    if (saved === "VOLTA25") {
      setCouponCode("VOLTA25");
      setCouponApplied(true);
    }
  }, []);

  const VALID_COUPONS: Record<string, number> = { "VOLTA25": 0.25 };
  const activeCouponDiscount = couponApplied && VALID_COUPONS[couponCode.toUpperCase()] ? VALID_COUPONS[couponCode.toUpperCase()] : 0;
  const shippingCost = shippingOption === "express" ? EXPRESS_SHIPPING : 0;
  const subtotal = UNIT_PRICE * qty;
  const originalTotal = ORIGINAL_UNIT * qty;
  const discount = originalTotal - subtotal;
  const couponDiscount = couponApplied ? Math.round(subtotal * activeCouponDiscount) : 0;
  const total = subtotal - couponDiscount + shippingCost;
  const discountPercent = Math.round(discount / originalTotal * 100);
  const addressFilled = !!(name.trim() && name.trim().split(' ').length >= 2 && phone.replace(/\D/g, '').length >= 10 && validateEmail(email.trim()) && cep.replace(/\D/g, '').length === 8 && estado && cidade.trim() && bairro.trim() && endereco.trim() && numero.trim());
  const cpfFilled = cpf.replace(/\D/g, '').length === 11;
  const _cpfValid = cpfFilled && validateCPF(cpf);

  // Clear top error when user fills fields
  useEffect(() => {
    if (error && !validate()) {
      setError("");
    }
  }, [name, phone, email, cpf, cep, estado, cidade, bairro, endereco, numero]);

  // Auto-close address section once all fields are filled
  const autoClosedRef = useRef(false);
  useEffect(() => {
    if (addressFilled && addressOpen && !autoClosedRef.current) {
      autoClosedRef.current = true;
      const t = setTimeout(() => setAddressOpen(false), 400);
      return () => clearTimeout(t);
    }
    if (!addressFilled) autoClosedRef.current = false;
  }, [addressFilled, addressOpen]);

  // Scroll to top on mount so form fields are visible first
  useEffect(() => {
    window.scrollTo(0, 0);
    // Marca que o usuário esteve no checkout — usado pelo ExitIntentPopup
    // para disparar a promoção quando ele volta pra home.
    try { sessionStorage.setItem("visited_checkout", "true"); } catch {}
  }, []);

  // Track checkout visit + presence + TikTok pixel
  useEffect(() => {
    const visitorId = getVisitorId();
    const utms = getStoredUtmParams();
    const eventId = `ic_${visitorId}_${Date.now()}`;
    const ttpCookie = (() => {
      try {
        const m = document.cookie.match(/(?:^|;\s*)_ttp=([^;]+)/);
        return m ? decodeURIComponent(m[1]) : null;
      } catch { return null; }
    })();
    supabase.from("checkout_events").insert({
      visitor_id: visitorId,
      event_type: "checkout_visit",
      metadata: {
        event_id: eventId,
        value: total / 100,
        currency: 'BRL',
        url: window.location.href,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        ttp: ttpCookie,
        ...utms,
      } as any,
    }).then(({ error }) => {
      if (error) console.error('checkout_visit insert error:', error);
    });
    initTikTokPixels();
    trackInitiateCheckout(total, 'BRL', eventId, { contentId: 'armario-homeflex', contentName: productName, quantity: qty });
    const channel = supabase.channel("checkout-users", {
      config: {
        presence: {
          key: visitorId
        }
      }
    });
    channel.subscribe(async status => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          online_at: new Date().toISOString()
        });
      }
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-close address on número blur (after short delay) if all fields filled
  const handleNumeroBlur = () => {
    // Don't auto-close anymore here; let CPF completion handle it
  };

  // Handle CPF change with validation
  const handleCpfChange = (value: string) => {
    const formatted = formatCPF(value);
    setCpf(formatted);
    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 11) {
      if (validateCPF(formatted)) {
        setCpfError("");
        // Track CPF filled event
        supabase.from("checkout_events").insert({
          visitor_id: getVisitorId(),
          event_type: "address_complete"
        }).then(({
          error
        }) => {
          if (error) console.error('cpf_filled insert error:', error);
        });
        // Close address section after CPF is valid
        if (addressFilled) {
          setTimeout(() => setAddressOpen(false), 400);
        }
      } else {
        setCpfError("CPF inválido. Verifique os números.");
      }
    } else {
      setCpfError("");
    }
  };
  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEstado(data.uf || "");
        setCidade(data.localidade || "");
        setBairro(data.bairro || "");
        setEndereco(data.logradouro || "");
      }
    } catch {/* ignore */} finally {
      setCepLoading(false);
    }
  };
  const validate = () => {
    if (!name.trim() || name.trim().split(' ').length < 2) return "Insira seu nome completo (nome e sobrenome)";
    if (phone.replace(/\D/g, '').length < 10 || phone.replace(/\D/g, '').length > 11) return "Insira um telefone válido com DDD";
    if (!validateEmail(email.trim())) return "Insira um e-mail válido";
    
    if (cep.replace(/\D/g, '').length !== 8) return "Insira um CEP válido";
    if (!estado || estado.length !== 2) return "Selecione o estado (UF)";
    if (!cidade.trim()) return "Insira a cidade";
    if (!bairro.trim()) return "Insira o bairro";
    if (!endereco.trim()) return "Insira o endereço";
    if (!numero.trim()) return "Insira o número";
    return null;
  };
  const handleSubmit = async () => {
    // Track buy click
    supabase.from("checkout_events").insert({
      visitor_id: getVisitorId(),
      event_type: "buy_click"
    }).then(({
      error
    }) => {
      if (error) console.error('buy_click insert error:', error);
    });

    // Open address section if anything is missing
    if (!addressFilled) {
      setAddressOpen(true);
    } else {
      setAddressOpen(false);
    }
    const err = validate();
    if (err) {
      setError(err);
      // Scroll to the very top so the error message is fully visible
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }, 100);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const utmParams = getStoredUtmParams();
      // Capture TikTok browser cookie (_ttp) for EMQ
      const ttpCookie = (() => {
        try {
          const m = document.cookie.match(/(?:^|;\s*)_ttp=([^;]+)/);
          return m ? decodeURIComponent(m[1]) : null;
        } catch { return null; }
      })();
      const {
        data,
        error: fnError
      } = await supabase.functions.invoke('create-pix-payment', {
        body: {
          color,
          amount: total,
          customer: {
            name: name.trim(),
            email: email.trim(),
            phone: phone.replace(/\D/g, ''),
            document: {
              number: (cpf.replace(/\D/g, '') || generateValidCPF()),
              type: 'cpf'
            }
          },
          shipping: {
            street: endereco.trim(),
            number: numero.trim(),
            complement: complemento.trim(),
            neighborhood: bairro.trim(),
            city: cidade.trim(),
            state: estado,
            zipCode: cep.replace(/\D/g, '')
          },
          tracking: { ...utmParams, ttp: ttpCookie, page_url: window.location.href, referrer: document.referrer || null },
          product_name: productName,
          product_type: 'mesa'
        }
      });
      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || 'Erro ao gerar pagamento');

      // Track order placed
      supabase.from("checkout_events").insert({
        visitor_id: getVisitorId(),
        event_type: "order_placed"
      }).then(({
        error
      }) => {
        if (error) console.error('order_placed insert error:', error);
      });

      // Navigate to PIX page with data
      navigate('/pix', {
        state: {
          pixData: data.data,
          total,
          color,
          externalRef: data.data?.externalRef || data.data?.external_ref,
          customerEmail: email,
          customerPhone: phone.replace(/\D/g, ''),
        }
      });
    } catch (e: any) {
      console.error('Checkout error:', e);
      setError(e.message || 'Erro ao processar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  const variantMap: Record<VariantValue, { image: string; label: string }> = {
    "2pretos": { image: flexV2pretos, label: "2 Pretos" },
    "2brancos": { image: flexV2brancos, label: "2 Brancos" },
    "1cada": { image: flexV1cada, label: "1 Preto e 1 Branco" },
  };
  const productImage = variantMap[color].image;
  const colorLabel = variantMap[color].label;
  return <div className="min-h-screen bg-gray-50 max-w-md mx-auto overflow-x-hidden w-full">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-base font-semibold text-gray-800">Resumo do pedido</h1>
          <p className="text-xs text-emerald-600 flex items-center justify-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Seus dados estão seguros conosco
          </p>
        </div>
        <div className="w-6" />
      </div>

      {/* Error - shown at top */}
      {error && <div ref={errorRef} className="px-4 py-2 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600 font-medium text-center">⚠️ {error}</p>
        </div>}

      {/* Address section */}
      <div ref={addressRef} className="bg-white border-b border-gray-100">
        <button onClick={() => setAddressOpen(!addressOpen)} className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left">
          <div className="flex items-start gap-2.5 flex-shrink-0 max-w-[45%]">
            <MapPin className="h-4 w-4 text-gray-700 mt-0.5 flex-shrink-0" />
            <span className="text-sm font-bold text-gray-900 leading-tight">Endereço de envio</span>
          </div>
          {addressFilled ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
              <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>
              <span className="text-sm text-gray-400 truncate">{endereco}, {numero}</span>
            </div>
          ) : (
            <span className="text-sm font-medium text-primary">+ Adicionar endereço</span>
          )}
        </button>
        {addressOpen && <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5">
              <span className="text-sm text-gray-400 whitespace-nowrap">+55</span>
              <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="Telefone com DDD" className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none" />
            </div>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="E-mail" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
            <input value={cep} onChange={e => setCep(formatCEP(e.target.value))} onBlur={handleCepBlur} placeholder="CEP" inputMode="numeric" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
            {cepLoading && <p className="text-xs text-gray-400">Buscando endereço...</p>}
            <div className="grid grid-cols-2 gap-2">
              <input value={estado} onChange={e => setEstado(e.target.value.toUpperCase().slice(0, 2))} placeholder="UF" maxLength={2} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
              <input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
            </div>
            <input value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Bairro" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
            <input value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Endereço (rua, avenida...)" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
            <div className="grid grid-cols-2 gap-2">
              <input value={numero} onChange={e => setNumero(e.target.value)} onBlur={handleNumeroBlur} placeholder="Número" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
              <input value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Complemento" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
            </div>
          </div>}
      </div>

      {/* Dashed separator */}
      <div className="px-4 py-1">
        <div className="border-t-2 border-dashed border-cyan-400" />
      </div>

      {/* Store + Product */}
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        {/* Store header */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold text-gray-800">⚠️ Poucas unidades disponíveis</span>
        </div>
        <div className="flex items-center gap-1 mb-3">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="text-xs text-emerald-600 font-medium">Muito bem avaliado! 4.8/5,0</span>
        </div>

        {/* Product row */}
        <div className="flex gap-3">
          <img src={productImage} alt="Armário HomeFlex" className="w-20 h-20 rounded-lg object-contain bg-gray-50" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800 leading-snug line-clamp-2">[PAGUE 1 LEVE 2] Armário HomeFlex de Aço Multifuncional</p>
            <p className="text-xs text-gray-500 mt-0.5">{colorLabel}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">🔄 Devolução gratuita</span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <div>
                <span className="text-sm font-bold text-primary">{formatBRL(UNIT_PRICE)}</span>
                <span className="text-[10px] text-primary ml-1">🏷</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400 line-through">{formatBRL(ORIGINAL_UNIT)}</span>
                  <span className="text-xs text-primary font-medium">-{discountPercent}%</span>
                </div>
              </div>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-2.5 py-1.5 text-gray-400 active:bg-gray-100">
                  <Minus className="h-3 w-3" />
                </button>
                <span className="px-3 py-1.5 text-sm text-gray-800 border-x border-gray-200 min-w-[32px] text-center">{qty}</span>
                <button onClick={() => setQty(q => Math.min(10, q + 1))} className="px-2.5 py-1.5 text-gray-400 active:bg-gray-100">
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shipping options */}
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Opções de envio</h3>
        
        {/* Standard - Free */}
        <button onClick={() => setShippingOption("standard")} className={`w-full flex items-center justify-between py-3 px-3 rounded-lg mb-2 border transition-colors ${shippingOption === "standard" ? "border-primary bg-primary/5" : "border-gray-200"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${shippingOption === "standard" ? "border-primary" : "border-gray-300"}`}>
              {shippingOption === "standard" && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-800 font-medium">Envio Padrão</p>
              <p className="text-xs text-gray-500">3 a 7 dias úteis</p>
            </div>
          </div>
          <span className="text-sm font-bold text-emerald-600">Grátis</span>
        </button>

        {/* Express */}
        <button onClick={() => setShippingOption("express")} className={`w-full flex items-center justify-between py-3 px-3 rounded-lg border transition-colors ${shippingOption === "express" ? "border-primary bg-primary/5" : "border-gray-200"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${shippingOption === "express" ? "border-primary" : "border-gray-300"}`}>
              {shippingOption === "express" && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-800 font-medium">TikTok Express</p>
              <p className="text-xs text-gray-500">1 a 3 dias úteis</p>
            </div>
          </div>
          <span className="text-sm font-bold text-gray-800">{formatBRL(EXPRESS_SHIPPING)}</span>
        </button>
      </div>

      {/* Discount row */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-primary text-sm">🏷</span>
          <span className="text-sm font-medium text-gray-800">Desconto especial</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-primary">- {formatBRL(discount)}</span>
          <ChevronRight className="h-4 w-4 text-gray-300" />
        </div>
      </div>

      {/* Order summary */}
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Resumo do pedido</h3>

        {/* Subtotal expandable */}
        <button onClick={() => setSubtotalOpen(!subtotalOpen)} className="w-full flex items-center justify-between text-sm text-gray-700 mb-1">
          <div className="flex items-center gap-1">
            <span>Subtotal do produto ({qty}x)</span>
            {subtotalOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </div>
          <span>{formatBRL(subtotal)}</span>
        </button>

        {subtotalOpen && <div className="ml-4 space-y-1 mb-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Preço original ({qty}x)</span>
              <span>{formatBRL(originalTotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Desconto da loja</span>
              <span className="text-primary">- {formatBRL(discount)}</span>
            </div>
          </div>}

        {couponApplied && (
          <div className="flex justify-between text-sm text-emerald-600 mb-1">
            <span>Cupom {couponCode.toUpperCase()} (-{Math.round(activeCouponDiscount * 100)}%)</span>
            <span className="font-medium">- {formatBRL(couponDiscount)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Taxa de envio</span>
          {shippingCost === 0 ? <span className="text-emerald-600 font-medium">Grátis</span> : <span className="text-gray-800 font-medium">{formatBRL(shippingCost)}</span>}
        </div>

        <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between items-baseline">
          <span className="text-sm font-bold text-gray-800">Total</span>
          <div className="text-right">
            <span className="text-base font-bold text-gray-800">{formatBRL(total)}</span>
            <p className="text-[10px] text-gray-400">Impostos inclusos</p>
          </div>
        </div>
      </div>

      {/* Payment method */}
      <div className="bg-white px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800">Forma de pagamento</h3>
          {couponApplied && (
            <span className="text-xs font-bold text-emerald-600">Cupom {couponCode} (-25%) ativo ✓</span>
          )}
        </div>
        
        {/* Pix option - selected */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <img src={pixIcon} alt="Pix" className="w-5 h-5" />
            <span className="text-sm text-gray-800">Pix</span>
          </div>
          <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          </div>
        </div>

        <div className="border-t border-gray-100 my-2" />

        {/* Terms */}
        <p className="text-[11px] text-gray-500 leading-relaxed">
          Ao fazer um pedido, você concorda com os <span className="font-semibold text-gray-700">Termos de uso e venda</span> e reconhece que leu e concorda com a <span className="font-semibold text-gray-700">Política de privacidade</span>.
        </p>

        {/* Savings badge */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-base">😊</span>
          <span className="text-xs text-emerald-600 font-medium">Você está economizando {formatBRL(discount + couponDiscount)} nesse pedido.</span>
        </div>
      </div>


      {/* Spacer for fixed bottom bar */}
      <div className="h-32" />

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] max-w-md mx-auto">
        <div className="px-4 pt-3 pb-3">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-gray-800 font-bold">Total ({qty} {qty === 1 ? 'item' : 'itens'})</span>
            <span className="text-lg font-bold text-primary">{formatBRL(total)}</span>
          </div>
          <button onClick={handleSubmit} disabled={loading} className="w-full rounded-lg bg-[#F23D6B] py-3.5 text-sm font-bold text-white tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
            <span>{loading ? "Processando..." : "Fazer pedido"}</span>
          </button>
        </div>
      </div>
    </div>;
};
export default Checkout;