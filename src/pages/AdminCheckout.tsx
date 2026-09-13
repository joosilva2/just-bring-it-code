import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart,
} from "recharts";
import {
  ShoppingCart, DollarSign, RefreshCw, LogOut, Wifi,
  Eye, MousePointer, FileText, CheckCircle2, Clock,
  Trash2, ChevronDown, ChevronUp, ArrowRight, Zap,
  Plus, X, Tag, Link, Save, Check, Moon, Sun,
  CalendarIcon, Filter, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Order {
  id: string;
  external_ref: string;
  gateway: string;
  status: string;
  amount: number;
  color: string;
  product_type?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  created_at: string;
  paid_at: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  pix_code?: string | null;
}

interface TikTokPixel {
  id: string;
  pixel_id: string;
  label: string | null;
  track_pending: boolean;
  track_paid: boolean;
  is_active: boolean;
  created_at: string;
  access_token_env: string;
}

interface PinterestTag {
  id: string;
  tag_id: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

interface PaidSale {
  id: string;
  customer_name: string;
  amount: number;
  color: string;
  product_type: string;
  paid_at: string;
  campaign_id: string | null;
  campaign_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  ad_id: string | null;
  ad_name: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  ttclid: string | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const timeAgo = (dateStr: string) => {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} minuto${mins > 1 ? "s" : ""}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} hora${hours > 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia${days > 1 ? "s" : ""}`;
};

type ActiveTab = "dashboard" | "paid-sales";

const AdminCheckout = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState(7);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('admin-dark-mode');
    return saved === 'true';
  });
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);

  // Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [funnel, setFunnel] = useState({ siteVisits: 0, checkoutVisits: 0, buyClicks: 0, cpfFilled: 0, orderPlaced: 0 });
  const [metrics, setMetrics] = useState({ totalOrders: 0, pendingOrders: 0, paidOrders: 0, totalRevenue: 0, totalFees: 0, netRevenue: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [gateway, setGateway] = useState({ active: "blackcat", blackcat_key_masked: null as string | null, paradise_key_masked: null as string | null, duttyfy_url_masked: null as string | null, buckpay_key_masked: null as string | null, buckpay_ua_masked: null as string | null, ironpay_key_masked: null as string | null, has_blackcat_key: false, has_paradise_key: false, has_duttyfy_url: false, has_buckpay_key: false, has_buckpay_ua: false, has_ironpay_key: false });
  const [pixels, setPixels] = useState<TikTokPixel[]>([]);
  const [paidSales, setPaidSales] = useState<PaidSale[]>([]);

  // UI
  const [pendingGateway, setPendingGateway] = useState<string | null>(null);
  const [showGatewaySettings, setShowGatewaySettings] = useState(false);
  const [showPixelSettings, setShowPixelSettings] = useState(false);
  const [showPinterestSettings, setShowPinterestSettings] = useState(false);
  const [showUtmifySection, setShowUtmifySection] = useState(false);
  const [showRedirectSection, setShowRedirectSection] = useState(false);
  const [newBlackcatKey, setNewBlackcatKey] = useState("");
  const [newParadiseKey, setNewParadiseKey] = useState("");
  const [newDuttyfyUrl, setNewDuttyfyUrl] = useState("");
  const [newBuckpayKey, setNewBuckpayKey] = useState("");
  const [newBuckpayUa, setNewBuckpayUa] = useState("");
  const [newIronpayKey, setNewIronpayKey] = useState("");
  const [newPixelId, setNewPixelId] = useState("");
  const [newPixelLabel, setNewPixelLabel] = useState("");
  const [newPixelPending, setNewPixelPending] = useState(false);
  const [newPixelPaid, setNewPixelPaid] = useState(true);
  const [newPixelToken, setNewPixelToken] = useState("TIKTOK_ACCESS_TOKEN");
  const [pinterestTags, setPinterestTags] = useState<PinterestTag[]>([]);
  const [newPinterestId, setNewPinterestId] = useState("");
  const [newPinterestLabel, setNewPinterestLabel] = useState("");
  const [lastUpdate, setLastUpdate] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [redirectUrlSaved, setRedirectUrlSaved] = useState("");
  const [isSavingRedirect, setIsSavingRedirect] = useState(false);

  // Live online counters
  const [onlineSite, setOnlineSite] = useState(0);
  const [onlineCheckout, setOnlineCheckout] = useState(0);
  const [ordersVisible, setOrdersVisible] = useState(10);

  // Order filters
  const [filterDateRange, setFilterDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "pending">("all");
  const [useCalendarFilter, setUseCalendarFilter] = useState(false);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  // Temp state inside popover
  const [tempDateRange, setTempDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [tempStatus, setTempStatus] = useState<"all" | "paid" | "pending">("all");
  const [tempPeriod, setTempPeriod] = useState<number | null>(7);

  // Auth check
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

  // Restore cached data instantly on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('admin_metrics_cache');
      if (cached) {
        const data = JSON.parse(cached);
        setOrders(data.orders || []);
        setFunnel(data.funnel || {});
        setMetrics(data.metrics || {});
        setChartData(data.chartData || []);
        setGateway(data.gateway || {});
        setPixels(data.pixels || []);
        setPinterestTags(data.pinterestTags || []);
        setPaidSales(data.paidSales || []);
        setLastUpdate(data.lastUpdate || '');
      }
    } catch {}
  }, []);

  const fetchMetrics = useCallback(async (background = false) => {
    if (!session?.access_token) return;
    if (!background) setIsLoading(true);
    try {
      let url: string;
      if (useCalendarFilter && filterDateRange.from) {
        const startStr = format(filterDateRange.from, 'yyyy-MM-dd');
        const endStr = filterDateRange.to ? format(filterDateRange.to, 'yyyy-MM-dd') : startStr;
        url = `${SUPABASE_URL}/functions/v1/checkout-admin-metrics?start_date=${startStr}&end_date=${endStr}`;
      } else if (dateRange <= 1) {
        // For "Hoje" (0) and "Ontem" (1), use explicit local dates to avoid UTC mismatch
        const now = new Date();
        const target = new Date(now);
        if (dateRange === 1) target.setDate(target.getDate() - 1);
        const startStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
        const endStr = startStr;
        url = `${SUPABASE_URL}/functions/v1/checkout-admin-metrics?start_date=${startStr}&end_date=${endStr}`;
      } else {
        url = `${SUPABASE_URL}/functions/v1/checkout-admin-metrics?days=${dateRange}`;
      }
      if (filterStatus !== 'all') {
        url += `&status_filter=${filterStatus}`;
      }
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) { if (res.status === 401 || res.status === 403) { await supabase.auth.signOut(); navigate("/admin"); } throw new Error(data.error); }
      setOrders(data.orders || []);
      setFunnel(data.funnel || {});
      setMetrics(data.metrics || {});
      setChartData(data.chartData || []);
      setGateway(data.gateway || {});
      setPixels(data.pixels || []);
      setPinterestTags(data.pinterestTags || []);
      setPaidSales(data.paidSales || []);
      const now = new Date().toLocaleTimeString("pt-BR");
      setLastUpdate(now);

      // Cache for instant load next time
      try {
        sessionStorage.setItem('admin_metrics_cache', JSON.stringify({
          orders: data.orders, funnel: data.funnel, metrics: data.metrics,
          chartData: data.chartData, gateway: data.gateway, pixels: data.pixels,
          pinterestTags: data.pinterestTags,
          paidSales: data.paidSales, lastUpdate: now,
        }));
      } catch {}

      // Fetch redirect URL in background (don't block)
      supabase.from('gateway_config').select('redirect_url').eq('id', 'active').maybeSingle()
        .then(({ data: configData }) => {
          if (configData?.redirect_url !== undefined) {
            setRedirectUrl(configData.redirect_url || '');
            setRedirectUrlSaved(configData.redirect_url || '');
          }
        });
    } catch (err) {
      console.error(err);
      if (!background) toast.error("Erro ao carregar métricas");
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, session, navigate, useCalendarFilter, filterDateRange, filterStatus]);

  useEffect(() => {
    if (!isAuthChecking && session) {
      fetchMetrics();
      const interval = setInterval(() => fetchMetrics(true), 15000);
      return () => clearInterval(interval);
    }
  }, [fetchMetrics, isAuthChecking, session]);

  // Presence channels
  useEffect(() => {
    const siteChannel = supabase.channel("online-users");
    siteChannel.on("presence", { event: "sync" }, () => {
      setOnlineSite(Object.keys(siteChannel.presenceState()).length);
    }).subscribe();

    const checkoutChannel = supabase.channel("checkout-users");
    checkoutChannel.on("presence", { event: "sync" }, () => {
      setOnlineCheckout(Object.keys(checkoutChannel.presenceState()).length);
    }).subscribe();

    return () => {
      supabase.removeChannel(siteChannel);
      supabase.removeChannel(checkoutChannel);
    };
  }, []);

  // Realtime order updates
  useEffect(() => {
    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setOrders((prev) => [payload.new as Order, ...prev]);
          setMetrics((m) => ({ ...m, totalOrders: m.totalOrders + 1, pendingOrders: m.pendingOrders + 1 }));
          toast.info(`Novo pedido: ${(payload.new as Order).customer_name}`);
        } else if (payload.eventType === "UPDATE") {
          setOrders((prev) => prev.map((o) => (o.id === (payload.new as Order).id ? (payload.new as Order) : o)));
          const newStatus = (payload.new as Order).status;
          if (newStatus === "paid" || newStatus === "approved") {
            toast.success(`Pagamento confirmado: ${(payload.new as Order).customer_name}`);
            fetchMetrics();
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMetrics]);

  const gatewayDisplayName = (gw: string) =>
    gw === "blackcat" ? "Black Cat" : gw === "paradise" ? "Paradise" : gw === "buckpay" ? "BuckPay" : gw === "ironpay" ? "IronPay" : gw === "duttyfy" ? "Duttyfy" : gw;

  const handleGatewaySwitch = (gw: string) => {
    if (gw === gateway.active) return;
    setPendingGateway(gw);
  };

  const confirmGatewaySwitch = async () => {
    if (!session?.access_token || !pendingGateway) return;
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/checkout-admin-metrics?action=update-gateway`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ active_gateway: pendingGateway }),
      });
      setGateway((g) => ({ ...g, active: pendingGateway }));
      toast.success(`Gateway alterado para ${gatewayDisplayName(pendingGateway)}`);
    } catch { toast.error("Erro ao alterar gateway"); }
    setPendingGateway(null);
  };

  const handleSaveKey = async (gw: "blackcat" | "paradise" | "duttyfy" | "buckpay_key" | "buckpay_ua" | "ironpay") => {
    if (!session?.access_token) return;
    let key = "";
    if (gw === "blackcat") key = newBlackcatKey;
    else if (gw === "paradise") key = newParadiseKey;
    else if (gw === "buckpay_key") key = newBuckpayKey;
    else if (gw === "buckpay_ua") key = newBuckpayUa;
    else if (gw === "ironpay") key = newIronpayKey;
    else key = newDuttyfyUrl;
    if (!key.trim()) { toast.error("Insira um valor"); return; }
    try {
      const body: Record<string, string> = {};
      if (gw === "blackcat") body.blackcat_api_key = key;
      else if (gw === "paradise") body.paradise_api_key = key;
      else if (gw === "buckpay_key") body.buckpay_api_key = key;
      else if (gw === "buckpay_ua") body.buckpay_user_agent = key;
      else if (gw === "ironpay") body.ironpay_api_key = key;
      else body.duttyfy_api_url = key;
      await fetch(`${SUPABASE_URL}/functions/v1/checkout-admin-metrics?action=update-gateway`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
      });
      if (gw === "blackcat") { setNewBlackcatKey(""); setGateway((g) => ({ ...g, has_blackcat_key: true, blackcat_key_masked: key.slice(0, 4) + "****" + key.slice(-4) })); }
      else if (gw === "paradise") { setNewParadiseKey(""); setGateway((g) => ({ ...g, has_paradise_key: true, paradise_key_masked: key.slice(0, 4) + "****" + key.slice(-4) })); }
      else if (gw === "buckpay_key") { setNewBuckpayKey(""); setGateway((g) => ({ ...g, has_buckpay_key: true, buckpay_key_masked: key.slice(0, 4) + "****" + key.slice(-4) })); }
      else if (gw === "buckpay_ua") { setNewBuckpayUa(""); setGateway((g) => ({ ...g, has_buckpay_ua: true, buckpay_ua_masked: key.slice(0, 4) + "****" + key.slice(-4) })); }
      else if (gw === "ironpay") { setNewIronpayKey(""); setGateway((g) => ({ ...g, has_ironpay_key: true, ironpay_key_masked: key.slice(0, 4) + "****" + key.slice(-4) })); }
      else { setNewDuttyfyUrl(""); setGateway((g) => ({ ...g, has_duttyfy_url: true, duttyfy_url_masked: key.slice(0, 8) + "****" + key.slice(-8) })); }
      toast.success("Chave salva com sucesso!");
    } catch { toast.error("Erro ao salvar chave"); }
  };

  const handleAddPixel = async () => {
    if (!session?.access_token || !newPixelId.trim()) { toast.error("Insira o ID do Pixel"); return; }
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/checkout-admin-metrics?action=add-pixel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ pixel_id: newPixelId.trim(), label: newPixelLabel.trim() || null, track_pending: newPixelPending, track_paid: newPixelPaid, access_token_env: newPixelToken.trim() || 'TIKTOK_ACCESS_TOKEN' }),
      });
      setNewPixelId(""); setNewPixelLabel(""); setNewPixelPending(false); setNewPixelPaid(true); setNewPixelToken("TIKTOK_ACCESS_TOKEN");
      toast.success("Pixel adicionado!");
      fetchMetrics();
    } catch { toast.error("Erro ao adicionar pixel"); }
  };

  const handleDeletePixel = async (id: string) => {
    if (!session?.access_token || !confirm("Remover este pixel?")) return;
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/checkout-admin-metrics?action=delete-pixel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id }),
      });
      setPixels(prev => prev.filter(p => p.id !== id));
      toast.success("Pixel removido!");
    } catch { toast.error("Erro ao remover pixel"); }
  };

  const handleAddPinterestTag = async () => {
    if (!session?.access_token || !newPinterestId.trim()) { toast.error("Insira o ID da Tag do Pinterest"); return; }
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/checkout-admin-metrics?action=add-pinterest-tag`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ tag_id: newPinterestId.trim(), label: newPinterestLabel.trim() || null }),
      });
      const result = await resp.json();
      if (!resp.ok || result.error) throw new Error(result.error || 'Failed');
      setNewPinterestId(""); setNewPinterestLabel("");
      toast.success("Pinterest Tag adicionada! Ela já está ativa no site.");
      fetchMetrics();
    } catch { toast.error("Erro ao adicionar tag"); }
  };

  const handleDeletePinterestTag = async (id: string) => {
    if (!session?.access_token || !confirm("Remover esta Pinterest Tag?")) return;
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/checkout-admin-metrics?action=delete-pinterest-tag`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id }),
      });
      setPinterestTags(prev => prev.filter(t => t.id !== id));
      toast.success("Tag removida!");
    } catch { toast.error("Erro ao remover tag"); }
  };

  const handleTogglePixelSetting = async (pixel: TikTokPixel, field: "track_pending" | "track_paid") => {
    if (!session?.access_token) return;
    const newVal = !pixel[field];
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/checkout-admin-metrics?action=update-pixel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id: pixel.id, [field]: newVal }),
      });
      setPixels(prev => prev.map(p => p.id === pixel.id ? { ...p, [field]: newVal } : p));
    } catch { toast.error("Erro ao atualizar pixel"); }
  };

  const handleSaveRedirectUrl = async () => {
    if (!session?.access_token) return;
    setIsSavingRedirect(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/checkout-admin-metrics?action=update-gateway`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ redirect_url: redirectUrl }),
      });
      const result = await resp.json();
      if (!resp.ok || result.error) throw new Error(result.error || 'Failed');
      setRedirectUrlSaved(redirectUrl);
      toast.success('URL de redirecionamento salva!');
    } catch (err) {
      console.error('Error saving redirect URL:', err);
      toast.error('Erro ao salvar URL');
    } finally {
      setIsSavingRedirect(false);
    }
  };

  if (isAuthChecking) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#0B1120]' : 'bg-white'}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]" />
      </div>
    );
  }

  const conversionRate = funnel.siteVisits > 0 ? ((metrics.paidOrders / funnel.siteVisits) * 100).toFixed(1) : "0";

  // Theme classes — exact spec colors
  const bg = darkMode ? 'bg-[#0B1120]' : 'bg-[#F0F2F5]';
  const text = darkMode ? 'text-[#F1F5F9]' : 'text-[#1A202C]';
  const textMuted = darkMode ? 'text-[#7B8CA8]' : 'text-[#6B7280]';
  const textMuted2 = darkMode ? 'text-[#7B8CA8]' : 'text-[#6B7280]';
  const card = darkMode ? 'bg-[#131B2E] border-[#1E293B]' : 'bg-white border-[#E5E7EB]';
  const cardHover = darkMode ? 'hover:bg-[#1E293B]' : 'hover:bg-[#F3F4F6]';
  const inputBg = darkMode ? 'bg-[#1E293B] border-[#1E293B] text-[#F1F5F9]' : 'bg-[#F3F4F6] border-[#E5E7EB] text-[#1A202C]';
  const btnOutline = darkMode ? 'bg-transparent border-[#1E293B] text-[#7B8CA8] hover:bg-[#1E293B]' : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6]';
  const tabActive = 'bg-[#3B82F6] text-white';
  const tabInactive = darkMode ? 'bg-[#1E293B] text-[#7B8CA8] border border-[#1E293B] hover:bg-[#131B2E]' : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F3F4F6]';
  const tableRowBorder = darkMode ? 'border-[#1E293B]' : 'border-[#E5E7EB]';
  const tableRowHover = darkMode ? 'hover:bg-[#1E293B]/50' : 'hover:bg-[#F3F4F6]';
  const tableHeaderBorder = darkMode ? 'border-[#1E293B]' : 'border-[#E5E7EB]';

  return (
    <div className={`min-h-screen ${bg} ${text} transition-colors duration-300`} style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 py-4 md:py-5 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-[#3B82F6] to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-[#3B82F6]/20">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>Checkout Admin</h1>
              <p className={`text-xs ${textMuted2}`}>Última atualização: {lastUpdate || "--:--:--"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => { const next = !darkMode; setDarkMode(next); localStorage.setItem('admin-dark-mode', String(next)); }}
              className={`p-2 rounded-xl border transition-colors ${darkMode ? 'border-[#1E293B] hover:bg-[#1E293B] text-[#7B8CA8]' : 'border-gray-200 hover:bg-gray-100 text-gray-500'}`}>
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Button variant="outline" size="sm" onClick={() => fetchMetrics()} disabled={isLoading}
              className={`rounded-xl ${btnOutline}`}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} /> Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/resultados")}
              className={`rounded-xl ${btnOutline}`}>
              Métricas
            </Button>
            <Button variant="outline" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate("/admin"); }}
              className={`rounded-xl ${btnOutline}`}>
              <LogOut className="h-4 w-4" />
            </Button>
            <span className="px-3 py-1.5 bg-[#3B82F6]/15 text-[#3B82F6] rounded-full text-sm font-semibold border border-[#3B82F6]/25">
              <Wifi className="h-3 w-3 inline mr-1" /> Ao vivo
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
            <button onClick={() => setActiveTab("dashboard")}
            className={`rounded-[0.75rem] px-5 py-3 text-sm font-semibold transition-all ${activeTab === "dashboard" ? tabActive : tabInactive}`}
            style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Dashboard
          </button>
          <button onClick={() => setActiveTab("paid-sales")}
            className={`rounded-[0.75rem] px-5 py-3 text-sm font-semibold transition-all ${activeTab === "paid-sales" ? tabActive : tabInactive}`}
            style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Vendas Pagas
          </button>
        </div>

        {activeTab === "paid-sales" ? (
          <PaidSalesTab paidSales={paidSales} dateRange={dateRange} setDateRange={setDateRange}
            darkMode={darkMode} card={card} textMuted={textMuted} textMuted2={textMuted2} text={text}
            tabActive={tabActive} tabInactive={tabInactive} tableRowBorder={tableRowBorder}
            tableRowHover={tableRowHover} tableHeaderBorder={tableHeaderBorder} />
        ) : (
          <>
            {/* Filtros */}
            <div className={`rounded-[0.75rem] p-4 border mb-6 ${card}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`} style={{ fontFamily: "'Montserrat', sans-serif" }}>Período:</span>
                {[
                  { label: "Hoje", value: 0 },
                  { label: "Ontem", value: 1 },
                  { label: "7 dias", value: 7 },
                  { label: "14 dias", value: 14 },
                  { label: "30 dias", value: 30 },
                ].map((d) => (
                  <button key={d.value} onClick={() => { setDateRange(d.value); setUseCalendarFilter(false); setFilterDateRange({ from: undefined, to: undefined }); setFilterStatus("all"); }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${!useCalendarFilter && dateRange === d.value ? tabActive : tabInactive}`}>
                    {d.label}
                  </button>
                ))}
                <Popover open={filterPopoverOpen} onOpenChange={(open) => {
                  setFilterPopoverOpen(open);
                  if (open) {
                    setTempDateRange(filterDateRange);
                    setTempStatus(filterStatus);
                    setTempPeriod(useCalendarFilter ? null : dateRange);
                  }
                }}>
                  <PopoverTrigger asChild>
                    <button className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${useCalendarFilter ? tabActive : tabInactive}`}>
                      <Filter className="h-3.5 w-3.5" />
                      {useCalendarFilter && filterDateRange.from
                        ? filterDateRange.to && filterDateRange.from.getTime() !== filterDateRange.to.getTime()
                          ? `${format(filterDateRange.from, "dd/MM")} - ${format(filterDateRange.to, "dd/MM")}`
                          : format(filterDateRange.from, "dd/MM/yyyy")
                        : "Filtro Avançado"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className={`w-auto p-4 ${darkMode ? 'bg-[#131B2E] border-[#1E293B]' : ''}`} align="end">
                    <div className="flex flex-col gap-4">
                      <div>
                        <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted} block mb-2`}>Status:</span>
                        <div className="flex gap-1.5">
                          {[
                            { label: "Todos", value: "all" as const, icon: <FileText className="h-3.5 w-3.5" /> },
                            { label: "Pagas", value: "paid" as const, icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
                            { label: "Pendentes", value: "pending" as const, icon: <Clock className="h-3.5 w-3.5" /> },
                          ].map((s) => (
                            <button key={s.value} onClick={() => setTempStatus(s.value)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${tempStatus === s.value ? 'bg-[#3B82F6] text-white' : tabInactive}`}>
                              {s.icon} {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted} block mb-2`}>Selecione o período:</span>
                        <Calendar
                          mode="range"
                          selected={tempDateRange.from ? { from: tempDateRange.from, to: tempDateRange.to } : undefined}
                          onSelect={(range) => {
                            setTempDateRange({ from: range?.from, to: range?.to });
                            setTempPeriod(null);
                          }}
                          locale={ptBR}
                          className="p-3 pointer-events-auto"
                          disabled={(date) => date > new Date()}
                          numberOfMonths={1}
                          classNames={{
                            day_today: "bg-[#3B82F6]/20 text-[#3B82F6] font-bold",
                          }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (tempDateRange.from) {
                            setFilterDateRange(tempDateRange);
                            setUseCalendarFilter(true);
                            setFilterStatus(tempStatus);
                          } else {
                            setUseCalendarFilter(false);
                            setFilterStatus(tempStatus);
                          }
                          setFilterPopoverOpen(false);
                        }}
                        className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold bg-[#3B82F6] text-white hover:bg-[#2563EB] transition-all flex items-center justify-center gap-2">
                        <Filter className="h-4 w-4" /> Filtrar
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Live counters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className={`rounded-[0.75rem] p-6 border-l-4 border-l-[#3B82F6] ${card} border`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-medium ${textMuted} uppercase tracking-wider`}>No Site Agora</p>
                    <p className="text-4xl font-bold mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{onlineSite}</p>
                  </div>
                  <Eye className={`h-6 w-6 ${textMuted2}`} />
                </div>
              </div>
              <div className={`rounded-[0.75rem] p-6 border-l-4 border-l-[#3B82F6] ${card} border`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-medium ${textMuted} uppercase tracking-wider`}>No Checkout Agora</p>
                    <p className="text-4xl font-bold mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{onlineCheckout}</p>
                  </div>
                  <ShoppingCart className={`h-6 w-6 ${textMuted2}`} />
                </div>
              </div>
            </div>

            {/* Collapsible: TikTok Pixels */}
            <CollapsibleCard
              icon={<Zap className="h-5 w-5 text-blue-500" />}
              title="TikTok Pixels"
              subtitle={`${pixels.length} pixel${pixels.length !== 1 ? 's' : ''} configurado${pixels.length !== 1 ? 's' : ''}`}
              isOpen={showPixelSettings}
              onToggle={() => setShowPixelSettings(!showPixelSettings)}
              card={card} cardHover={cardHover} textMuted2={textMuted2}
            >
              <div className="space-y-4">
                <div className={`rounded-xl p-4 space-y-3 ${darkMode ? 'bg-[#1E293B]/50' : 'bg-gray-50'}`}>
                  <h3 className={`text-xs font-semibold ${textMuted} uppercase tracking-wide`}>Adicionar Novo Pixel</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input value={newPixelId} onChange={(e) => setNewPixelId(e.target.value)}
                      placeholder="ID do Pixel (ex: CXXXXXX)" className={`${inputBg} text-xs h-9 rounded-xl`} />
                    <Input value={newPixelLabel} onChange={(e) => setNewPixelLabel(e.target.value)}
                      placeholder="Nome (opcional)" className={`${inputBg} text-xs h-9 rounded-xl`} />
                    <Input value={newPixelToken} onChange={(e) => setNewPixelToken(e.target.value)}
                      placeholder="Secret do Token (ex: TIKTOK_ACCESS_TOKEN)" className={`${inputBg} text-xs h-9 rounded-xl`} />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newPixelPending} onChange={(e) => setNewPixelPending(e.target.checked)}
                        className="rounded border-gray-300 text-blue-500 focus:ring-blue-500/20" />
                      <span className={`text-xs ${textMuted}`}>PIX Pendentes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newPixelPaid} onChange={(e) => setNewPixelPaid(e.target.checked)}
                        className="rounded border-gray-300 text-blue-500 focus:ring-blue-500/20" />
                      <span className={`text-xs ${textMuted}`}>PIX Pagos</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" onClick={handleAddPixel} className="bg-blue-600 hover:bg-blue-700 rounded-xl h-9 text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Adicionar Pixel
                    </Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      const t = toast.loading('Reenviando ICs ao TikTok...');
                      try {
                        const { data, error } = await supabase.functions.invoke('tiktok-resend-ic');
                        if (error) throw error;
                        const sent = (data?.results || []).filter((r: any) => r.sent).length;
                        toast.success(`${sent} de ${data?.processed || 0} IC(s) enviados`, { id: t });
                      } catch (e: any) {
                        toast.error(`Falha: ${e.message || e}`, { id: t });
                      }
                    }} className="rounded-xl h-9 text-xs">
                      <RefreshCw className="h-3 w-3 mr-1" /> Reenviar IC pendentes
                    </Button>
                  </div>
                </div>

                {pixels.length === 0 ? (
                  <p className={`text-xs ${textMuted2} text-center py-3`}>Nenhum pixel configurado ainda</p>
                ) : (
                  <div className="space-y-2">
                    {pixels.map((pixel) => (
                      <div key={pixel.id} className={`rounded-xl p-3 flex items-center justify-between ${darkMode ? 'bg-[#1E293B]/50' : 'bg-gray-50'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-mono ${text}`}>{pixel.pixel_id}</span>
                            {pixel.label && <span className={`text-[10px] ${textMuted2}`}>({pixel.label})</span>}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-[#1E293B] text-[#CBD5E1]' : 'bg-gray-200 text-gray-600'}`}>🔑 {pixel.access_token_env || 'TIKTOK_ACCESS_TOKEN'}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={pixel.track_pending}
                                onChange={() => handleTogglePixelSetting(pixel, "track_pending")}
                                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500/20 h-3 w-3" />
                              <span className={`text-[10px] ${textMuted}`}>Pendentes</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={pixel.track_paid}
                                onChange={() => handleTogglePixelSetting(pixel, "track_paid")}
                                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500/20 h-3 w-3" />
                              <span className={`text-[10px] ${textMuted}`}>Pagos</span>
                            </label>
                          </div>
                        </div>
                        <button onClick={() => handleDeletePixel(pixel.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleCard>

            {/* Collapsible: Adquirentes */}
            <CollapsibleCard
              icon={<Zap className="h-5 w-5 text-blue-500" />}
              title="Adquirentes"
              subtitle={`Gateway ativo: ${gatewayDisplayName(gateway.active)}`}
              isOpen={showGatewaySettings}
              onToggle={() => setShowGatewaySettings(!showGatewaySettings)}
              card={card} cardHover={cardHover} textMuted2={textMuted2}
            >
              <div className="space-y-4">
                <div>
                  <p className={`text-xs font-medium ${textMuted} mb-2`}>Gateway Ativo</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { id: "blackcat", name: "Black Cat", hasKey: gateway.has_blackcat_key },
                      { id: "paradise", name: "Paradise", hasKey: gateway.has_paradise_key },
                      { id: "duttyfy", name: "Duttyfy", hasKey: gateway.has_duttyfy_url },
                      { id: "buckpay", name: "BuckPay", hasKey: gateway.has_buckpay_key && gateway.has_buckpay_ua },
                      { id: "ironpay", name: "IronPay", hasKey: gateway.has_ironpay_key },
                    ].map((gw) => (
                      <button key={gw.id} onClick={() => handleGatewaySwitch(gw.id)}
                        className={`rounded-xl p-4 border-2 transition-all text-left ${gateway.active === gw.id
                          ? "border-blue-500 bg-blue-500/10"
                          : darkMode ? "border-gray-700 bg-gray-800/50 hover:border-gray-600" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-bold ${text}`}>{gw.name}</span>
                          {gateway.active === gw.id && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full border border-blue-500/30 font-semibold">ATIVO</span>
                          )}
                        </div>
                        <span className={`text-xs ${gw.hasKey ? "text-blue-500" : "text-red-400"}`}>
                          {gw.hasKey ? "✓ Configurado" : "✗ Sem config"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "Black Cat API Key", masked: gateway.blackcat_key_masked, value: newBlackcatKey, setValue: setNewBlackcatKey, gw: "blackcat" as const },
                    { label: "Paradise API Key", masked: gateway.paradise_key_masked, value: newParadiseKey, setValue: setNewParadiseKey, gw: "paradise" as const },
                    { label: "Duttyfy URL Encriptada", masked: gateway.duttyfy_url_masked, value: newDuttyfyUrl, setValue: setNewDuttyfyUrl, gw: "duttyfy" as const },
                    { label: "BuckPay API Key (Token)", masked: gateway.buckpay_key_masked, value: newBuckpayKey, setValue: setNewBuckpayKey, gw: "buckpay_key" as const },
                    { label: "BuckPay User-Agent", masked: gateway.buckpay_ua_masked, value: newBuckpayUa, setValue: setNewBuckpayUa, gw: "buckpay_ua" as const },
                    { label: "IronPay API Token", masked: gateway.ironpay_key_masked, value: newIronpayKey, setValue: setNewIronpayKey, gw: "ironpay" as const },
                  ].map(({ label, masked, value, setValue, gw: gwKey }) => (
                    <div key={gwKey} className={`rounded-xl p-3 ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium ${textMuted}`}>{label}</span>
                        {masked && <span className={`text-[10px] font-mono ${textMuted2}`}>{masked}</span>}
                      </div>
                      <div className="flex gap-2">
                        <Input value={value} onChange={(e) => setValue(e.target.value)}
                          placeholder="Cole a nova chave aqui..." type="password"
                          className={`${inputBg} text-xs h-9 rounded-xl`} />
                        <Button size="sm" onClick={() => handleSaveKey(gwKey)}
                          className="bg-blue-600 hover:bg-blue-700 h-9 text-xs rounded-xl">Salvar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleCard>

            {/* Collapsible: Redirect URL */}
            <CollapsibleCard
              icon={<Link className="h-5 w-5 text-blue-500" />}
              title="Redirecionamento pós-pagamento"
              subtitle={redirectUrlSaved ? `Ativo: ${redirectUrlSaved}` : "Não configurado"}
              isOpen={showRedirectSection}
              onToggle={() => setShowRedirectSection(!showRedirectSection)}
              card={card} cardHover={cardHover} textMuted2={textMuted2}
            >
              <div>
                <p className={`text-xs ${textMuted} mb-3`}>
                  Quando o pagamento for confirmado, o cliente será redirecionado para esta URL automaticamente.
                </p>
                <p className={`text-xs font-medium ${textMuted} mb-1`}>URL de Redirecionamento</p>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={redirectUrl}
                    onChange={(e) => setRedirectUrl(e.target.value)}
                    placeholder="https://exemplo.com/obrigado"
                    className={`${inputBg} text-sm rounded-xl`}
                  />
                  <Button
                    onClick={handleSaveRedirectUrl}
                    disabled={isSavingRedirect || redirectUrl === redirectUrlSaved}
                    size="sm"
                    className={`rounded-xl ${redirectUrl === redirectUrlSaved ? 'bg-blue-600 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                  >
                    {isSavingRedirect ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : redirectUrl === redirectUrlSaved && redirectUrlSaved ? (
                      <><Check className="h-4 w-4 mr-1" /> Salvo</>
                    ) : (
                      <><Save className="h-4 w-4 mr-1" /> Salvar</>
                    )}
                  </Button>
                </div>
                {redirectUrlSaved && (
                  <p className="text-xs text-blue-500 mt-2">
                    ✓ Ativo: clientes serão redirecionados para <span className="font-mono">{redirectUrlSaved}</span>
                  </p>
                )}
              </div>
            </CollapsibleCard>

            {/* Collapsible: UTMify */}
            <CollapsibleCard
              icon={<Zap className="h-5 w-5 text-yellow-500" />}
              title="Testar Webhooks UTMify"
              subtitle="Dispara webhook de teste com valor de R$5,00"
              isOpen={showUtmifySection}
              onToggle={() => setShowUtmifySection(!showUtmifySection)}
              card={card} cardHover={cardHover} textMuted2={textMuted2}
            >
              <div className="flex gap-3 flex-wrap">
                <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl" onClick={async () => {
                  try {
                    toast.info("Disparando webhook pendente...");
                    const ts = Date.now();
                    const extRef = `TEST-PENDING-${ts}`;
                    // Insert via edge function (bypasses RLS)
                    const insertRes = await fetch(`${SUPABASE_URL}/functions/v1/checkout-admin-metrics?action=test-insert-order`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                      body: JSON.stringify({ external_ref: extRef, gateway_transaction_id: `TEST-${ts}`, amount: 500, customer_name: "Teste UTMify", customer_email: "teste@teste.com", customer_phone: "11999999999" }),
                    });
                    const insertData = await insertRes.json();
                    if (insertData.error) throw new Error(insertData.error);
                    // Fire webhook
                    const res = await fetch(`${SUPABASE_URL}/functions/v1/payment-webhook`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        externalRef: extRef,
                        status: "PENDING",
                        amount: 500,
                        customer: { name: "Teste UTMify", email: "teste@teste.com", phone: "11999999999" },
                      }),
                    });
                    const data = await res.json();
                    toast.success(data.success ? "Webhook pendente enviado!" : `Erro: ${data.error}`);
                  } catch (err: any) {
                    toast.error(`Erro: ${err.message}`);
                  }
                }}>
                  <Clock className="h-3 w-3 mr-1" /> Testar Pendente
                </Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl" onClick={async () => {
                  try {
                    toast.info("Disparando webhook pago...");
                    const ts = Date.now();
                    const extRef = `TEST-PAID-${ts}`;
                    // Insert via edge function (bypasses RLS)
                    const insertRes = await fetch(`${SUPABASE_URL}/functions/v1/checkout-admin-metrics?action=test-insert-order`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                      body: JSON.stringify({ external_ref: extRef, gateway_transaction_id: `TEST-${ts}`, amount: 500, customer_name: "Teste UTMify", customer_email: "teste@teste.com", customer_phone: "11999999999" }),
                    });
                    const insertData = await insertRes.json();
                    if (insertData.error) throw new Error(insertData.error);
                    // Fire webhook
                    const res = await fetch(`${SUPABASE_URL}/functions/v1/payment-webhook`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        externalRef: extRef,
                        status: "PAID",
                        amount: 500,
                        customer: { name: "Teste UTMify", email: "teste@teste.com", phone: "11999999999" },
                      }),
                    });
                    const data = await res.json();
                    toast.success(data.success ? "Webhook pago enviado!" : `Erro: ${data.error}`);
                  } catch (err: any) {
                    toast.error(`Erro: ${err.message}`);
                  }
                }}>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Testar Pago
                </Button>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className={`text-xs ${textMuted2} mb-2`}>Envia todas as vendas pagas que não chegaram na UTMify:</p>
                <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl" onClick={async () => {
                  try {
                    toast.info("Varrendo pedidos pagos...");
                    const res = await fetch(`${SUPABASE_URL}/functions/v1/sweep-utmify`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                    });
                    const data = await res.json();
                    if (data.error) {
                      toast.error(`Erro: ${data.error}`);
                    } else if (data.sent > 0) {
                      toast.success(`✓ ${data.sent} venda(s) enviada(s) para UTMify!`);
                    } else {
                      toast.info("Nenhuma venda pendente de envio.");
                    }
                    if (data.failed > 0) {
                      toast.warning(`${data.failed} falha(s) no envio`);
                    }
                  } catch (err: any) {
                    toast.error(`Erro: ${err.message}`);
                  }
                }}>
                  <Zap className="h-3 w-3 mr-1" /> Varrer Vendas Pagas → UTMify
                </Button>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className={`text-xs ${textMuted2} mb-2`}>Verifica pedidos Duttyfy pendentes e marca os pagos:</p>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl" onClick={async () => {
                  try {
                    toast.info("Varrendo pedidos Duttyfy pendentes...");
                    const res = await fetch(`${SUPABASE_URL}/functions/v1/sweep-duttyfy`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                    });
                    const data = await res.json();
                    if (data.error) {
                      toast.error(`Erro: ${data.error}`);
                    } else if (data.paid > 0) {
                      toast.success(`✓ ${data.paid} venda(s) marcada(s) como paga(s)!`);
                      fetchMetrics();
                    } else {
                      toast.info(`Verificados ${data.checked} pedidos, nenhum pago.`);
                    }
                  } catch (err: any) {
                    toast.error(`Erro: ${err.message}`);
                  }
                }}>
                  <Zap className="h-3 w-3 mr-1" /> Varrer Duttyfy Pendentes
                </Button>
              </div>
            </CollapsibleCard>

            {/* Funnel */}
            <div className={`rounded-[0.75rem] p-6 border ${card} mb-6`}>
              <h2 className="text-base font-bold mb-5" style={{ fontFamily: "'Montserrat', sans-serif" }}>📈 Funil de Conversão</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {[
                  { label: "Visitantes", value: funnel.siteVisits, pct: "100%", color: "text-[#3B82F6]", icon: <Eye className="h-5 w-5" /> },
                  { label: "Adicionado Carrinho", value: funnel.checkoutVisits, pct: funnel.siteVisits > 0 ? ((funnel.checkoutVisits / funnel.siteVisits) * 100).toFixed(1) + "%" : "0%", color: "text-purple-500", icon: <ShoppingCart className="h-5 w-5" /> },
                  { label: "Clicou Checkout", value: funnel.buyClicks, pct: funnel.siteVisits > 0 ? ((funnel.buyClicks / funnel.siteVisits) * 100).toFixed(1) + "%" : "0%", color: "text-amber-500", icon: <MousePointer className="h-5 w-5" /> },
                  { label: "Preparado Pedido", value: funnel.cpfFilled, pct: funnel.siteVisits > 0 ? ((funnel.cpfFilled / funnel.siteVisits) * 100).toFixed(1) + "%" : "0%", color: "text-orange-500", icon: <Clock className="h-5 w-5" /> },
                  { label: "Pedido Finalizado", value: funnel.orderPlaced, pct: funnel.siteVisits > 0 ? ((funnel.orderPlaced / funnel.siteVisits) * 100).toFixed(1) + "%" : "0%", color: "text-[#3B82F6]", icon: <CheckCircle2 className="h-5 w-5" /> },
                ].map(({ label, value, pct, color, icon }) => (
                  <div key={label} className={`rounded-[0.75rem] border p-4 text-center ${card}`}>
                    <div className={`flex justify-center mb-2 ${color}`}>{icon}</div>
                    <p className={`text-[11px] font-medium ${textMuted} mb-1`}>{label}</p>
                    <p className={`text-2xl sm:text-3xl font-bold ${color}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{value}</p>
                    <p className={`text-xs ${textMuted2} mt-0.5`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{pct}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Faturamento e Taxas - linha compacta */}
            <div className={`rounded-[0.75rem] px-4 py-3 border ${card} mb-6 flex items-center gap-4 flex-wrap relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-gradient-to-b before:from-[#3B82F6] before:via-[#3B82F6]/50 before:to-transparent`}>
              <span className={`text-xs font-semibold ${textMuted} uppercase tracking-wider pl-2`}>💰 Faturamento</span>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${darkMode ? 'bg-[#3B82F6]/10' : 'bg-blue-50'}`}>
                <span className={`text-[10px] uppercase tracking-wider font-semibold ${textMuted}`}>Bruto</span>
                <span className="text-sm font-bold text-[#3B82F6]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{formatBRL(metrics.totalRevenue)}</span>
              </div>
              <span className={`text-xs ${textMuted}`}>—</span>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${darkMode ? 'bg-red-500/10' : 'bg-red-50'}`}>
                <span className={`text-[10px] uppercase tracking-wider font-semibold ${textMuted}`}>Taxas</span>
                <span className="text-sm font-bold text-red-500" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>- {formatBRL(metrics.totalFees)}</span>
                <span className={`text-[10px] ${textMuted2}`}>(6%+R$1,97)</span>
              </div>
              <span className={`text-xs ${textMuted}`}>=</span>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${darkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200/60'}`}>
                <span className={`text-[10px] uppercase tracking-wider font-semibold ${textMuted}`}>Líquido</span>
                <span className="text-sm font-bold text-blue-400" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{formatBRL(metrics.netRevenue)}</span>
              </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
              {[
                { icon: ShoppingCart, label: "Total Pedidos", value: metrics.totalOrders, color: "text-[#3B82F6]" },
                { icon: Clock, label: "Pendentes", value: metrics.pendingOrders, color: "text-yellow-500" },
                { icon: CheckCircle2, label: "Pagos", value: metrics.paidOrders, color: "text-[#3B82F6]" },
                { icon: DollarSign, label: "Faturamento", value: formatBRL(metrics.totalRevenue), color: "text-[#3B82F6]" },
                { icon: Zap, label: "Conversão PIX", value: `${metrics.totalOrders > 0 ? ((metrics.paidOrders / metrics.totalOrders) * 100).toFixed(1) : "0"}%`, color: "text-purple-500" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className={`rounded-[0.75rem] p-6 border ${card}`}>
                  <div className={`flex items-center gap-2 text-xs mb-2 ${textMuted}`}>
                    <Icon className="h-4 w-4" /> {label}
                  </div>
                  <p className={`text-2xl font-bold ${color}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Vendas por Produto */}
            {(() => {
              const productLabels: Record<string, string> = {
                mesa: '🪑 Mesa',
                nfe: '📄 NFe',
                envioup: '🚚 Envio UP',
              };
              // Use paidSales for precise paid data, and orders for total counts
              const productMap = new Map<string, { paidCount: number; totalCount: number; revenue: number }>();
              // Count all orders by product type
              orders.forEach((o: Order) => {
                const pt = (o as any).product_type || 'mesa';
                const existing = productMap.get(pt) || { paidCount: 0, totalCount: 0, revenue: 0 };
                existing.totalCount++;
                productMap.set(pt, existing);
              });
              // Count paid from paidSales (precise, not limited)
              (paidSales || []).forEach((sale) => {
                const pt = sale.product_type || 'mesa';
                const existing = productMap.get(pt) || { paidCount: 0, totalCount: 0, revenue: 0 };
                existing.paidCount++;
                existing.revenue += sale.amount || 0;
                productMap.set(pt, existing);
              });
              const products = Array.from(productMap.entries()).sort((a, b) => b[1].paidCount - a[1].paidCount);
              if (products.length === 0) return null;
              return (
                <div className={`rounded-[0.75rem] p-5 border ${card} mb-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold" style={{ fontFamily: "'Montserrat', sans-serif" }}>📦 Vendas por Produto</h2>
                    <button onClick={() => fetchMetrics()} className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'}`} title="Atualizar">
                      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {products.map(([type, data]) => (
                      <div key={type} className={`rounded-xl p-3 ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                        <p className="text-sm font-bold mb-1">{productLabels[type] || type}</p>
                        <p className={`text-2xl font-black ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{data.paidCount}</p>
                        <p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {data.totalCount} total · R$ {(data.revenue / 100).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Campanhas UTM - Vendas por Campanha (Hoje) */}
            {(() => {
               const now = new Date();
               const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
              const campaignMap = new Map<string, { count: number; revenue: number; source: string }>();
               (paidSales || []).forEach((sale) => {
                 const saleDateObj = new Date(sale.paid_at || '');
                 const saleDate = `${saleDateObj.getFullYear()}-${String(saleDateObj.getMonth() + 1).padStart(2, '0')}-${String(saleDateObj.getDate()).padStart(2, '0')}`;
                 if (saleDate !== todayStr) return;
                const campName = sale.campaign_name || sale.utm_campaign;
                if (!campName) return;
                const existing = campaignMap.get(campName) || { count: 0, revenue: 0, source: sale.utm_source || '' };
                existing.count++;
                existing.revenue += sale.amount || 0;
                campaignMap.set(campName, existing);
              });
              const campaigns = Array.from(campaignMap.entries())
                .sort((a, b) => b[1].count - a[1].count);
              if (campaigns.length === 0) return null;
              // showAllCampaigns state at component level
              const visible = showAllCampaigns ? campaigns : campaigns.slice(0, 5);
              return (
                <div className={`rounded-[0.75rem] p-5 border ${card} mb-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold" style={{ fontFamily: "'Montserrat', sans-serif" }}>🎯 Vendas por Campanha <span className={`text-xs font-normal ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>— Hoje</span></h2>
                    <div className="flex items-center gap-2">
                      <button onClick={() => fetchMetrics()} className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'}`} title="Atualizar campanhas">
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                      </button>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{campaigns.length} campanhas</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {visible.map(([name, data], idx) => {
                      const maxCount = campaigns[0][1].count;
                      const pct = maxCount > 0 ? (data.count / maxCount) * 100 : 0;
                      return (
                        <div key={name} className={`rounded-xl p-3 ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50'} relative overflow-hidden`}>
                          <div
                            className={`absolute inset-y-0 left-0 ${darkMode ? 'bg-[#3B82F6]/10' : 'bg-[#3B82F6]/8'} rounded-xl transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                          <div className="relative flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold w-5 text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{idx + 1}</span>
                                {data.source && (
                                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${darkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-600'}`}>
                                    {data.source}
                                  </span>
                                )}
                                <span className={`text-sm font-medium truncate ${text}`}>{name}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 ml-3 shrink-0">
                              <span className="text-sm font-bold text-[#3B82F6]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                                {formatBRL(data.revenue)}
                              </span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${darkMode ? 'bg-[#3B82F6]/20 text-[#3B82F6]' : 'bg-blue-100 text-blue-700'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                                {data.count}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {campaigns.length > 5 && (
                    <button
                      onClick={() => setShowAllCampaigns(!showAllCampaigns)}
                      className={`w-full mt-3 py-2 text-xs font-semibold rounded-lg transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                    >
                      {showAllCampaigns ? 'Mostrar menos' : `Ver todas (${campaigns.length})`}
                    </button>
                  )}
                </div>
              );
            })()}


            {/* Chart */}
            <div className={`rounded-[0.75rem] p-6 border ${card} mb-6`}>
              <h2 className="text-base font-bold mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>Pedidos por Dia</h2>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#e5e7eb"} />
                  <XAxis dataKey="date" tick={{ fill: darkMode ? "#9CA3AF" : "#6b7280", fontSize: 11 }} />
                  <YAxis tick={{ fill: darkMode ? "#9CA3AF" : "#6b7280", fontSize: 11 }} />
                  <Tooltip contentStyle={{
                    backgroundColor: darkMode ? "#1F2937" : "#fff",
                    border: `1px solid ${darkMode ? "#374151" : "#e5e7eb"}`,
                    borderRadius: "12px",
                    color: darkMode ? "#fff" : "#111",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  }} />
                  <Legend />
                  <Bar dataKey="orders" name="Pedidos Diários" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                  <Line type="monotone" dataKey="orders" name="Tendência" stroke="#3B82F6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Orders table */}
            <div className={`rounded-[0.75rem] border ${card} mb-6 overflow-hidden`}>
              <div className={`px-5 py-4 flex items-center justify-between border-b ${tableHeaderBorder}`}>
                <h2 className="text-base font-bold" style={{ fontFamily: "'Montserrat', sans-serif" }}>Pedidos Recentes</h2>
                <div className="flex items-center gap-3">
                  <span className={`text-xs ${textMuted2} font-medium`}>{orders.length} pedidos</span>
                  <Button
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg h-8 px-3 text-xs"
                    onClick={async () => {
                      try {
                        toast.info("Varrendo pedidos Duttyfy pendentes...");
                        const res = await fetch(`${SUPABASE_URL}/functions/v1/sweep-duttyfy`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                        });
                        const data = await res.json();
                        if (data.error) {
                          toast.error(`Erro: ${data.error}`);
                        } else if (data.paid > 0) {
                          toast.success(`✓ ${data.paid} venda(s) marcada(s) como paga(s)!`);
                          fetchMetrics();
                        } else {
                          toast.info(`Verificados ${data.checked} pedidos, nenhum pago.`);
                        }
                      } catch (err: any) {
                        toast.error(`Erro: ${err.message}`);
                      }
                    }}
                  >
                    <Zap className="h-3 w-3 mr-1" /> Sweep
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchMetrics()}
                    disabled={isLoading}
                    className={`h-8 px-2.5 rounded-lg ${btnOutline}`}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`text-left text-xs ${textMuted} border-b ${tableHeaderBorder}`}>
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Valor</th>
                      <th className="px-4 py-3 font-medium">Líquido</th>
                      <th className="px-4 py-3 font-medium">Cor</th>
                      <th className="px-4 py-3 font-medium">UTM</th>
                      <th className="px-4 py-3 font-medium">Gateway</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Pix</th>
                      <th className="px-4 py-3 font-medium">Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr><td colSpan={9} className={`px-4 py-8 text-center ${textMuted2}`}>Nenhum pedido ainda</td></tr>
                    ) : (
                      orders.slice(0, ordersVisible).map((order) => (
                        <tr key={order.id} className={`border-b ${tableRowBorder} ${tableRowHover} transition-colors`}>
                          <td className="px-4 py-3">
                            <p className={`font-medium text-sm ${text}`}>{order.customer_name}</p>
                            <p className={`text-xs ${textMuted2}`}>{order.customer_email}</p>
                          </td>
                          <td className={`px-4 py-3 font-semibold ${text}`}>{formatBRL(order.amount)}</td>
                          <td className={`px-4 py-3 text-xs ${(order.status === "paid" || order.status === "approved") ? "text-blue-400 font-semibold" : textMuted2}`}>
                            {(order.status === "paid" || order.status === "approved")
                              ? formatBRL(order.amount - Math.round(order.amount * 0.06) - 197)
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block w-5 h-5 rounded-full border-2 ${order.color === "preta" ? "bg-gray-900 border-gray-500" : "bg-white border-gray-300"}`} />
                          </td>
                          <td className={`px-4 py-3 text-xs ${textMuted}`}>
                            {order.utm_source ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold">{order.utm_source}</span>
                                {order.utm_campaign && <span className={`text-[10px] ${textMuted2} truncate max-w-[120px]`} title={order.utm_campaign}>{order.utm_campaign}</span>}
                              </div>
                            ) : <span className={textMuted2}>—</span>}
                          </td>
                          <td className={`px-4 py-3 text-xs ${textMuted}`}>{order.gateway === "blackcat" ? "BlackCat" : order.gateway === "paradise" ? "Paradise" : "Duttyfy"}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                              order.status === "paid" || order.status === "approved"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                                : order.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400"
                                  : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                            }`}>
                              {order.status === "paid" || order.status === "approved" ? "Pago" : order.status === "pending" ? "Pendente" : order.status === "cancelled" ? "Cancelado" : order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {order.pix_code ? (
                              <button
                                onClick={() => { navigator.clipboard.writeText(order.pix_code!); toast.success("Pix copiado!"); }}
                                title={order.pix_code}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors font-medium"
                              >
                                <Copy className="h-3 w-3" /> Copiar
                              </button>
                            ) : <span className={textMuted2}>—</span>}
                          </td>
                          <td className={`px-4 py-3 text-xs ${textMuted}`}>
                            <span title={new Date(order.created_at).toLocaleString("pt-BR")}>{timeAgo(order.created_at)}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {orders.length > ordersVisible && (
                <div className={`px-5 py-3 border-t ${tableHeaderBorder} text-center`}>
                  <Button variant="ghost" size="sm" className="text-[#3B82F6] hover:text-blue-600 hover:bg-blue-50 rounded-[0.75rem] font-semibold"
                    onClick={() => setOrdersVisible(prev => prev + 10)}>
                    Ver mais ({orders.length - ordersVisible} restantes)
                  </Button>
                </div>
              )}
            </div>

            {/* Clear buttons */}
            <div className="flex gap-3 mb-8">
              <Button variant="destructive" size="sm" className="bg-red-500 hover:bg-red-600 rounded-xl" onClick={async () => {
                if (!confirm("Apagar todos os pedidos?")) return;
                await fetch(`${SUPABASE_URL}/functions/v1/checkout-admin-metrics?action=clear-orders`, {
                  method: "POST", headers: { Authorization: `Bearer ${session?.access_token}` },
                });
                toast.success("Pedidos apagados"); fetchMetrics();
              }}>
                <Trash2 className="h-3 w-3 mr-1" /> Zerar pedidos
              </Button>
              <Button variant="destructive" size="sm" className="bg-red-500 hover:bg-red-600 rounded-xl" onClick={async () => {
                if (!confirm("Apagar todos os eventos do funil?")) return;
                await fetch(`${SUPABASE_URL}/functions/v1/checkout-admin-metrics?action=clear-events`, {
                  method: "POST", headers: { Authorization: `Bearer ${session?.access_token}` },
                });
                toast.success("Eventos apagados"); fetchMetrics();
              }}>
                <Trash2 className="h-3 w-3 mr-1" /> Zerar funil
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Confirmação de troca de gateway */}
      <AlertDialog open={!!pendingGateway} onOpenChange={(open) => { if (!open) setPendingGateway(null); }}>
        <AlertDialogContent className={darkMode ? "bg-gray-900 border-gray-700 text-white" : ""}>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar troca de adquirente</AlertDialogTitle>
            <AlertDialogDescription className={darkMode ? "text-gray-400" : ""}>
              Tem certeza que deseja trocar o gateway ativo de{" "}
              <strong className={darkMode ? "text-white" : "text-gray-900"}>{gatewayDisplayName(gateway.active)}</strong> para{" "}
              <strong className={darkMode ? "text-white" : "text-gray-900"}>{pendingGateway ? gatewayDisplayName(pendingGateway) : ""}</strong>?
              <br /><br />
              Todos os novos pagamentos serão processados pela nova adquirente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={darkMode ? "bg-gray-800 border-gray-600 text-white hover:bg-gray-700" : ""}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGatewaySwitch} className="bg-blue-600 hover:bg-blue-700 text-white">
              Confirmar troca
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Collapsible card component
const CollapsibleCard = ({
  icon, title, subtitle, isOpen, onToggle, children, card, cardHover, textMuted2,
}: {
  icon: React.ReactNode; title: string; subtitle: string;
  isOpen: boolean; onToggle: () => void; children: React.ReactNode;
  card: string; cardHover: string; textMuted2: string;
}) => (
  <div className={`rounded-[0.75rem] border ${card} mb-6 overflow-hidden`}>
    <button onClick={onToggle}
      className={`w-full px-5 py-4 flex items-center justify-between ${cardHover} transition-colors`}>
      <div className="flex items-center gap-3">
        {icon}
        <div className="text-left">
          <h2 className="text-sm font-bold">{title}</h2>
          <p className={`text-xs ${textMuted2}`}>{subtitle}</p>
        </div>
      </div>
      {isOpen ? <ChevronUp className={`h-4 w-4 ${textMuted2}`} /> : <ChevronDown className={`h-4 w-4 ${textMuted2}`} />}
    </button>
    {isOpen && (
      <div className={`px-5 pb-5 pt-4 border-t ${card.includes('gray-800') ? 'border-gray-800' : 'border-gray-100'}`}>
        {children}
      </div>
    )}
  </div>
);

// Paid Sales Tab Component
const PaidSalesTab = ({ paidSales, dateRange, setDateRange, darkMode, card, textMuted, textMuted2, text, tabActive, tabInactive, tableRowBorder, tableRowHover, tableHeaderBorder }: {
  paidSales: PaidSale[]; dateRange: number; setDateRange: (d: number) => void;
  darkMode: boolean; card: string; textMuted: string; textMuted2: string; text: string;
  tabActive: string; tabInactive: string; tableRowBorder: string; tableRowHover: string; tableHeaderBorder: string;
}) => (
  <div>
    <div className="flex gap-2 mb-6 justify-end flex-wrap">
      {[
        { label: "Hoje", value: 0 },
        { label: "Ontem", value: 1 },
        { label: "7 dias", value: 7 },
        { label: "14 dias", value: 14 },
        { label: "30 dias", value: 30 },
      ].map((d) => (
        <button key={d.value} onClick={() => setDateRange(d.value)}
          className={`rounded-[0.75rem] px-5 py-3 text-sm font-semibold transition-all ${dateRange === d.value ? tabActive : tabInactive}`}>
          {d.label}
        </button>
      ))}
    </div>

    <div className={`rounded-[0.75rem] border ${card} mb-6 overflow-hidden`}>
      <div className={`px-5 py-4 flex items-center justify-between border-b ${tableHeaderBorder}`}>
        <h2 className="text-base font-bold" style={{ fontFamily: "'Montserrat', sans-serif" }}>💰 Vendas Pagas — Atribuição de Campanha</h2>
        <span className={`text-xs ${textMuted2} font-medium`}>{paidSales.length} vendas</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`text-left text-xs ${textMuted} border-b ${tableHeaderBorder}`}>
              <th className="px-3 py-3 font-medium">Cliente</th>
              <th className="px-3 py-3 font-medium">Valor</th>
              <th className="px-3 py-3 font-medium">Pago em</th>
              <th className="px-3 py-3 font-medium">Campanha</th>
              <th className="px-3 py-3 font-medium">Conjunto</th>
              <th className="px-3 py-3 font-medium">Anúncio</th>
              <th className="px-3 py-3 font-medium">Fonte</th>
              <th className="px-3 py-3 font-medium">ttclid</th>
            </tr>
          </thead>
          <tbody>
            {paidSales.length === 0 ? (
              <tr><td colSpan={8} className={`px-4 py-8 text-center ${textMuted2}`}>Nenhuma venda paga encontrada</td></tr>
            ) : (
              paidSales.map((sale) => (
                <tr key={sale.id} className={`border-b ${tableRowBorder} ${tableRowHover} transition-colors`}>
                  <td className="px-3 py-3">
                    <p className={`font-medium text-xs ${text}`}>{sale.customer_name}</p>
                  </td>
                  <td className="px-3 py-3 text-blue-500 font-semibold text-xs">{formatBRL(sale.amount)}</td>
                  <td className={`px-3 py-3 text-xs ${textMuted}`}>
                    {new Date(sale.paid_at).toLocaleDateString("pt-BR")}<br />
                    {new Date(sale.paid_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-3 py-3">
                    {sale.campaign_name || sale.campaign_id ? (
                      <div>
                        <p className={`text-xs ${text}`}>{sale.campaign_name || "—"}</p>
                        {sale.campaign_id && <p className={`text-[10px] font-mono ${textMuted2}`}>{sale.campaign_id}</p>}
                      </div>
                    ) : <span className={`text-xs ${textMuted2}`}>—</span>}
                  </td>
                  <td className="px-3 py-3">
                    {sale.adset_name || sale.adset_id ? (
                      <div>
                        <p className={`text-xs ${text}`}>{sale.adset_name || "—"}</p>
                        {sale.adset_id && <p className={`text-[10px] font-mono ${textMuted2}`}>{sale.adset_id}</p>}
                      </div>
                    ) : <span className={`text-xs ${textMuted2}`}>—</span>}
                  </td>
                  <td className="px-3 py-3">
                    {sale.ad_name || sale.ad_id ? (
                      <div>
                        <p className={`text-xs ${text}`}>{sale.ad_name || "—"}</p>
                        {sale.ad_id && <p className={`text-[10px] font-mono ${textMuted2}`}>{sale.ad_id}</p>}
                      </div>
                    ) : <span className={`text-xs ${textMuted2}`}>—</span>}
                  </td>
                  <td className="px-3 py-3">
                    {sale.utm_source ? (
                      <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-500/30 font-semibold">{sale.utm_source}</span>
                    ) : <span className={`text-xs ${textMuted2}`}>—</span>}
                  </td>
                  <td className="px-3 py-3">
                    {sale.ttclid ? (
                      <span className={`text-[10px] font-mono max-w-[100px] truncate block ${textMuted2}`} title={sale.ttclid}>{sale.ttclid.slice(0, 12)}...</span>
                    ) : <span className={`text-xs ${textMuted2}`}>—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default AdminCheckout;
