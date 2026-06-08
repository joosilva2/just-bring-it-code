import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { prefetchCheckout } from "@/lib/prefetchCheckout";

type Msg = { role: "user" | "assistant"; content: string };

const INITIAL: Msg = {
  role: "assistant",
  content: "Oi! 😍 Sou a Sofia, consultora da MesaLar. Posso te ajudar com qualquer dúvida sobre o Armário HomeFlex! Em que posso ajudar?",
};

interface ChatWidgetProps {
  open: boolean;
  onClose: () => void;
}

const ChatWidget = ({ open, onClose }: ChatWidgetProps) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([INITIAL]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const parseCheckoutTag = (raw: string): { clean: string; variant: string | null } => {
    const match = raw.match(/\[CHECKOUT:(2pretos|2brancos|1cada)\]/i);
    if (!match) return { clean: raw, variant: null };
    const clean = raw.replace(match[0], "").trim();
    return { clean, variant: match[1].toLowerCase() };
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    // Pré-carrega checkout assim que o usuário fala em comprar
    if (/comprar|levar|quero|finaliz|fechar|checkout/i.test(text)) {
      prefetchCheckout();
    }
    try {
      let vid = "";
      try {
        vid = localStorage.getItem("visitor_id") || "";
        if (!vid) {
          vid = `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
          localStorage.setItem("visitor_id", vid);
        }
      } catch {}
      const { data, error } = await supabase.functions.invoke("product-chat", {
        body: { messages: next, visitor_id: vid },
      });
      if (error) throw error;
      const rawReply = (data as any)?.reply || "Posso te ajudar com mais alguma coisa? 💖";
      const { clean, variant } = parseCheckoutTag(rawReply);
      setMessages((prev) => [...prev, { role: "assistant", content: clean || rawReply }]);

      if (variant) {
        prefetchCheckout();
        setTimeout(() => {
          onClose();
          navigate("/checkout", { state: { color: variant } });
        }, 1200);
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Ops, tive um probleminha agora 😅 mas posso te garantir: esse armário tá com quase 50% OFF! Quer aproveitar?" },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };


  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex max-w-md flex-col rounded-t-2xl bg-white shadow-2xl animate-in slide-in-from-bottom" style={{ height: "85vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold text-red-600">S</div>
            <div>
              <p className="text-sm font-bold leading-tight">Sofia • MesaLar</p>
              <p className="text-[11px] opacity-90 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-400 inline-block" />
                Online agora
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50 px-3 py-4 space-y-2">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-red-500 text-white rounded-br-sm"
                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-gray-200 bg-white px-3 py-2 pb-4 flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Digite sua dúvida..."
            className="flex-1 rounded-full border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-red-400"
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white disabled:bg-gray-300"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatWidget;
