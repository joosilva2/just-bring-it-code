import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Mail, Eye, EyeOff, Download, LogOut, FileSpreadsheet, MessageCircleQuestion, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";

type Order = {
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_document: string | null;
  shipping_zip: string | null;
  shipping_street: string | null;
  shipping_number: string | null;
  shipping_complement: string | null;
  shipping_neighborhood: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  amount: number;
  status: string;
  product_type: string;
  gateway: string;
  created_at: string;
  paid_at: string | null;
};

const AdminLeads = () => {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  // login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // export
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [exporting, setExporting] = useState(false);

  // chat questions
  type Q = { id: string; visitor_id: string | null; question: string; created_at: string };
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [qSearch, setQSearch] = useState("");
  const [qDays, setQDays] = useState(7);

  const loadQuestions = async (days = qDays) => {
    setLoadingQ(true);
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("chat_questions")
        .select("id,visitor_id,question,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      setQuestions((data as Q[]) || []);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar perguntas");
    } finally {
      setLoadingQ(false);
    }
  };

  const topKeywords = useMemo(() => {
    const stop = new Set(["a","o","as","os","de","do","da","dos","das","e","é","em","no","na","nos","nas","um","uma","uns","umas","para","pra","por","com","sem","que","se","ou","mas","ja","já","aí","ai","tem","ter","ele","ela","isso","esse","essa","eu","voce","você","vcs","quanto","qual","quais","como","quando","onde","porque","oi","ola","olá","sim","nao","não","ok","tudo","bem","mais","muito","muita","ser","esta","está","estao","estão","faz","aqui","la","lá","minha","meu","meus","minhas","pode","posso","quero","ento","então","então","só","so"]);
    const counts: Record<string, number> = {};
    questions.forEach((q) => {
      q.question.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !stop.has(w))
        .forEach((w) => { counts[w] = (counts[w] || 0) + 1; });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    const s = qSearch.trim().toLowerCase();
    if (!s) return questions;
    return questions.filter((q) => q.question.toLowerCase().includes(s));
  }, [questions, qSearch]);

  const exportQuestions = () => {
    if (filteredQuestions.length === 0) { toast.warning("Sem perguntas para exportar"); return; }
    const rows = filteredQuestions.map((q) => ({
      Pergunta: q.question,
      Visitante: q.visitor_id || "",
      "Data/Hora": new Date(q.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    (ws as any)["!cols"] = [{ wch: 80 }, { wch: 25 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Perguntas");
    XLSX.writeFile(wb, `perguntas_ia_${new Date().toISOString().slice(0,10)}.xlsx`);
  };


  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: roleData } = await supabase
          .from("user_roles").select("role")
          .eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
        if (roleData) setAuthed(true);
      }
      setChecking(false);
    })();
  }, []);

  useEffect(() => {
    if (authed) loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Preencha todos os campos"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error("Email ou senha incorretos"); return; }
      if (data.user) {
        const { data: roleData } = await supabase
          .from("user_roles").select("role")
          .eq("user_id", data.user.id).eq("role", "admin").single();
        if (!roleData) {
          toast.error("Acesso negado");
          await supabase.auth.signOut();
          return;
        }
        setAuthed(true);
        toast.success("Login realizado!");
      }
    } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthed(false);
    navigate("/admin1");
  };

  const fetchOrders = async (status: "paid" | "pending"): Promise<Order[]> => {
    const startISO = new Date(`${startDate}T00:00:00-03:00`).toISOString();
    const endISO = new Date(`${endDate}T23:59:59-03:00`).toISOString();
    const dateCol = status === "paid" ? "paid_at" : "created_at";

    const pageSize = 1000;
    let all: Order[] = [];
    let from = 0;
    while (true) {
      let q = supabase
        .from("orders")
        .select("customer_name,customer_email,customer_phone,customer_document,shipping_zip,shipping_street,shipping_number,shipping_complement,shipping_neighborhood,shipping_city,shipping_state,amount,status,product_type,gateway,created_at,paid_at")
        .eq("status", status)
        .gte(dateCol, startISO)
        .lte(dateCol, endISO)
        .order(dateCol, { ascending: false })
        .range(from, from + pageSize - 1);
      const { data, error } = await q;
      if (error) throw error;
      if (!data || data.length === 0) break;
      all = all.concat(data as Order[]);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return all;
  };

  const exportExcel = async (status: "paid" | "pending") => {
    setExporting(true);
    try {
      const orders = await fetchOrders(status);
      if (orders.length === 0) {
        toast.warning("Nenhum lead encontrado nesse período");
        return;
      }
      const rows = orders.map((o) => ({
        Nome: o.customer_name,
        Email: o.customer_email,
        Telefone: o.customer_phone || "",
        CPF: o.customer_document || "",
        CEP: o.shipping_zip || "",
        Rua: o.shipping_street || "",
        Numero: o.shipping_number || "",
        Complemento: o.shipping_complement || "",
        Bairro: o.shipping_neighborhood || "",
        Cidade: o.shipping_city || "",
        Estado: o.shipping_state || "",
        "Valor (R$)": (o.amount / 100).toFixed(2),
        Produto: o.product_type,
        Gateway: o.gateway,
        Status: o.status,
        "Criado em": new Date(o.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        "Pago em": o.paid_at ? new Date(o.paid_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      // auto width
      const colWidths = Object.keys(rows[0]).map((k) => ({
        wch: Math.min(40, Math.max(k.length + 2, ...rows.map((r: any) => String(r[k] ?? "").length + 2))),
      }));
      (ws as any)["!cols"] = colWidths;
      const wb = XLSX.utils.book_new();
      const label = status === "paid" ? "Pagos" : "Pix_Gerados";
      XLSX.utils.book_append_sheet(wb, ws, label);
      const fileName = `leads_${label}_${startDate}_a_${endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`${orders.length} leads exportados`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao exportar");
    } finally {
      setExporting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-white">Admin · Leads</h1>
              <p className="text-gray-400 text-sm mt-2">Exportação de clientes</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@exemplo.com"
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input id="password" type={showPassword ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                    className="pl-10 pr-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-red-600 text-white">
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-7 w-7 text-primary" /> Exportar Leads
            </h1>
            <p className="text-gray-400 text-sm mt-1">Gere planilhas Excel dos seus clientes por período</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="border-gray-700 text-gray-300 hover:bg-gray-800">
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold mb-4">Filtrar por data</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Data inicial</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Data final</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            "Pagos" filtra pela data do pagamento. "Pix Gerados" filtra pela data de criação do pedido (status pendente).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => exportExcel("paid")}
            disabled={exporting}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-2xl p-6 text-left transition-colors">
            <Download className="h-6 w-6 mb-3" />
            <div className="font-bold text-lg">Clientes que Pagaram</div>
            <div className="text-sm text-green-100 mt-1">Baixar Excel com todos os pagantes do período</div>
          </button>
          <button
            onClick={() => exportExcel("pending")}
            disabled={exporting}
            className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 rounded-2xl p-6 text-left transition-colors">
            <Download className="h-6 w-6 mb-3" />
            <div className="font-bold text-lg">Apenas Geraram Pix</div>
            <div className="text-sm text-yellow-100 mt-1">Baixar Excel dos leads que não finalizaram</div>
          </button>
        </div>

        {exporting && (
          <div className="text-center text-gray-400 text-sm mt-6">Gerando planilha…</div>
        )}

        {/* Perguntas feitas para a IA */}
        <div className="mt-10 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <MessageCircleQuestion className="h-5 w-5 text-primary" />
                Perguntas para a IA (Sofia)
              </h2>
              <p className="text-xs text-gray-500 mt-1">Descubra o que seus leads mais perguntam</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={qDays}
                onChange={(e) => { const d = Number(e.target.value); setQDays(d); loadQuestions(d); }}
                className="bg-gray-800 border border-gray-700 text-white text-sm rounded-md px-2 py-2"
              >
                <option value={1}>Últimas 24h</option>
                <option value={7}>Últimos 7 dias</option>
                <option value={30}>Últimos 30 dias</option>
                <option value={90}>Últimos 90 dias</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => loadQuestions()} disabled={loadingQ}
                className="border-gray-700 text-gray-300 hover:bg-gray-800">
                <RefreshCw className={`h-4 w-4 ${loadingQ ? "animate-spin" : ""}`} />
              </Button>
              <Button size="sm" onClick={exportQuestions} className="bg-primary hover:bg-red-600">
                <Download className="h-4 w-4 mr-1" /> Excel
              </Button>
            </div>
          </div>

          {topKeywords.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">Palavras mais citadas:</p>
              <div className="flex flex-wrap gap-2">
                {topKeywords.map(([w, c]) => (
                  <button
                    key={w}
                    onClick={() => setQSearch(w)}
                    className="px-2.5 py-1 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-xs text-gray-200"
                  >
                    {w} <span className="text-primary font-semibold">{c}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Input
            value={qSearch}
            onChange={(e) => setQSearch(e.target.value)}
            placeholder="Filtrar perguntas..."
            className="bg-gray-800 border-gray-700 text-white mb-3"
          />

          <div className="text-xs text-gray-500 mb-2">
            {filteredQuestions.length} de {questions.length} perguntas
          </div>

          <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-800 border border-gray-800 rounded-lg">
            {loadingQ && questions.length === 0 && (
              <div className="p-6 text-center text-gray-500 text-sm">Carregando...</div>
            )}
            {!loadingQ && filteredQuestions.length === 0 && (
              <div className="p-6 text-center text-gray-500 text-sm">Nenhuma pergunta encontrada nesse período.</div>
            )}
            {filteredQuestions.map((q) => (
              <div key={q.id} className="p-3 hover:bg-gray-800/50">
                <p className="text-sm text-white">{q.question}</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  {new Date(q.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  {q.visitor_id && <span className="ml-2">· {q.visitor_id.slice(0, 14)}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLeads;
