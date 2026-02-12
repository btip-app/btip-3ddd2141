import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Cyber Threat Intelligence Ingestion
 * Sources:
 *   1. AbuseIPDB — top reported IPs (blacklist)
 *   2. AlienVault OTX — public threat pulses (free, no key)
 * Creates incidents with category "cyber" in the incidents table.
 */

interface CyberIncident {
  title: string;
  location: string;
  region: string;
  country: string | null;
  category: string;
  severity: number;
  confidence: number;
  summary: string;
  datetime: string;
  sources: string[];
  lat: number | null;
  lng: number | null;
  status: "ai";
  section: string;
  analyst: string;
}

// Map country codes to regions
function countryToRegion(countryCode: string | null): string {
  if (!countryCode) return "global";
  const map: Record<string, string> = {
    NG: "west-africa", GH: "west-africa", SN: "west-africa", CI: "west-africa",
    KE: "east-africa", TZ: "east-africa", UG: "east-africa", ET: "east-africa",
    ZA: "southern-africa", EG: "north-africa", MA: "north-africa",
    US: "north-america", CA: "north-america", MX: "central-america",
    BR: "south-america", AR: "south-america", CO: "south-america",
    GB: "western-europe", DE: "western-europe", FR: "western-europe",
    RU: "eastern-europe", UA: "eastern-europe", PL: "eastern-europe",
    CN: "east-asia", JP: "east-asia", KR: "east-asia",
    IN: "south-asia", PK: "south-asia", BD: "south-asia",
    SA: "middle-east", AE: "middle-east", IR: "middle-east", IQ: "middle-east",
    AU: "oceania", ID: "southeast-asia", PH: "southeast-asia", TH: "southeast-asia",
  };
  return map[countryCode.toUpperCase()] || "global";
}

// Severity based on abuse confidence score
function abuseScoreToSeverity(score: number): number {
  if (score >= 90) return 5;
  if (score >= 70) return 4;
  if (score >= 50) return 3;
  if (score >= 30) return 2;
  return 1;
}

