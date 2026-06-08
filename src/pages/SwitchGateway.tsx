import { useEffect, useState } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const GATEWAYS = [
  { id: "paradise", name: "Paradise", color: "#7c3aed" },
  { id: "duttyfy", name: "Duttyfy", color: "#0ea5e9" },
  { id: "buckpay", name: "BuckPay", color: "#10b981" },
];

export default function SwitchGateway() {
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");

  const load = async () => {
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/switch-gateway`, {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      });
      const j = await r.json();
      setActive(j.active);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const switchTo = async (gw: string) => {
    setLoading(gw); setMsg("");
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/switch-gateway`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ gateway: gw }),
      });
      const j = await r.json();
      if (j.success) { setActive(j.active); setMsg(`Gateway ativo: ${j.active}`); }
      else setMsg(j.error || "Erro");
    } catch (e: any) { setMsg(String(e?.message || e)); }
    finally { setLoading(null); }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold mb-2">Trocar Gateway</h1>
      <p className="text-sm text-gray-400 mb-6">Ativo: <strong className="text-white">{active || "..."}</strong></p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
        {GATEWAYS.map(g => (
          <button
            key={g.id}
            disabled={loading !== null}
            onClick={() => switchTo(g.id)}
            className={`px-4 py-4 rounded-lg font-semibold transition border-2 ${active === g.id ? "border-white" : "border-transparent"} disabled:opacity-50`}
            style={{ background: g.color }}
          >
            {loading === g.id ? "..." : g.name}
            {active === g.id && <span className="block text-xs mt-1 opacity-80">ativo</span>}
          </button>
        ))}
      </div>
      {msg && <p className="mt-4 text-sm text-gray-300">{msg}</p>}
    </div>
  );
}
