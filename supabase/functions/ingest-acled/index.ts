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

const ACLED_CATEGORY_MAP: Record<string, string> = {
  "Battles": "armed-conflict", "Violence against civilians": "crime",
  "Explosions/Remote violence": "terrorism", "Riots": "civil-unrest",
  "Protests": "civil-unrest", "Strategic developments": "political-instability",
};

function deriveSeverity(fatalities: number): number {
  if (fatalities >= 50) return 5; if (fatalities >= 20) return 4;
  if (fatalities >= 5) return 3; if (fatalities >= 1) return 2; return 1;
}

function mapRegion(r: string): string {
  const l = r.toLowerCase();
  if (l.includes("western africa")) return "west-africa";
  if (l.includes("eastern africa")) return "east-africa";
  if (l.includes("northern africa") || l.includes("north africa")) return "north-africa";
  if (l.includes("southern africa")) return "southern-africa";
  if (l.includes("middle africa") || l.includes("central africa")) return "central-africa";
  if (l.includes("middle east")) return "middle-east";
  if (l.includes("south asia")) return "south-asia";
  if (l.includes("southeast asia")) return "southeast-asia";
  if (l.includes("europe")) return "eastern-europe";
  return "sub-saharan-africa";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth guard: require admin or analyst role
  const { requireAdminOrAnalyst } = await import("../_shared/auth.ts");
  const authResult = await requireAdminOrAnalyst(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const ACLED_API_KEY = Deno.env.get("ACLED_API_KEY"), ACLED_EMAIL = Deno.env.get("ACLED_EMAIL");
    if (!ACLED_API_KEY || !ACLED_EMAIL) return new Response(JSON.stringify({ error: "ACLED credentials not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let body: { region?: string; days?: number } = {};
    try { body = await req.json(); } catch {}

    const days = body.days || 7;
    const since = new Date(Date.now() - days * 86400000);
    const sinceStr = since.toISOString().split("T")[0];

    const acledUrl = new URL("https://api.acleddata.com/acled/read");
    acledUrl.searchParams.set("key", ACLED_API_KEY);
    acledUrl.searchParams.set("email", ACLED_EMAIL);
    acledUrl.searchParams.set("event_date", `${sinceStr}|${new Date().toISOString().split("T")[0]}`);
    acledUrl.searchParams.set("event_date_where", "BETWEEN");
    acledUrl.searchParams.set("limit", "200");
    acledUrl.searchParams.set("region", "1|2|3|4|5");

    const acledRes = await fetch(acledUrl.toString());
    if (!acledRes.ok) return new Response(JSON.stringify({ error: `ACLED API returned ${acledRes.status}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const events = (await acledRes.json())?.data || [];
    console.log(`ACLED returned ${events.length} events`);
    if (events.length === 0) return new Response(JSON.stringify({ success: true, fetched: 0, inserted: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Dedup
    const { data: existingInc } = await supabase.from("incidents").select("title").gte("datetime", since.toISOString()).limit(500);
    const existingTitles = new Set((existingInc || []).map((i: any) => i.title.toLowerCase()));

    const newRawRows: any[] = [];
    const newIncRows: any[] = [];

    for (const evt of events) {
      const title = (evt.event_type && evt.country
        ? `${evt.event_type}: ${(evt.notes || evt.sub_event_type || "").slice(0, 80)} – ${evt.country}`
        : evt.notes?.slice(0, 150) || "ACLED Event"
      ).slice(0, 200);

      const hash = await contentHash(`acled-${evt.data_id || title}-${evt.event_date || ""}`);

      // Check raw dedup
      const { data: existingRaw } = await supabase.from("raw_events").select("id").eq("content_hash", hash).limit(1);
      if (existingRaw && existingRaw.length > 0) continue;

      const isDupTitle = existingTitles.has(title.toLowerCase());
      existingTitles.add(title.toLowerCase());

      newRawRows.push({
        source_type: "acled", source_label: evt.source || "ACLED",
        source_url: null, raw_payload: evt,
        content_hash: hash, status: isDupTitle ? "duplicate" : "raw",
      });

      if (!isDupTitle) {
        const fatalities = parseInt(evt.fatalities) || 0;
        newIncRows.push({
          title, location: evt.location || evt.admin1 || "Unknown",
          region: mapRegion(evt.region || ""), country: evt.country || null,
          subdivision: evt.admin1 || null, category: ACLED_CATEGORY_MAP[evt.event_type] || "armed-conflict",
          severity: deriveSeverity(fatalities), confidence: 85,
          summary: (evt.notes || "").slice(0, 500) || null,
          datetime: evt.event_date ? new Date(evt.event_date).toISOString() : new Date().toISOString(),
          sources: evt.source ? [evt.source] : [],
          lat: evt.latitude ? parseFloat(evt.latitude) : null, lng: evt.longitude ? parseFloat(evt.longitude) : null,
          status: "ai" as const, section: "top_threats", analyst: "acled",
        });
      }
    }

    // Insert raw events
    if (newRawRows.length > 0) {
      for (let i = 0; i < newRawRows.length; i += 50) {
        const { error } = await supabase.from("raw_events").insert(newRawRows.slice(i, i + 50));
        if (error) console.error("Raw insert error:", error);
      }
    }

    // Insert incidents and link
    let insertedCount = 0;
    if (newIncRows.length > 0) {
      for (let i = 0; i < newIncRows.length; i += 50) {
        const batch = newIncRows.slice(i, i + 50);
        const { data: inserted, error } = await supabase.from("incidents").insert(batch).select("id");
        if (error) { console.error("Inc insert error:", error); continue; }
        insertedCount += inserted?.length || 0;

        // Link raw → incident
        const rawBatch = newRawRows.filter(r => r.status === "raw").slice(i, i + 50);
        for (let j = 0; j < Math.min(rawBatch.length, (inserted || []).length); j++) {
          await supabase.from("raw_events").update({ status: "normalized", incident_id: inserted[j].id, normalized_at: new Date().toISOString() }).eq("content_hash", rawBatch[j].content_hash).eq("status", "raw");
        }
      }
    }

    console.log(`ACLED complete: ${insertedCount} inserted, ${newRawRows.length} staged`);
    return new Response(JSON.stringify({ success: true, fetched: events.length, staged: newRawRows.length, inserted: insertedCount, duplicatesSkipped: events.length - newIncRows.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ACLED error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