async function fetchAbuseIPDB(): Promise<CyberIncident[]> {
  const apiKey = Deno.env.get("ABUSEIPDB_API_KEY");
  if (!apiKey) {
    console.warn("ABUSEIPDB_API_KEY not set, skipping AbuseIPDB source");
    return [];
  }

  try {
    // Fetch top reported IPs in the last 24 hours
    const res = await fetch(
      "https://api.abuseipdb.com/api/v2/blacklist?confidenceMinimum=80&limit=20",
      {
        headers: {
          Key: apiKey,
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      console.error(`AbuseIPDB blacklist failed [${res.status}]`);
      return [];
    }

    const data = await res.json();
    const entries = data?.data || [];

    // For each high-confidence IP, get details
    const incidents: CyberIncident[] = [];
    const topEntries = entries.slice(0, 10); // Limit detail lookups

    for (const entry of topEntries) {
      try {
        const detailRes = await fetch(
          `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(entry.ipAddress)}&maxAgeInDays=7&verbose`,
          {
            headers: {
              Key: apiKey,
              Accept: "application/json",
            },
          }
        );

        if (!detailRes.ok) continue;

        const detail = await detailRes.json();
        const d = detail?.data;
        if (!d) continue;

        const severity = abuseScoreToSeverity(d.abuseConfidenceScore || 0);
        const region = countryToRegion(d.countryCode);

        // Determine threat type from recent reports
        const recentReports = d.reports || [];
        const categories = new Set<number>();
        for (const r of recentReports.slice(0, 20)) {
          for (const c of r.categories || []) categories.add(c);
        }

        // AbuseIPDB category mapping
        const categoryLabels: Record<number, string> = {
          1: "DNS Compromise", 2: "DNS Poisoning", 3: "Fraud Orders",
          4: "DDoS Attack", 5: "FTP Brute-Force", 6: "Ping of Death",
          7: "Phishing", 8: "Fraud VoIP", 9: "Open Proxy",
          10: "Web Spam", 11: "Email Spam", 14: "Port Scan",
          15: "Hacking", 16: "SQL Injection", 17: "Email Spoofing",
          18: "Brute-Force", 19: "Bad Web Bot", 20: "Exploited Host",
          21: "Web App Attack", 22: "SSH", 23: "IoT Targeted",
        };

        const threatTypes = [...categories]
          .map(c => categoryLabels[c] || `Cat-${c}`)
          .slice(0, 3)
          .join(", ");

        incidents.push({
          title: `Cyber Threat: ${d.ipAddress} — ${threatTypes || "Malicious Activity"}`,
          location: `${d.isp || "Unknown ISP"}, ${d.countryName || "Unknown"}`,
          region,
          country: d.countryName || null,
          category: "cyber",
          severity,
          confidence: Math.min(100, d.abuseConfidenceScore || 60),
          summary: `IP ${d.ipAddress} (${d.isp || "unknown ISP"}) reported ${d.totalReports || 0} times by ${d.numDistinctUsers || 0} users. Threat types: ${threatTypes || "unclassified"}. Domain: ${d.domain || "N/A"}. Usage type: ${d.usageType || "unknown"}.`,
          datetime: d.lastReportedAt || new Date().toISOString(),
          sources: ["AbuseIPDB"],
          lat: null,
          lng: null,
          status: "ai",
          section: "top_threats",
          analyst: "cyber-ingest-abuseipdb",
        });
      } catch (e) {
        console.warn(`Error fetching AbuseIPDB detail for ${entry.ipAddress}:`, e);
      }
    }

    return incidents;
  } catch (e) {
    console.error("AbuseIPDB fetch error:", e);
    return [];
  }
}

async function fetchAlienVaultOTX(): Promise<CyberIncident[]> {
  try {
    // OTX public API — recent pulses (no key required)
    const res = await fetch(
      "https://otx.alienvault.com/api/v1/pulses/activity?limit=15&page=1",
      {
        headers: { Accept: "application/json" },
      }
    );

    if (!res.ok) {
      console.error(`AlienVault OTX failed [${res.status}]`);
      return [];
    }

    const data = await res.json();
    const pulses = data?.results || [];

    const incidents: CyberIncident[] = [];

    for (const pulse of pulses) {
      if (!pulse.name) continue;

      // Estimate severity from tags and indicator count
      const indicatorCount = pulse.indicator_count || 0;
      let severity = 3;
      if (indicatorCount > 100) severity = 5;
      else if (indicatorCount > 50) severity = 4;
      else if (indicatorCount > 10) severity = 3;
      else severity = 2;

      const tags = (pulse.tags || []).slice(0, 5).join(", ");
      const targetedCountries = (pulse.targeted_countries || []).slice(0, 3);
      const region = targetedCountries.length > 0
        ? countryToRegion(targetedCountries[0])
        : "global";

      incidents.push({
        title: `CTI: ${pulse.name.slice(0, 120)}`,
        location: targetedCountries.length > 0
          ? `Targeted: ${targetedCountries.join(", ")}`
          : "Global",
        region,
        country: targetedCountries.length > 0 ? targetedCountries[0] : null,
        category: "cyber",
        severity,
        confidence: 70,
        summary: `${pulse.description?.slice(0, 300) || "No description available."} Tags: ${tags || "none"}. Indicators: ${indicatorCount}. TLP: ${pulse.tlp || "unknown"}.`,
        datetime: pulse.created || new Date().toISOString(),
        sources: ["AlienVault OTX"],
        lat: null,
        lng: null,
        status: "ai",
        section: "top_threats",
        analyst: "cyber-ingest-otx",
      });
    }

    return incidents;
  } catch (e) {
    console.error("AlienVault OTX fetch error:", e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log("Cyber threat ingestion started");

    // Fetch from both sources in parallel
    const [abuseIncidents, otxIncidents] = await Promise.all([
      fetchAbuseIPDB(),
      fetchAlienVaultOTX(),
    ]);

    const allIncidents = [...abuseIncidents, ...otxIncidents];
    console.log(`Fetched ${abuseIncidents.length} from AbuseIPDB, ${otxIncidents.length} from OTX`);

    if (allIncidents.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No new cyber threats found", inserted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicate against existing cyber incidents from last 7 days
    const { data: existing } = await supabase
      .from("incidents")
      .select("title")
      .eq("category", "cyber")
      .gte("datetime", new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(500);

    const existingTitles = new Set((existing || []).map((i: any) => i.title.toLowerCase()));
    const newIncidents = allIncidents.filter(
      inc => !existingTitles.has(inc.title.toLowerCase())
    );

    console.log(`${newIncidents.length} new cyber incidents after deduplication`);

    if (newIncidents.length > 0) {
      const { error: insertError } = await supabase.from("incidents").insert(newIncidents);
      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: insertError.message, inserted: 0 }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sources: {
          abuseipdb: abuseIncidents.length,
          alienvault_otx: otxIncidents.length,
        },
        total: allIncidents.length,
        inserted: newIncidents.length,
        duplicatesSkipped: allIncidents.length - newIncidents.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Cyber ingestion error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
