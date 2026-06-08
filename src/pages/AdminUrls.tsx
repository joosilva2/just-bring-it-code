import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Lock, Mail, Eye, EyeOff, Link2, Pencil, Check, X, ExternalLink, Copy, LogOut } from "lucide-react";

const BASE_URL = window.location.origin;

interface UrlSlug {
  id: string;
  slug: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

const AdminUrls = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [slugs, setSlugs] = useState<UrlSlug[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSlug, setEditSlug] = useState("");
  const [editLabel, setEditLabel] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email === "acessourl@uorak.com") {
      setIsAuthenticated(true);
      fetchSlugs();
    }
    setIsLoading(false);
  };

  const fetchSlugs = async () => {
    const { data, error } = await supabase
      .from("url_slugs")
      .select("*")
      .order("sort_order", { ascending: true });
    if (!error && data) setSlugs(data as UrlSlug[]);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoginLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("Email ou senha incorretos");
        return;
      }
      if (data.user?.email === "acessourl@uorak.com") {
        setIsAuthenticated(true);
        fetchSlugs();
        toast.success("Login realizado!");
      } else {
        toast.error("Acesso negado");
        await supabase.auth.signOut();
      }
    } catch {
      toast.error("Erro ao fazer login");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  const startEdit = (s: UrlSlug) => {
    setEditingId(s.id);
    setEditSlug(s.slug);
    setEditLabel(s.label);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditSlug("");
    setEditLabel("");
  };

  const saveEdit = async (id: string) => {
    const cleanSlug = editSlug.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
    if (!cleanSlug) {
      toast.error("Slug inválido");
      return;
    }
    const { error } = await supabase
      .from("url_slugs")
      .update({ slug: cleanSlug, label: editLabel || cleanSlug })
      .eq("id", id);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Esse slug já existe" : "Erro ao salvar");
      return;
    }
    toast.success("URL atualizada!");
    cancelEdit();
    fetchSlugs();
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from("url_slugs")
      .update({ is_active: !currentState })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao alterar status");
      return;
    }
    toast.success(!currentState ? "URL ativada!" : "URL desativada!");
    fetchSlugs();
  };

  const copyUrl = (slug: string) => {
    navigator.clipboard.writeText(`${BASE_URL}/${slug}`);
    toast.success("URL copiada!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <div className="w-full max-w-sm">
          <div className="bg-[#131B2E] rounded-xl p-8 border border-[#1E2A45]">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#3B82F6]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Link2 className="h-8 w-8 text-[#3B82F6]" />
              </div>
              <h1 className="text-2xl font-bold text-white">URL Manager</h1>
              <p className="text-[#64748B] text-sm mt-2">Gerencie suas URLs de campanha</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[#94A3B8] text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569]" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="pl-10 bg-[#0B1120] border-[#1E2A45] text-white placeholder:text-[#475569] focus:border-[#3B82F6] focus:ring-[#3B82F6]/20 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[#94A3B8] text-sm font-medium">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569]" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10 bg-[#0B1120] border-[#1E2A45] text-white placeholder:text-[#475569] focus:border-[#3B82F6] focus:ring-[#3B82F6]/20 rounded-xl"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94A3B8]">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loginLoading} className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white border-0 rounded-xl h-11 font-semibold">
                {loginLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] p-4 md:p-8" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3B82F6]/10 rounded-xl flex items-center justify-center">
              <Link2 className="h-5 w-5 text-[#3B82F6]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">URL Manager</h1>
              <p className="text-[#64748B] text-xs">Gerencie suas URLs de campanha</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-[#64748B] hover:text-white hover:bg-[#1E2A45] rounded-xl">
            <LogOut className="h-4 w-4 mr-1" /> Sair
          </Button>
        </div>

        <div className="space-y-3">
          {slugs.map((s, i) => (
            <div key={s.id} className={`bg-[#131B2E] border rounded-xl p-4 transition-all duration-300 ${s.is_active ? 'border-[#1E2A45] hover:border-[#3B82F6]/30' : 'border-[#1E2A45]/50 opacity-50'}`}>
              {editingId === s.id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[#3B82F6] text-xs font-semibold bg-[#3B82F6]/10 px-2.5 py-1 rounded-lg" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>#{i + 1}</span>
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Nome da conta"
                      className="flex-1 bg-[#0B1120] border-[#1E2A45] text-white text-sm h-8 focus:border-[#3B82F6] rounded-lg"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#475569] text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>/</span>
                    <Input
                      value={editSlug}
                      onChange={(e) => setEditSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase())}
                      placeholder="slug-da-url"
                      className="flex-1 bg-[#0B1120] border-[#1E2A45] text-white text-sm h-8 focus:border-[#3B82F6] rounded-lg"
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    />
                    <Button size="sm" onClick={() => saveEdit(s.id)} className="h-8 w-8 p-0 bg-[#22C55E] hover:bg-[#16A34A] rounded-lg">
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-8 w-8 p-0 text-[#64748B] hover:text-white hover:bg-[#1E2A45] rounded-lg">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-[#3B82F6] text-xs font-semibold bg-[#3B82F6]/10 px-2.5 py-1 rounded-lg shrink-0" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>#{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{s.label}</p>
                      <p className="text-[#64748B] text-xs truncate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>/{s.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Switch
                      checked={s.is_active}
                      onCheckedChange={() => toggleActive(s.id, s.is_active)}
                      className="data-[state=checked]:bg-[#22C55E] data-[state=unchecked]:bg-[#1E2A45] scale-90"
                    />
                    <Button size="sm" variant="ghost" onClick={() => copyUrl(s.slug)} className="h-8 w-8 p-0 text-[#64748B] hover:text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg" title="Copiar URL">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <a href={`${BASE_URL}/${s.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-8 w-8 text-[#64748B] hover:text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg transition-colors" title="Abrir URL">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(s)} className="h-8 w-8 p-0 text-[#64748B] hover:text-white hover:bg-[#1E2A45] rounded-lg" title="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-[#475569] text-xs text-center mt-6">
          Todas as URLs redirecionam para a página principal do produto
        </p>
      </div>
    </div>
  );
};

export default AdminUrls;
