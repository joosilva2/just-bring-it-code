import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Auth check
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.user.id;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Admin check
    const { data: roleData } = await supabaseAdmin
      .from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').single();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const days = parseInt(url.searchParams.get('days') || '7');
    const startDateParam = url.searchParams.get('start_date');
    const endDateParam = url.searchParams.get('end_date');
    const statusFilter = url.searchParams.get('status_filter');

    // ===== POST ACTIONS =====
    if (req.method === 'POST') {
      if (action === 'update-gateway') {
        const body = await req.json();
        const { active_gateway, blackcat_api_key, paradise_api_key, duttyfy_api_url, buckpay_api_key, buckpay_user_agent, ironpay_api_key, redirect_url } = body;
        const updates: Record<string, any> = { updated_by: userId };
        if (active_gateway) updates.active_gateway = active_gateway;
        if (blackcat_api_key !== undefined) updates.blackcat_api_key = blackcat_api_key;
        if (paradise_api_key !== undefined) updates.paradise_api_key = paradise_api_key;
        if (duttyfy_api_url !== undefined) updates.duttyfy_api_url = duttyfy_api_url;
        if (buckpay_api_key !== undefined) updates.buckpay_api_key = buckpay_api_key;
        if (buckpay_user_agent !== undefined) updates.buckpay_user_agent = buckpay_user_agent;
        if (ironpay_api_key !== undefined) updates.ironpay_api_key = ironpay_api_key;
        if (redirect_url !== undefined) updates.redirect_url = redirect_url || null;
        const { error } = await supabaseAdmin
          .from('gateway_config')
          .upsert({ id: 'active', ...updates }, { onConflict: 'id' });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (action === 'add-pixel') {
        const body = await req.json();
        const { pixel_id, label, track_pending, track_paid, access_token_env } = body;
        if (!pixel_id?.trim()) throw new Error('pixel_id is required');
        const { error } = await supabaseAdmin.from('tiktok_pixels').insert({
          pixel_id: pixel_id.trim(), label: label || null,
          track_pending: track_pending ?? false, track_paid: track_paid ?? true,
          access_token_env: access_token_env?.trim() || 'TIKTOK_ACCESS_TOKEN',
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (action === 'delete-pixel') {
        const body = await req.json();
        const { id } = body;
        if (!id) throw new Error('id is required');
        await supabaseAdmin.from('tiktok_pixels').delete().eq('id', id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (action === 'add-pinterest-tag') {
        const body = await req.json();
        const { tag_id, label } = body;
        if (!tag_id?.trim()) throw new Error('tag_id is required');
        const { error } = await supabaseAdmin.from('pinterest_tags').insert({
          tag_id: tag_id.trim(), label: label || null,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (action === 'delete-pinterest-tag') {
        const body = await req.json();
        const { id } = body;
        if (!id) throw new Error('id is required');
        await supabaseAdmin.from('pinterest_tags').delete().eq('id', id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (action === 'add-google-pixel') {
        const body = await req.json();
        const { pixel_id, conversion_label, label } = body;
        if (!pixel_id?.trim()) throw new Error('pixel_id is required');
        const { error } = await supabaseAdmin.from('google_pixels').insert({
          pixel_id: pixel_id.trim(),
          conversion_label: conversion_label?.trim() || null,
          label: label || null,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (action === 'delete-google-pixel') {
        const body = await req.json();
        const { id } = body;
        if (!id) throw new Error('id is required');
        await supabaseAdmin.from('google_pixels').delete().eq('id', id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (action === 'update-pixel') {
        const body = await req.json();
        const { id, track_pending, track_paid } = body;
        if (!id) throw new Error('id is required');
        const updates: Record<string, any> = {};
        if (track_pending !== undefined) updates.track_pending = track_pending;
        if (track_paid !== undefined) updates.track_paid = track_paid;
        await supabaseAdmin.from('tiktok_pixels').update(updates).eq('id', id);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (action === 'test-insert-order') {
        const body = await req.json();
        const { external_ref, gateway_transaction_id, amount, customer_name, customer_email, customer_phone } = body;
        if (!external_ref) throw new Error('external_ref is required');
        const { error } = await supabaseAdmin.from('orders').insert({
          external_ref, gateway_transaction_id: gateway_transaction_id || '',
          gateway: 'paradise', status: 'created', amount: amount || 500,
          quantity: 1, customer_name: customer_name || 'Teste',
          customer_email: customer_email || 'teste@teste.com',
          customer_phone: customer_phone || '11999999999',
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (action === 'clear-orders') {
        await supabaseAdmin.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (action === 'clear-events') {
        await supabaseAdmin.from('checkout_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ===== GET METRICS =====
    // Use BRT (UTC-3) for date boundaries to match user's local timezone
    const BRT_OFFSET = '-03:00';
    let sinceStr: string;
    let untilStr: string | null = null;

    if (startDateParam) {
      // Convert local date to proper BRT boundaries
      sinceStr = new Date(startDateParam + 'T00:00:00' + BRT_OFFSET).toISOString();
      if (endDateParam) {
        untilStr = new Date(endDateParam + 'T23:59:59.999' + BRT_OFFSET).toISOString();
      } else {
        untilStr = new Date(startDateParam + 'T23:59:59.999' + BRT_OFFSET).toISOString();
      }
    } else {
      // For days-based queries, calculate BRT "today" start
      const nowUTC = new Date();
      // BRT is UTC-3, so BRT current time = UTC - 3h
      const brtNow = new Date(nowUTC.getTime() - 3 * 60 * 60 * 1000);
      const brtDateStr = brtNow.toISOString().split('T')[0]; // YYYY-MM-DD in BRT

      if (days === 0) {
        // Today in BRT
        sinceStr = new Date(brtDateStr + 'T00:00:00' + BRT_OFFSET).toISOString();
        untilStr = new Date(brtDateStr + 'T23:59:59.999' + BRT_OFFSET).toISOString();
      } else if (days === 1) {
        // Yesterday in BRT
        const yesterday = new Date(brtNow);
        yesterday.setDate(yesterday.getDate() - 1);
        const yDateStr = yesterday.toISOString().split('T')[0];
        sinceStr = new Date(yDateStr + 'T00:00:00' + BRT_OFFSET).toISOString();
        untilStr = new Date(yDateStr + 'T23:59:59.999' + BRT_OFFSET).toISOString();
      } else {
        const since = new Date(brtNow);
        since.setDate(since.getDate() - days);
        const sinceDateStr = since.toISOString().split('T')[0];
        sinceStr = new Date(sinceDateStr + 'T00:00:00' + BRT_OFFSET).toISOString();
        // No upper bound for multi-day ranges
      }
    }

    // Build range filter helper
    const withRange = (query: any) => {
      query = query.gte('created_at', sinceStr);
      if (untilStr) query = query.lte('created_at', untilStr);
      return query;
    };

    // Run ALL queries in parallel for maximum speed
    const [allOrdersRes, eventsCountRes, gatewayRes, pixelsRes, pinterestTagsRes, googlePixelsRes, orderCountsRes] = await Promise.all([
      // Orders for display (limited)
      (async () => {
        let q = supabaseAdmin
          .from('orders')
          .select('id,external_ref,gateway,status,amount,color,product_type,customer_name,customer_email,customer_phone,created_at,paid_at,pix_code,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,utm_source,utm_campaign,utm_medium,ttclid')
          .gte('created_at', sinceStr)
          .order('created_at', { ascending: false })
          .limit(500);
        if (untilStr) q = q.lte('created_at', untilStr);
        return q;
      })(),
      // Funnel counts
      Promise.all([
        withRange(supabaseAdmin.from('checkout_events').select('id', { count: 'exact', head: true }).eq('event_type', 'site_visit')),
        withRange(supabaseAdmin.from('checkout_events').select('id', { count: 'exact', head: true }).eq('event_type', 'checkout_visit')),
        withRange(supabaseAdmin.from('checkout_events').select('id', { count: 'exact', head: true }).eq('event_type', 'buy_click')),
        withRange(supabaseAdmin.from('checkout_events').select('id', { count: 'exact', head: true }).in('event_type', ['cpf_filled', 'address_complete'])),
        withRange(supabaseAdmin.from('checkout_events').select('id', { count: 'exact', head: true }).eq('event_type', 'order_placed')),
      ]),
      supabaseAdmin.from('gateway_config').select('*').eq('id', 'active').single(),
      supabaseAdmin.from('tiktok_pixels').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('pinterest_tags').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('google_pixels').select('*').order('created_at', { ascending: false }),
      // Precise count queries for metrics (not limited by 500 row cap)
      Promise.all([
        // Total orders count
        (async () => {
          let q = supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', sinceStr);
          if (untilStr) q = q.lte('created_at', untilStr);
          return q;
        })(),
        // Pending orders count
        (async () => {
          let q = supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', sinceStr).eq('status', 'pending');
          if (untilStr) q = q.lte('created_at', untilStr);
          return q;
        })(),
        // Paid orders count + revenue (need actual data for revenue sum)
        (async () => {
          let q = supabaseAdmin.from('orders').select('id,amount,status,paid_at,created_at,color,product_type,customer_name,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,utm_source,utm_campaign,utm_medium,ttclid,quantity')
            .gte('created_at', sinceStr)
            .in('status', ['paid', 'approved'])
            .limit(2000);
          if (untilStr) q = q.lte('created_at', untilStr);
          return q;
        })(),
      ]),
    ]);

    const allOrders = allOrdersRes.data || [];
    const [siteVisitsRes, checkoutVisitsRes, buyClicksRes, cpfFilledRes, orderPlacedRes] = eventsCountRes;
    const [totalOrdersCountRes, pendingOrdersCountRes, paidOrdersDataRes] = orderCountsRes;

    // Precise metrics from count queries (unaffected by display limit or status filter)
    const totalOrders = totalOrdersCountRes.count || 0;
    const pendingOrders = pendingOrdersCountRes.count || 0;
    const paidOrdersList = paidOrdersDataRes.data || [];
    const paidOrders = paidOrdersList.length;
    const totalRevenue = paidOrdersList.reduce((acc: number, o: any) => acc + (o.amount || 0), 0);
    const totalFees = paidOrdersList.reduce((acc: number, o: any) => acc + Math.round((o.amount || 0) * 0.06) + 197, 0);
    const netRevenue = totalRevenue - totalFees;

    // Apply status filter ONLY for the display orders list
    let displayOrders = allOrders;
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'paid') {
        displayOrders = allOrders.filter((o: any) => o.status === 'paid' || o.status === 'approved');
      } else if (statusFilter === 'pending') {
        displayOrders = allOrders.filter((o: any) => o.status === 'pending');
      }
    }

    const gatewayConfig = gatewayRes.data;
    const pixels = pixelsRes.data || [];
    const pinterestTags = pinterestTagsRes.data || [];
    const googlePixels = googlePixelsRes.data || [];

    // Funnel from counts
    const siteVisits = siteVisitsRes.count || 0;
    const checkoutVisits = checkoutVisitsRes.count || 0;
    const buyClicks = buyClicksRes.count || 0;
    const cpfFilled = cpfFilledRes.count || 0;
    const orderPlaced = orderPlacedRes.count || 0;

    // Daily chart (use all orders, not filtered)
    const dailyMap: Record<string, { orders: number; paid: number; revenue: number }> = {};
    // Build date range keys using BRT dates
    const brtOffset = -3 * 60 * 60 * 1000;
    if (startDateParam) {
      const start = new Date(startDateParam + 'T12:00:00Z');
      const end = endDateParam ? new Date(endDateParam + 'T12:00:00Z') : start;
      const d = new Date(start);
      while (d <= end) {
        dailyMap[d.toISOString().split('T')[0]] = { orders: 0, paid: 0, revenue: 0 };
        d.setDate(d.getDate() + 1);
      }
    } else {
      for (let i = 0; i < Math.max(days, 1); i++) {
        const nowUTC = new Date();
        const brtNow = new Date(nowUTC.getTime() + brtOffset);
        brtNow.setDate(brtNow.getDate() - i);
        const key = brtNow.toISOString().split('T')[0];
        dailyMap[key] = { orders: 0, paid: 0, revenue: 0 };
      }
    }
    allOrders.forEach((o: any) => {
      // Convert created_at to BRT date
      const brtDate = new Date(new Date(o.created_at).getTime() + brtOffset);
      const key = brtDate.toISOString().split('T')[0];
      if (dailyMap[key]) {
        dailyMap[key].orders++;
        if (o.status === 'paid' || o.status === 'approved') {
          dailyMap[key].paid++;
          dailyMap[key].revenue += o.amount || 0;
        }
      }
    });
    const chartData = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({ date: date.slice(5), orders: d.orders, paid: d.paid, revenue: d.revenue }));

    const maskKey = (key: string | null) => {
      if (!key) return null;
      if (key.length <= 8) return '****';
      return key.slice(0, 4) + '****' + key.slice(-4);
    };

    // paidSales from precise paid query (not affected by status filter)
    const paidSales = paidOrdersList.map((o: any) => ({
      id: o.id, customer_name: o.customer_name, amount: o.amount, color: o.color,
      product_type: o.product_type || 'mesa',
      paid_at: o.paid_at || o.created_at,
      campaign_id: o.campaign_id, campaign_name: o.campaign_name,
      adset_id: o.adset_id, adset_name: o.adset_name,
      ad_id: o.ad_id, ad_name: o.ad_name,
      utm_source: o.utm_source, utm_campaign: o.utm_campaign, utm_medium: o.utm_medium, ttclid: o.ttclid,
    }));

    return new Response(JSON.stringify({
      orders: displayOrders.slice(0, 100),
      funnel: { siteVisits, checkoutVisits, buyClicks, cpfFilled, orderPlaced },
      metrics: { totalOrders, pendingOrders, paidOrders, totalRevenue, totalFees, netRevenue },
      chartData, pixels, pinterestTags, googlePixels, paidSales,
      gateway: {
        active: gatewayConfig?.active_gateway || 'blackcat',
        blackcat_key_masked: maskKey(gatewayConfig?.blackcat_api_key),
        paradise_key_masked: maskKey(gatewayConfig?.paradise_api_key),
        duttyfy_url_masked: maskKey(gatewayConfig?.duttyfy_api_url),
        buckpay_key_masked: maskKey(gatewayConfig?.buckpay_api_key),
        buckpay_ua_masked: maskKey(gatewayConfig?.buckpay_user_agent),
        ironpay_key_masked: maskKey(gatewayConfig?.ironpay_api_key),
        has_blackcat_key: !!gatewayConfig?.blackcat_api_key,
        has_paradise_key: !!gatewayConfig?.paradise_api_key,
        has_duttyfy_url: !!gatewayConfig?.duttyfy_api_url,
        has_buckpay_key: !!gatewayConfig?.buckpay_api_key,
        has_buckpay_ua: !!gatewayConfig?.buckpay_user_agent,
        has_ironpay_key: !!gatewayConfig?.ironpay_api_key,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
