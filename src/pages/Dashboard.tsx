import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId } from "@/lib/tracking";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Users, MapPin, Clock, Trash2, RefreshCw, Wifi, LogOut, Trophy, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";

const SUPABASE_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface DailyData {
  date: string;
  views: number;
  clicks: number;
}

interface LocationData {
  location: string;
  count: number;
}

interface OnlineUser {
  id: string;
  ip?: string;
  city?: string;
  region?: string;
  online_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [totalViews, setTotalViews] = useState(0);
  const [uniqueVisitors, setUniqueVisitors] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [clicksPreta, setClicksPreta] = useState(0);
  const [clicksBranca, setClicksBranca] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [chartData, setChartData] = useState<DailyData[]>([]);
  const [dateRange, setDateRange] = useState(7);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [peakOnline, setPeakOnline] = useState(0);

  // Check authentication and admin role
  useEffect(() => {
    let isMounted = true;

    const checkAdminRole = async (userId: string) => {
      try {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle();
        return !!roleData;
      } catch (error) {
        console.error('Error checking admin role:', error);
        return false;
      }
    };

    // Set up listener FIRST (before getSession)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return;
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          navigate('/admin');
          return;
        }

        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          
          // Check admin role on any auth event with a user
          setTimeout(async () => {
            if (!isMounted) return;
            const isAdmin = await checkAdminRole(newSession.user.id);
            if (!isMounted) return;
            if (isAdmin) {
              setIsAuthChecking(false);
            }
          }, 0);
        }
      }
    );

    // THEN do initial check
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (!currentSession?.user) {
          navigate('/admin');
          return;
        }

        setSession(currentSession);
        setUser(currentSession.user);

        const isAdmin = await checkAdminRole(currentSession.user.id);
        if (!isMounted) return;

        if (!isAdmin) {
          toast.error('Acesso negado. Você não é administrador.');
          await supabase.auth.signOut();
          navigate('/admin');
          return;
        }

        setIsAuthChecking(false);
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) navigate('/admin');
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchMetrics = useCallback(async () => {
    if (!session?.access_token) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/admin-metrics?days=${dateRange}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );
      
      const metricsData = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          toast.error('Sessão expirada. Faça login novamente.');
          await supabase.auth.signOut();
          navigate('/admin');
          return;
        }
        throw new Error(metricsData.error || 'Erro ao buscar métricas');
      }

      setTotalViews(metricsData.totalViews || 0);
      setUniqueVisitors(metricsData.uniqueVisitors || 0);
      setTotalClicks(metricsData.totalClicks || 0);
      setClicksPreta(metricsData.clicksPreta || 0);
      setClicksBranca(metricsData.clicksBranca || 0);
      setLocations(metricsData.locations || []);
      setChartData(metricsData.chartData || []);
      setPeakOnline(metricsData.peakOnline || 0);
      setLastUpdate(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      toast.error('Erro ao carregar métricas');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, session, navigate]);

  useEffect(() => {
    if (!isAuthChecking && session) {
      fetchMetrics();
      const cleanup = setupPresence();
      
      // Refresh every 10 seconds for faster updates
      const interval = setInterval(fetchMetrics, 10000);

      // Realtime subscription for instant updates on new clicks/views
      const realtimeChannel = supabase
        .channel('dashboard-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'click_events' }, () => {
          fetchMetrics();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'page_views' }, () => {
          fetchMetrics();
        })
        .subscribe();

      return () => {
        cleanup();
        clearInterval(interval);
        supabase.removeChannel(realtimeChannel);
      };
    }
  }, [fetchMetrics, isAuthChecking, session]);

  const setupPresence = () => {
    const channel = supabase.channel("online-users", {
      config: { presence: { key: getVisitorId() } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];
        
        Object.entries(state).forEach(([key, presences]) => {
          if (Array.isArray(presences) && presences.length > 0) {
            const presence = presences[0] as any;
            users.push({
              id: key,
              ip: presence.ip,
              city: presence.city,
              region: presence.region,
              online_at: presence.online_at,
            });
          }
        });
        
        setOnlineUsers(users);

        // Update peak if new record
        if (users.length > 0 && session?.access_token) {
          fetch(
            `${SUPABASE_FUNCTIONS_URL}/admin-metrics?action=update-peak`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ currentOnline: users.length }),
            }
          ).then(r => r.json()).then(data => {
            if (data.newPeak) setPeakOnline(data.newPeak);
          }).catch(() => {});
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };



  const handleClearClicks = async () => {
    if (!session?.access_token) return;
    
    if (!confirm('Tem certeza que deseja apagar todos os cliques? Esta ação não pode ser desfeita.')) {
      return;
    }

    setIsClearing(true);
    try {
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/admin-metrics?action=clear-clicks`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success('Todos os cliques foram apagados!');
        fetchMetrics();
      } else {
        toast.error(result.error || 'Erro ao apagar cliques');
      }
    } catch (err) {
      console.error('Error clearing clicks:', err);
      toast.error('Erro ao apagar cliques');
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearViews = async () => {
    if (!session?.access_token) return;
    
    if (!confirm('Tem certeza que deseja apagar todas as visitas? Esta ação não pode ser desfeita.')) {
      return;
    }

    setIsClearing(true);
    try {
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/admin-metrics?action=clear-views`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success('Todas as visitas foram apagadas!');
        fetchMetrics();
      } else {
        toast.error(result.error || 'Erro ao apagar visitas');
      }
    } catch (err) {
      console.error('Error clearing views:', err);
      toast.error('Erro ao apagar visitas');
    } finally {
      setIsClearing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  // Show loading while checking auth
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // If no user after auth check, don't render (will redirect)
  if (!user) {
    return null;
  }

  const conversionRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0";

  // Group online users by location, collect IPs
  const onlineByLocation: Record<string, { count: number; ips: string[] }> = {};
  onlineUsers.forEach(u => {
    const loc = u.city && u.region 
      ? `${u.city}, ${u.region}` 
      : 'Desconhecido';
    if (!onlineByLocation[loc]) {
      onlineByLocation[loc] = { count: 0, ips: [] };
    }
    onlineByLocation[loc].count++;
    if (u.ip && !onlineByLocation[loc].ips.includes(u.ip)) {
      onlineByLocation[loc].ips.push(u.ip);
    }
  });

  const sortedOnlineLocations = Object.entries(onlineByLocation)
    .sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <h1 className="text-xl font-bold">Shop — Admin</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 hidden md:block">
            {user.email}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchMetrics}
            disabled={isLoading}
            className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/admincheckout")}
            className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <ShoppingCart className="h-4 w-4 mr-1" /> Checkout
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <LogOut className="h-4 w-4" />
          </Button>
          <span className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm font-medium border border-green-500/30">
            <Wifi className="h-3 w-3 inline mr-1" />
            Ao vivo
          </span>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex gap-2 mb-6">
        {[
          { label: "Hoje", value: 1 },
          { label: "7 dias", value: 7 },
          { label: "14 dias", value: 14 },
          { label: "30 dias", value: 30 },
        ].map((d) => (
          <button
            key={d.value}
            onClick={() => setDateRange(d.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              dateRange === d.value
                ? "bg-primary text-white"
                : "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Users className="h-4 w-4" />
            Visitantes Ativos
          </div>
          <p className="text-3xl font-bold text-white">{onlineUsers.length}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <MapPin className="h-4 w-4 text-red-400" />
            Localizações
          </div>
          <p className="text-3xl font-bold text-white">{sortedOnlineLocations.length}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Clock className="h-4 w-4" />
            Última atualização
          </div>
          <p className="text-3xl font-bold text-white">{lastUpdate || '--:--:--'}</p>
        </div>
      </div>

      {/* Online users by location */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-4 w-4 text-red-400" />
          <h2 className="text-sm font-semibold text-gray-300">Visitantes por Localização</h2>
        </div>
        
        {sortedOnlineLocations.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {sortedOnlineLocations.map(([location, data]) => (
              <div 
                key={location} 
                className="bg-gray-800 rounded-lg px-3 py-2"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300 truncate">{location}</span>
                  <span className="text-sm font-bold text-green-400 ml-2">{data.count}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {data.ips.map(ip => (
                    <span key={ip} className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded font-mono">
                      {ip}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Nenhum visitante online no momento</p>
        )}
      </div>

      {/* Metrics summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <MetricCard label="Total visitas" value={totalViews} />
        <MetricCard label="Únicos" value={uniqueVisitors} />
        <MetricCard label="Cliques comprar" value={totalClicks} highlight />
        <MetricCard label="Conversão" value={`${conversionRate}%`} />
        <MetricCard label="Online agora" value={onlineUsers.length} online />
        <div className="rounded-xl p-4 bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-center gap-1">
            <Trophy className="h-3 w-3 text-yellow-400" />
            <p className="text-xs text-gray-500">Recorde online</p>
          </div>
          <p className="text-xl font-bold text-yellow-400">{peakOnline}</p>
        </div>
      </div>

      {/* Clicks by color */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-xl bg-black p-4 border border-gray-800">
          <p className="text-xs text-gray-500 mb-1">Cliques Preta</p>
          <p className="text-2xl font-bold text-white">{clicksPreta}</p>
        </div>
        <div className="rounded-xl bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Cliques Branca</p>
          <p className="text-2xl font-bold text-gray-900">{clicksBranca}</p>
        </div>
      </div>

      {/* Clear buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button 
          variant="destructive" 
          onClick={handleClearClicks}
          disabled={isClearing}
          className="bg-red-600 hover:bg-red-700"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isClearing ? 'Apagando...' : 'Zerar cliques'}
        </Button>
        <Button 
          variant="destructive" 
          onClick={handleClearViews}
          disabled={isClearing}
          className="bg-red-600 hover:bg-red-700"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isClearing ? 'Apagando...' : 'Zerar visitas'}
        </Button>
        <Button 
          variant="outline" 
          onClick={async () => {
            if (!session?.access_token) return;
            if (!confirm('Zerar o recorde de visitantes online?')) return;
            const res = await fetch(
              `${SUPABASE_FUNCTIONS_URL}/admin-metrics?action=reset-peak`,
              { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` } }
            );
            const data = await res.json();
            if (data.success) { setPeakOnline(0); toast.success('Recorde zerado!'); }
          }}
          disabled={isClearing}
          className="bg-transparent border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
        >
          <Trophy className="h-4 w-4 mr-2" />
          Zerar recorde
        </Button>
      </div>



      {/* Chart */}
      <div className="rounded-xl bg-gray-900 p-4 border border-gray-800 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Tráfego por dia</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            <Bar dataKey="views" name="Visitas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="clicks" name="Cliques" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Historical locations */}
      {locations.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">
            Top Localizações (últimos {dateRange} dias)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {locations.slice(0, 15).map(({ location, count }) => (
              <div 
                key={location} 
                className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2"
              >
                <span className="text-sm text-gray-300 truncate">{location}</span>
                <span className="text-sm font-bold text-primary ml-2">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({
  label,
  value,
  highlight,
  online,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  online?: boolean;
}) => (
  <div
    className={`rounded-xl p-4 ${
      online 
        ? "bg-green-500/10 border border-green-500/30" 
        : highlight 
        ? "bg-primary/10 border border-primary/30" 
        : "bg-gray-900 border border-gray-800"
    }`}
  >
    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
    <p className={`text-xl font-bold ${
      online ? "text-green-400" : highlight ? "text-primary" : "text-white"
    }`}>
      {value}
    </p>
  </div>
);

export default Dashboard;
