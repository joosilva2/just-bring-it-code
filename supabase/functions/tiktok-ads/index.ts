import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIKTOK_API = "https://business-api.tiktok.com/open_api/v1.3";
const BC_ID = "7606924865106853895";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const TIKTOK_ACCESS_TOKEN = Deno.env.get("TIKTOK_ACCESS_TOKEN");
    if (!TIKTOK_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: "TIKTOK_ACCESS_TOKEN not configured" }), { status: 500, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list-advertisers";

    // List all advertisers under BC
    if (action === "list-advertisers") {
      const apiUrl = `${TIKTOK_API}/bc/asset/get/?bc_id=${BC_ID}&asset_type=ADVERTISER&page=1&page_size=100`;
      console.log("Calling TikTok API:", apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: { "Access-Token": TIKTOK_ACCESS_TOKEN },
      });
      
      const responseText = await response.text();
      console.log("TikTok API response status:", response.status);
      console.log("TikTok API response:", responseText.substring(0, 500));
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        return new Response(JSON.stringify({ error: "TikTok API returned non-JSON response", status: response.status, body: responseText.substring(0, 200) }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (data.code !== 0) {
        console.error("TikTok API error:", JSON.stringify(data));
        return new Response(JSON.stringify({ error: data.message || "TikTok API error", code: data.code }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const advertisers = (data.data?.list || []).map((adv: any) => ({
        advertiser_id: adv.advertiser_id,
        advertiser_name: adv.advertiser_name || `Conta ${adv.advertiser_id}`,
        status: adv.advertiser_status,
        currency: adv.currency,
      }));

      return new Response(JSON.stringify({ advertisers }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get ad spend metrics for selected advertisers
    if (action === "ad-metrics") {
      const advertiserIds = url.searchParams.get("advertiser_ids")?.split(",") || [];
      const startDate = url.searchParams.get("start_date") || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const endDate = url.searchParams.get("end_date") || new Date().toISOString().slice(0, 10);
      const groupBy = url.searchParams.get("group_by") || "campaign"; // campaign, adgroup, ad

      if (advertiserIds.length === 0) {
        return new Response(JSON.stringify({ error: "No advertiser IDs provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const allResults: any[] = [];
      const summaries: any[] = [];

      for (const advertiserId of advertiserIds) {
        // Get campaign/adgroup/ad level report
        let dataLevel = "AUCTION_CAMPAIGN";
        let dimensions = '["campaign_id"]';
        if (groupBy === "adgroup") {
          dataLevel = "AUCTION_ADGROUP";
          dimensions = '["adgroup_id"]';
        } else if (groupBy === "ad") {
          dataLevel = "AUCTION_AD";
          dimensions = '["ad_id"]';
        }

        const metrics = '["spend","impressions","clicks","conversions","cpc","cpm","ctr","cost_per_conversion","reach"]';

        const reportUrl = `${TIKTOK_API}/report/integrated/get/?advertiser_id=${advertiserId}&report_type=BASIC&data_level=${dataLevel}&dimensions=${encodeURIComponent(dimensions)}&metrics=${encodeURIComponent(metrics)}&start_date=${startDate}&end_date=${endDate}&page=1&page_size=200`;

        const reportRes = await fetch(reportUrl, {
          headers: { "Access-Token": TIKTOK_ACCESS_TOKEN },
        });
        const reportData = await reportRes.json();

        if (reportData.code === 0 && reportData.data?.list) {
          const rows = reportData.data.list.map((item: any) => ({
            advertiser_id: advertiserId,
            campaign_id: item.dimensions?.campaign_id || null,
            campaign_name: item.dimensions?.campaign_name || null,
            adgroup_id: item.dimensions?.adgroup_id || null,
            adgroup_name: item.dimensions?.adgroup_name || null,
            ad_id: item.dimensions?.ad_id || null,
            ad_name: item.dimensions?.ad_name || null,
            spend: parseFloat(item.metrics?.spend || "0"),
            impressions: parseInt(item.metrics?.impressions || "0"),
            clicks: parseInt(item.metrics?.clicks || "0"),
            conversions: parseInt(item.metrics?.conversions || "0"),
            cpc: parseFloat(item.metrics?.cpc || "0"),
            cpm: parseFloat(item.metrics?.cpm || "0"),
            ctr: parseFloat(item.metrics?.ctr || "0"),
            cost_per_conversion: parseFloat(item.metrics?.cost_per_conversion || "0"),
            reach: parseInt(item.metrics?.reach || "0"),
          }));
          allResults.push(...rows);
        }

        // Get account-level summary
        const summaryUrl = `${TIKTOK_API}/report/integrated/get/?advertiser_id=${advertiserId}&report_type=BASIC&data_level=AUCTION_ADVERTISER&dimensions=${encodeURIComponent('["advertiser_id"]')}&metrics=${encodeURIComponent(metrics)}&start_date=${startDate}&end_date=${endDate}&page=1&page_size=1`;

        const summaryRes = await fetch(summaryUrl, {
          headers: { "Access-Token": TIKTOK_ACCESS_TOKEN },
        });
        const summaryData = await summaryRes.json();

        if (summaryData.code === 0 && summaryData.data?.list?.[0]) {
          const s = summaryData.data.list[0];
          summaries.push({
            advertiser_id: advertiserId,
            spend: parseFloat(s.metrics?.spend || "0"),
            impressions: parseInt(s.metrics?.impressions || "0"),
            clicks: parseInt(s.metrics?.clicks || "0"),
            conversions: parseInt(s.metrics?.conversions || "0"),
            cpc: parseFloat(s.metrics?.cpc || "0"),
            cpm: parseFloat(s.metrics?.cpm || "0"),
            ctr: parseFloat(s.metrics?.ctr || "0"),
            cost_per_conversion: parseFloat(s.metrics?.cost_per_conversion || "0"),
            reach: parseInt(s.metrics?.reach || "0"),
          });
        }
      }

      const totalSpend = summaries.reduce((a, s) => a + s.spend, 0);
      const totalImpressions = summaries.reduce((a, s) => a + s.impressions, 0);
      const totalClicks = summaries.reduce((a, s) => a + s.clicks, 0);
      const totalConversions = summaries.reduce((a, s) => a + s.conversions, 0);
      const totalReach = summaries.reduce((a, s) => a + s.reach, 0);

      return new Response(JSON.stringify({
        rows: allResults,
        summaries,
        totals: {
          spend: totalSpend,
          impressions: totalImpressions,
          clicks: totalClicks,
          conversions: totalConversions,
          reach: totalReach,
          cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
          cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
          ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
          cost_per_conversion: totalConversions > 0 ? totalSpend / totalConversions : 0,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
