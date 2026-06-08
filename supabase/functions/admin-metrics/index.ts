import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Check for Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No auth header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No token provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create client with user's token to verify auth
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify token and get user claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      console.log('Invalid token:', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const userId = claimsData.user.id;
    console.log(`Authenticated user: ${userId}`);

    // Use service role client to check admin role (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.log(`User ${userId} is not an admin`);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log(`Admin verified: ${userId}`);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const days = parseInt(url.searchParams.get('days') || '7');

    // Handle clear clicks action
    if (req.method === 'POST' && action === 'clear-clicks') {
      console.log(`Admin ${userId} clearing all click events...`);
      const { error } = await supabaseAdmin.from('click_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) {
        console.error('Error clearing clicks:', error);
        throw error;
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'Todos os cliques foram apagados' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle clear views action
    if (req.method === 'POST' && action === 'clear-views') {
      console.log(`Admin ${userId} clearing all page views...`);
      const { error } = await supabaseAdmin.from('page_views').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) {
        console.error('Error clearing views:', error);
        throw error;
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'Todas as visitas foram apagadas' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle update peak action
    if (req.method === 'POST' && action === 'update-peak') {
      const body = await req.json();
      const currentOnline = body.currentOnline || 0;
      const { data: peakData } = await supabaseAdmin
        .from('site_records').select('value').eq('id', 'peak_online').single();
      const currentPeak = peakData?.value || 0;
      if (currentOnline > currentPeak) {
        await supabaseAdmin.from('site_records')
          .update({ value: currentOnline, updated_at: new Date().toISOString() })
          .eq('id', 'peak_online');
        return new Response(JSON.stringify({ success: true, newPeak: currentOnline }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true, newPeak: currentPeak }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Handle reset peak action
    if (req.method === 'POST' && action === 'reset-peak') {
      await supabaseAdmin.from('site_records')
        .update({ value: 0, updated_at: new Date().toISOString() }).eq('id', 'peak_online');
      return new Response(JSON.stringify({ success: true, message: 'Recorde zerado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get metrics
    const now = new Date();
    let since: Date;
    let chartDays: number;

    if (days === 1) {
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      chartDays = 1;
    } else {
      since = new Date(now.getTime() - days * 86400000);
      chartDays = days;
    }
    const sinceStr = since.toISOString();

    console.log(`Fetching metrics since ${sinceStr}`);

    // Helper to fetch ALL rows bypassing 1000 limit
    async function fetchAll(table: string, sinceStr: string) {
      const pageSize = 1000;
      let allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*')
          .gte('created_at', sinceStr)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    }

    const [views, clicks, peakRes] = await Promise.all([
      fetchAll('page_views', sinceStr),
      fetchAll('click_events', sinceStr),
      supabaseAdmin.from('site_records').select('value').eq('id', 'peak_online').single(),
    ]);

    const peakOnline = peakRes.data?.value || 0;

    console.log(`Found ${views.length} views and ${clicks.length} clicks`);

    // Calculate metrics
    const totalViews = views.length;
    const uniqueVisitors = new Set(views.map((v: any) => v.visitor_id)).size;
    const totalClicks = clicks.length;
    const clicksPreta = clicks.filter((c: any) => c.color_chosen === 'preta').length;
    const clicksBranca = clicks.filter((c: any) => c.color_chosen === 'branca').length;

    // Build location stats
    const locationMap: Record<string, number> = {};
    views.forEach((v: any) => {
      const city = v.city || 'Desconhecido';
      const region = v.region || 'Desconhecido';
      const key = `${city}, ${region}`;
      locationMap[key] = (locationMap[key] || 0) + 1;
    });

    const locations = Object.entries(locationMap)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);

    // Build daily chart data
    const dailyMap: Record<string, { views: number; clicks: number }> = {};
    for (let i = 0; i < chartDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { views: 0, clicks: 0 };
    }
    views.forEach((v: any) => {
      const key = v.created_at.split('T')[0];
      if (dailyMap[key]) dailyMap[key].views++;
    });
    clicks.forEach((c: any) => {
      const key = c.created_at.split('T')[0];
      if (dailyMap[key]) dailyMap[key].clicks++;
    });

    const chartData = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({ date: date.slice(5), views: d.views, clicks: d.clicks }));

    return new Response(
      JSON.stringify({
        totalViews, uniqueVisitors, totalClicks, clicksPreta, clicksBranca,
        locations, chartData, uniqueLocations: locations.length, peakOnline,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
