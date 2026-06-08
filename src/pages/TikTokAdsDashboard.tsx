import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  RefreshCw, LogOut, DollarSign, Eye, MousePointer, Target,
  TrendingUp, Users, ChevronDown, ChevronUp, CheckCircle2,
  Moon, Sun, CalendarIcon, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface Advertiser {
  advertiser_id: string;
  advertiser_name: string;
  status: string;
  currency: string;
}

interface MetricRow {
  advertiser_id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  adgroup_id: string | null;
  adgroup_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpc: number;
  cpm: number;
  ctr: number;
  cost_per_conversion: number;
  reach: number;
}

interface Totals {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  reach: number;
  cpc: number;
  cpm: number;
  ctr: number;
  cost_per_conversion: number;
}

const formatCurrency = (val: number) =>
  val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatNumber = (val: number) =>
  val.toLocaleString("pt-BR");

const formatPercent = (val: number) =>
  val.toFixed(2) + "%";

const TikTokAdsDashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [selectedAdvertisers, setSelectedAdvertisers] = useState<string[]>([]);
  const [loadingAdvertisers, setLoadingAdvertisers] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const [rows, setRows] = useState<MetricRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [groupBy, setGroupBy] = useState<"campaign" | "adgroup" | "ad">("campaign");

  const [dateRange, setDateRange] = useState(7);
  const [filterDateRange, setFilterDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [useCalendarFilter, setUseCalendarFilter] = useState(false);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

  const [advertiserDropdownOpen, setAdvertiserDropdownOpen] = useState(false);

  // Theme
  const bg = darkMode ? 'bg-[#050A15]' : 'bg-[#F0F2F5]';
  const text = darkMode ? 'text-[#E8EAED]' : 'text-[#1A202C]';
  const textMuted = darkMode ? 'text-[#8B92A0]' : 'text-[#6B7280]';
  const card = darkMode ? 'bg-[#0D1621] border-[#1A2A3F]' : 'bg-white border-[#E5E7EB]';
  const btnOutline = darkMode ? 'bg-transparent border-[#1A2A3F] text-[#8B92A0] hover:bg-[#1A2A3F]' : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6]';
  const tabActive = 'bg-[#10B981] text-white';
  const tabInactive = darkMode ? 'bg-[#1A2A3F] text-[#8B92A0] border border-[#1A2A3F] hover:bg-[#0D1621]' : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F3F4F6]';
  const tableRowBorder = darkMode ? 'border-[#1A2A3F]' : 'border-[#E5E7EB]';
  const tableRowHover = darkMode ? 'hover:bg-[#1A2A3F]/50' : 'hover:bg-[#F3F4F6]';
  const tableHeaderBorder = darkMode ? 'border-[#1A2A3F]' : 'border-[#E5E7EB]';

  // Auth
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s?.user) { navigate("/admin"); return; }
      const { data: roleData } = await supabase
        .from("user_roles").select("role").eq("user_id", s.user.id).eq("role", "admin").single();
      if (!roleData) { toast.error("Acesso negado"); await supabase.auth.signOut(); navigate("/admin"); return; }
      setSession(s);
      setIsAuthChecking(false);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_OUT") navigate("/admin");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load advertisers
  const fetchAdvertisers = useCallback(async () => {
    if (!session?.access_token) return;
    setLoadingAdvertisers(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/tiktok-ads?action=list-advertisers`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAdvertisers(data.advertisers || []);
      // Auto-select all
      if (data.advertisers?.length) {
        setSelectedAdvertisers(data.advertisers.map((a: Advertiser) => a.advertiser_id));
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao carregar contas: " + err.message);
    } finally {
      setLoadingAdvertisers(false);
    }
  }, [session]);

  useEffect(() => {
    if (!isAuthChecking && session) fetchAdvertisers();
  }, [isAuthChecking, session, fetchAdvertisers]);

  // Load metrics
  const fetchMetrics = useCallback(async () => {
    if (!session?.access_token || selectedAdvertisers.length === 0) return;
    setLoadingMetrics(true);
    try {
      let startDate: string;
      let endDate: string;

      if (useCalendarFilter && filterDateRange.from) {
        startDate = format(filterDateRange.from, "yyyy-MM-dd");
        endDate = filterDateRange.to ? format(filterDateRange.to, "yyyy-MM-dd") : startDate;
      } else {
        const now = new Date();
        if (dateRange === 0) {
          startDate = format(now, "yyyy-MM-dd");
          endDate = startDate;
        } else if (dateRange === 1) {
          const yesterday = new Date(now.getTime() - 86400000);
          startDate = format(yesterday, "yyyy-MM-dd");
          endDate = startDate;
        } else {
          const start = new Date(now.getTime() - dateRange * 86400000);
          startDate = format(start, "yyyy-MM-dd");
          endDate = format(now, "yyyy-MM-dd");
        }
      }

      const url = `${SUPABASE_URL}/functions/v1/tiktok-ads?action=ad-metrics&advertiser_ids=${selectedAdvertisers.join(",")}&start_date=${startDate}&end_date=${endDate}&group_by=${groupBy}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRows(data.rows || []);
      setTotals(data.totals || null);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao carregar métricas: " + err.message);
    } finally {
      setLoadingMetrics(false);
    }
  }, [session, selectedAdvertisers, dateRange, useCalendarFilter, filterDateRange, groupBy]);

  useEffect(() => {
    if (selectedAdvertisers.length > 0 && session) fetchMetrics();
  }, [selectedAdvertisers, dateRange, useCalendarFilter, filterDateRange, groupBy, fetchMetrics, session]);

  const toggleAdvertiser = (id: string) => {
    setSelectedAdvertisers((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  if (isAuthChecking) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#050A15]' : 'bg-white'}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#10B981]" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} ${text} transition-colors duration-300`} style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 py-4 md:py-5 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-[#00f2ea] to-[#ff0050] rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>TikTok Ads Manager</h1>
              <p className={`text-xs ${textMuted}`}>Business Center • {advertisers.length} conta{advertisers.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl border transition-colors ${darkMode ? 'border-gray-700 hover:bg-gray-800 text-gray-400' : 'border-gray-200 hover:bg-gray-100 text-gray-500'}`}>
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loadingMetrics}
              className={`rounded-xl ${btnOutline}`}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loadingMetrics ? "animate-spin" : ""}`} /> Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/admincheckout")}
              className={`rounded-xl ${btnOutline}`}>
              Checkout
            </Button>
            <Button variant="outline" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate("/admin"); }}
              className={`rounded-xl ${btnOutline}`}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Advertiser Selector */}
        <div className={`rounded-[0.75rem] p-4 border ${card} mb-4`}>
          <button onClick={() => setAdvertiserDropdownOpen(!advertiserDropdownOpen)}
            className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Users className={`h-4 w-4 ${textMuted}`} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`} style={{ fontFamily: "'Poppins', sans-serif" }}>
                Contas de Anúncio
              </span>
              <span className={`text-xs ${textMuted}`}>({selectedAdvertisers.length}/{advertisers.length} selecionadas)</span>
            </div>
            {advertiserDropdownOpen ? <ChevronUp className={`h-4 w-4 ${textMuted}`} /> : <ChevronDown className={`h-4 w-4 ${textMuted}`} />}
          </button>
          {advertiserDropdownOpen && (
            <div className="mt-3 space-y-2">
              {loadingAdvertisers ? (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="h-4 w-4 animate-spin text-[#10B981]" />
                  <span className={`ml-2 text-xs ${textMuted}`}>Carregando contas...</span>
                </div>
              ) : advertisers.length === 0 ? (
                <p className={`text-xs ${textMuted} text-center py-3`}>Nenhuma conta encontrada</p>
              ) : (
                <>
                  <div className="flex gap-2 mb-2">
                    <button onClick={() => setSelectedAdvertisers(advertisers.map(a => a.advertiser_id))}
                      className={`text-xs px-3 py-1 rounded-lg ${tabActive}`}>Selecionar Todas</button>
                    <button onClick={() => setSelectedAdvertisers([])}
                      className={`text-xs px-3 py-1 rounded-lg ${tabInactive}`}>Limpar</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {advertisers.map((adv) => (
                      <button key={adv.advertiser_id} onClick={() => toggleAdvertiser(adv.advertiser_id)}
                        className={`rounded-xl p-3 border text-left transition-all ${
                          selectedAdvertisers.includes(adv.advertiser_id)
                            ? "border-[#10B981] bg-[#10B981]/10"
                            : darkMode ? "border-[#1A2A3F] bg-[#1A2A3F]/50 hover:border-[#2A3A4F]" : "border-[#E5E7EB] bg-[#F9FAFB] hover:border-[#D1D5DB]"
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-semibold ${text}`}>{adv.advertiser_name}</span>
                          {selectedAdvertisers.includes(adv.advertiser_id) && (
                            <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                          )}
                        </div>
                        <span className={`text-[10px] font-mono ${textMuted}`}>{adv.advertiser_id}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className={`rounded-[0.75rem] p-4 border ${card} mb-6`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`} style={{ fontFamily: "'Poppins', sans-serif" }}>Período:</span>
            {[
              { label: "Hoje", value: 0 },
              { label: "Ontem", value: 1 },
              { label: "7 dias", value: 7 },
              { label: "14 dias", value: 14 },
              { label: "30 dias", value: 30 },
            ].map((d) => (
              <button key={d.value} onClick={() => { setDateRange(d.value); setUseCalendarFilter(false); setFilterDateRange({ from: undefined, to: undefined }); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${!useCalendarFilter && dateRange === d.value ? tabActive : tabInactive}`}>
                {d.label}
              </button>
            ))}
            <Popover open={filterPopoverOpen} onOpenChange={(open) => {
              setFilterPopoverOpen(open);
              if (open) setTempDateRange(filterDateRange);
            }}>
              <PopoverTrigger asChild>
                <button className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${useCalendarFilter ? tabActive : tabInactive}`}>
                  <Filter className="h-3.5 w-3.5" />
                  {useCalendarFilter && filterDateRange.from
                    ? filterDateRange.to && filterDateRange.from.getTime() !== filterDateRange.to.getTime()
                      ? `${format(filterDateRange.from, "dd/MM")} - ${format(filterDateRange.to, "dd/MM")}`
                      : format(filterDateRange.from, "dd/MM/yyyy")
                    : "Calendário"}
                </button>
              </PopoverTrigger>
              <PopoverContent className={`w-auto p-4 ${darkMode ? 'bg-[#0D1621] border-[#1A2A3F]' : ''}`} align="end">
                <div className="flex flex-col gap-4">
                  <Calendar
                    mode="range"
                    selected={tempDateRange.from ? { from: tempDateRange.from, to: tempDateRange.to } : undefined}
                    onSelect={(range) => setTempDateRange({ from: range?.from, to: range?.to })}
                    locale={ptBR}
                    className="p-3 pointer-events-auto"
                    disabled={(date) => date > new Date()}
                    numberOfMonths={1}
                    classNames={{ day_today: "bg-[#10B981]/20 text-[#10B981] font-bold" }}
                  />
                  <button onClick={() => {
                    if (tempDateRange.from) {
                      setFilterDateRange(tempDateRange);
                      setUseCalendarFilter(true);
                    }
                    setFilterPopoverOpen(false);
                  }}
                    className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold bg-[#10B981] text-white hover:bg-[#059669] transition-all flex items-center justify-center gap-2">
                    <Filter className="h-4 w-4" /> Filtrar
                  </button>
                </div>
              </PopoverContent>
            </Popover>
            <span className={`text-xs ${textMuted} mx-2`}>|</span>
            <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Agrupar:</span>
            {[
              { label: "Campanha", value: "campaign" as const },
              { label: "Conjunto", value: "adgroup" as const },
              { label: "Anúncio", value: "ad" as const },
            ].map((g) => (
              <button key={g.value} onClick={() => setGroupBy(g.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${groupBy === g.value ? tabActive : tabInactive}`}>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Totals */}
        {totals && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
            {[
              { icon: DollarSign, label: "Gasto Total", value: formatCurrency(totals.spend), color: "text-red-500" },
              { icon: Eye, label: "Impressões", value: formatNumber(totals.impressions), color: "text-blue-500" },
              { icon: MousePointer, label: "Cliques", value: formatNumber(totals.clicks), color: "text-purple-500" },
              { icon: Target, label: "Conversões", value: formatNumber(totals.conversions), color: "text-[#10B981]" },
              { icon: DollarSign, label: "CPA", value: formatCurrency(totals.cost_per_conversion), color: "text-amber-500" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className={`rounded-[0.75rem] p-6 border ${card}`}>
                <div className={`flex items-center gap-2 text-xs mb-2 ${textMuted}`}>
                  <Icon className="h-4 w-4" /> {label}
                </div>
                <p className={`text-2xl font-bold ${color}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Secondary metrics row */}
        {totals && (
          <div className={`rounded-[0.75rem] px-4 py-3 border ${card} mb-6 flex items-center gap-4 flex-wrap relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-gradient-to-b before:from-[#ff0050] before:via-[#ff0050]/50 before:to-transparent`}>
            <span className={`text-xs font-semibold ${textMuted} uppercase tracking-wider pl-2`}>📊 Métricas</span>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${darkMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
              <span className={`text-[10px] uppercase tracking-wider font-semibold ${textMuted}`}>CPC</span>
              <span className="text-sm font-bold text-blue-500" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{formatCurrency(totals.cpc)}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${darkMode ? 'bg-purple-500/10' : 'bg-purple-50'}`}>
              <span className={`text-[10px] uppercase tracking-wider font-semibold ${textMuted}`}>CPM</span>
              <span className="text-sm font-bold text-purple-500" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{formatCurrency(totals.cpm)}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${darkMode ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
              <span className={`text-[10px] uppercase tracking-wider font-semibold ${textMuted}`}>CTR</span>
              <span className="text-sm font-bold text-amber-500" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{formatPercent(totals.ctr)}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${darkMode ? 'bg-[#10B981]/10' : 'bg-emerald-50'}`}>
              <span className={`text-[10px] uppercase tracking-wider font-semibold ${textMuted}`}>Alcance</span>
              <span className="text-sm font-bold text-[#10B981]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{formatNumber(totals.reach)}</span>
            </div>
          </div>
        )}

        {/* Table */}
        <div className={`rounded-[0.75rem] border ${card} mb-6 overflow-hidden`}>
          <div className={`px-5 py-4 flex items-center justify-between border-b ${tableHeaderBorder}`}>
            <h2 className="text-base font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {groupBy === "campaign" ? "📈 Campanhas" : groupBy === "adgroup" ? "📂 Conjuntos de Anúncios" : "📄 Anúncios"}
            </h2>
            <span className={`text-xs ${textMuted} font-medium`}>{rows.length} resultado{rows.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left text-xs ${textMuted} border-b ${tableHeaderBorder}`}>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium text-right">Gasto</th>
                  <th className="px-4 py-3 font-medium text-right">Impressões</th>
                  <th className="px-4 py-3 font-medium text-right">Cliques</th>
                  <th className="px-4 py-3 font-medium text-right">CTR</th>
                  <th className="px-4 py-3 font-medium text-right">CPC</th>
                  <th className="px-4 py-3 font-medium text-right">Conversões</th>
                  <th className="px-4 py-3 font-medium text-right">CPA</th>
                </tr>
              </thead>
              <tbody>
                {loadingMetrics ? (
                  <tr><td colSpan={8} className={`px-4 py-8 text-center ${textMuted}`}>
                    <RefreshCw className="h-4 w-4 animate-spin inline mr-2" /> Carregando...
                  </td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={8} className={`px-4 py-8 text-center ${textMuted}`}>
                    {selectedAdvertisers.length === 0 ? "Selecione pelo menos uma conta" : "Nenhum dado encontrado"}
                  </td></tr>
                ) : (
                  rows.sort((a, b) => b.spend - a.spend).map((row, i) => {
                    const name = groupBy === "campaign" ? (row.campaign_name || row.campaign_id || "—")
                      : groupBy === "adgroup" ? (row.adgroup_name || row.adgroup_id || "—")
                      : (row.ad_name || row.ad_id || "—");
                    const id = groupBy === "campaign" ? row.campaign_id
                      : groupBy === "adgroup" ? row.adgroup_id
                      : row.ad_id;

                    return (
                      <tr key={`${row.advertiser_id}-${id}-${i}`} className={`border-b ${tableRowBorder} ${tableRowHover} transition-colors`}>
                        <td className="px-4 py-3">
                          <p className={`font-medium text-sm ${text}`}>{name}</p>
                          <p className={`text-[10px] font-mono ${textMuted}`}>{id}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-red-500" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{formatCurrency(row.spend)}</span>
                        </td>
                        <td className={`px-4 py-3 text-right text-sm ${text}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{formatNumber(row.impressions)}</td>
                        <td className={`px-4 py-3 text-right text-sm ${text}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{formatNumber(row.clicks)}</td>
                        <td className={`px-4 py-3 text-right text-sm ${textMuted}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{formatPercent(row.ctr)}</td>
                        <td className={`px-4 py-3 text-right text-sm ${textMuted}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{formatCurrency(row.cpc)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-[#10B981]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{row.conversions}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-semibold ${row.cost_per_conversion > 0 ? "text-amber-500" : textMuted}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                            {row.cost_per_conversion > 0 ? formatCurrency(row.cost_per_conversion) : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TikTokAdsDashboard;
