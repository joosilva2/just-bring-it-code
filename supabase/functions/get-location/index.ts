import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    // Get client IP from headers (Supabase provides this)
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    
    console.log(`Getting location for IP: ${clientIP}`);

    // Use free IP geolocation API
    let city = 'Desconhecido';
    let region = 'Desconhecido';
    let country = 'BR';

    try {
      // Use ip-api.com (free, no key needed, 45 requests/min limit)
      const geoResponse = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,city,regionName,country,countryCode`);
      const geoData = await geoResponse.json();
      
      console.log('Geo API response:', geoData);

      if (geoData.status === 'success') {
        city = geoData.city || 'Desconhecido';
        region = geoData.regionName || 'Desconhecido';
        country = geoData.countryCode || 'BR';
      }
    } catch (geoError) {
      console.error('Geo lookup failed:', geoError);
    }

    return new Response(
      JSON.stringify({
        ip: clientIP,
        city,
        region,
        country,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
