import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AbuseIPDBReport {
  ipAddress: string;
  isPublic: boolean;
  abuseConfidenceScore: number;
  countryCode: string | null;
  countryName: string | null;
  isp: string | null;
  domain: string | null;
  totalReports: number;
  lastReportedAt: string | null;
  usageType: string | null;
  isWhitelisted: boolean;
  isTor: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ABUSEIPDB_API_KEY = Deno.env.get("ABUSEIPDB_API_KEY");
    if (!ABUSEIPDB_API_KEY) {
      return new Response(JSON.stringify({ error: "AbuseIPDB API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { ip?: string; ips?: string[] } = {};
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { ip, ips } = body;

    // Validate IP format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipList = (ips || (ip ? [ip] : []))
      .filter(addr => typeof addr === "string" && ipRegex.test(addr.trim()))
      .map(addr => addr.trim())
      .slice(0, 10);

    if (ipList.length === 0) {
      return new Response(JSON.stringify({ error: "Provide valid IPv4 addresses in 'ip' or 'ips'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check up to 10 IPs per request
    const results: AbuseIPDBReport[] = [];
    for (const ipAddr of ipList.slice(0, 10)) {
      const url = `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ipAddr)}&maxAgeInDays=90&verbose`;
      const res = await fetch(url, {
        headers: {
          Key: ABUSEIPDB_API_KEY,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        console.error(`AbuseIPDB error for ${ipAddr}: ${res.status}`);
        continue;
      }

      const json = await res.json();
      const d = json.data;
      results.push({
        ipAddress: d.ipAddress,
        isPublic: d.isPublic,
        abuseConfidenceScore: d.abuseConfidenceScore,
        countryCode: d.countryCode,
        countryName: d.countryName || null,
        isp: d.isp,
        domain: d.domain,
        totalReports: d.totalReports,
        lastReportedAt: d.lastReportedAt,
        usageType: d.usageType,
        isWhitelisted: d.isWhitelisted || false,
        isTor: d.isTor || false,
      });
    }

    return new Response(
      JSON.stringify({ success: true, results, checked: results.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("AbuseIPDB check error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
