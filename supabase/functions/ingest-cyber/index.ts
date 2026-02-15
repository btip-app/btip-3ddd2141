import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function contentHash(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

interface CyberIncident {
  title: string; location: string; region: string; country: string | null;
  category: string; severity: number; confidence: number; summary: string;
  datetime: string; sources: string[]; lat: number | null; lng: number | null;
  status: "ai"; section: string; analyst: string;
}

const AFRICAN_COUNTRY_CODES = new Set([
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CG", "CD", "DJ", "EG",
  "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "CI", "KE", "LS", "LR", "LY", "MG",
  "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL", "SO",
  "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "ZM", "ZW",
]);

function countryToRegion(cc: string | null): string {
  if (!cc) return "global";
  const map: Record<string, string> = {
    NG: "west-africa", GH: "west-africa", SN: "west-africa", CI: "west-africa",
    ML: "west-africa", BF: "west-africa", NE: "west-africa", BJ: "west-africa",
    TG: "west-africa", GN: "west-africa", SL: "west-africa", LR: "west-africa",
    GM: "west-africa", GW: "west-africa", CV: "west-africa", MR: "west-africa",
    KE: "east-africa", TZ: "east-africa", UG: "east-africa", ET: "east-africa",
    RW: "east-africa", BI: "east-africa", SO: "east-africa", DJ: "east-africa",
    ER: "east-africa", SS: "east-africa", SD: "east-africa",
    ZA: "southern-africa", BW: "southern-africa", NA: "southern-africa",
    ZM: "southern-africa", ZW: "southern-africa", MZ: "southern-africa",
    MW: "southern-africa", LS: "southern-africa", SZ: "southern-africa",
    MG: "southern-africa", MU: "southern-africa", SC: "southern-africa",
    EG: "north-africa", MA: "north-africa", TN: "north-africa",
    LY: "north-africa", DZ: "north-africa",
    CM: "central-africa", CF: "central-africa", TD: "central-africa",
    CG: "central-africa", CD: "central-africa", GA: "central-africa",
    GQ: "central-africa", AO: "central-africa", ST: "central-africa",
  };
  return map[cc.toUpperCase()] || "global";
}

function isAfricanRegion(region: string): boolean {
  const AFRICAN_REGIONS = ["west-africa", "east-africa", "southern-africa", "north-africa", "central-africa", "sub-saharan-africa", "horn-of-africa", "sahel"];
  return AFRICAN_REGIONS.includes(region);
}

function abuseScoreToSeverity(s: number): number {
  if (s >= 90) return 5; if (s >= 70) return 4; if (s >= 50) return 3; if (s >= 30) return 2; return 1;
}

async function fetchAbuseIPDB(): Promise<{ incident: CyberIncident; rawPayload: any }[]> {
  const apiKey = Deno.env.get("ABUSEIPDB_API_KEY");
  if (!apiKey) return [];
  try {
    const res = await fetch("https://api.abuseipdb.com/api/v2/blacklist?confidenceMinimum=80&limit=20", { headers: { Key: apiKey, Accept: "application/json" } });
    if (!res.ok) return [];
    const entries = (await res.json())?.data || [];
    const results: { incident: CyberIncident; rawPayload: any }[] = [];

    for (const entry of entries.slice(0, 10)) {
      try {
        const dRes = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(entry.ipAddress)}&maxAgeInDays=7&verbose`, { headers: { Key: apiKey, Accept: "application/json" } });
        if (!dRes.ok) continue;
        const d = (await dRes.json())?.data;
        if (!d) continue;

        const cats = new Set<number>();
        for (const r of (d.reports || []).slice(0, 20)) for (const c of r.categories || []) cats.add(c);
        const catLabels: Record<number, string> = { 4: "DDoS", 7: "Phishing", 14: "Port Scan", 15: "Hacking", 16: "SQL Injection", 18: "Brute-Force", 21: "Web App Attack", 22: "SSH", 23: "IoT" };
        const types = [...cats].map(c => catLabels[c] || `Cat-${c}`).slice(0, 3).join(", ");

        results.push({
          rawPayload: d,
          incident: {
            title: `Cyber Threat: ${d.ipAddress} — ${types || "Malicious Activity"}`,
            location: `${d.isp || "Unknown ISP"}, ${d.countryName || "Unknown"}`,
            region: countryToRegion(d.countryCode), country: d.countryName || null,
            category: "cyber", severity: abuseScoreToSeverity(d.abuseConfidenceScore || 0),
            confidence: Math.min(100, d.abuseConfidenceScore || 60),
            summary: `IP ${d.ipAddress} (${d.isp || "unknown"}) reported ${d.totalReports || 0} times. Types: ${types || "unclassified"}. Domain: ${d.domain || "N/A"}.`,
            datetime: d.lastReportedAt || new Date().toISOString(),
            sources: ["AbuseIPDB"], lat: null, lng: null, status: "ai", section: "top_threats", analyst: "cyber-ingest-abuseipdb",
          },
        });
      } catch {}
    }
    return results;
  } catch { return []; }
}

async function fetchAlienVaultOTX(): Promise<{ incident: CyberIncident; rawPayload: any }[]> {
  try {
    const res = await fetch("https://otx.alienvault.com/api/v1/pulses/activity?limit=15&page=1", { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const pulses = (await res.json())?.results || [];
    return pulses.filter((p: any) => p.name).map((pulse: any) => {
      const ic = pulse.indicator_count || 0;
      let severity = ic > 100 ? 5 : ic > 50 ? 4 : ic > 10 ? 3 : 2;
      const tags = (pulse.tags || []).slice(0, 5).join(", ");
      const tc = (pulse.targeted_countries || []).slice(0, 3);
      return {
        rawPayload: pulse,
        incident: {
          title: `CTI: ${pulse.name.slice(0, 120)}`, location: tc.length ? `Targeted: ${tc.join(", ")}` : "Global",
          region: tc.length ? countryToRegion(tc[0]) : "global", country: tc.length ? tc[0] : null,
          category: "cyber", severity, confidence: 70,
          summary: `${pulse.description?.slice(0, 300) || "No description."} Tags: ${tags || "none"}. Indicators: ${ic}.`,
          datetime: pulse.created || new Date().toISOString(),
          sources: ["AlienVault OTX"], lat: null, lng: null, status: "ai" as const, section: "top_threats", analyst: "cyber-ingest-otx",
        },
      };
    });
  } catch { return []; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth guard: require admin or analyst role
  const { requireAdminOrAnalyst } = await import("../_shared/auth.ts");
  const authResult = await requireAdminOrAnalyst(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    console.log("Cyber threat ingestion started");

    const [abuseResults, otxResults] = await Promise.all([fetchAbuseIPDB(), fetchAlienVaultOTX()]);
    // Filter to Africa-only threats
    const africaAbuse = abuseResults.filter(r => isAfricanRegion(r.incident.region));
    const africaOtx = otxResults.filter(r => isAfricanRegion(r.incident.region));
    const allResults = [...africaAbuse, ...africaOtx];
    console.log(`Fetched ${abuseResults.length} AbuseIPDB (${africaAbuse.length} African), ${otxResults.length} OTX (${africaOtx.length} African)`);

    if (allResults.length === 0) return new Response(JSON.stringify({ success: true, inserted: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Dedup
    const { data: existing } = await supabase.from("incidents").select("title").eq("category", "cyber").gte("datetime", new Date(Date.now() - 7 * 86400000).toISOString()).limit(500);
    const existingTitles = new Set((existing || []).map((i: any) => i.title.toLowerCase()));

    let staged = 0, inserted = 0;
    for (const { incident, rawPayload } of allResults) {
      const hash = await contentHash(`cyber-${incident.title}-${incident.datetime}`);
      const { data: existingRaw } = await supabase.from("raw_events").select("id").eq("content_hash", hash).limit(1);
      if (existingRaw && existingRaw.length > 0) continue;

      const isDup = existingTitles.has(incident.title.toLowerCase());

      const { error: rawErr } = await supabase.from("raw_events").insert({
        source_type: "cyber", source_label: incident.analyst, source_url: null,
        raw_payload: rawPayload, content_hash: hash, status: isDup ? "duplicate" : "raw",
      });
      if (rawErr) { console.error("Raw err:", rawErr); continue; }
      staged++;

      if (!isDup) {
        const { data: ins, error: incErr } = await supabase.from("incidents").insert(incident).select("id");
        if (incErr) { console.error("Inc err:", incErr); }
        else {
          inserted++;
          existingTitles.add(incident.title.toLowerCase());
          if (ins?.[0]?.id) await supabase.from("raw_events").update({ status: "normalized", incident_id: ins[0].id, normalized_at: new Date().toISOString() }).eq("content_hash", hash);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true, sources: { abuseipdb: abuseResults.length, alienvault_otx: otxResults.length },
      total: allResults.length, staged, inserted, duplicatesSkipped: allResults.length - inserted,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Cyber error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
