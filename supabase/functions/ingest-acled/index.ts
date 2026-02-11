import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ACLED event types mapped to BTIP categories
const ACLED_CATEGORY_MAP: Record<string, string> = {
  "Battles": "armed-conflict",
  "Violence against civilians": "crime",
  "Explosions/Remote violence": "terrorism",
  "Riots": "civil-unrest",
  "Protests": "civil-unrest",
  "Strategic developments": "political-instability",
};

// Severity mapping based on ACLED fatalities
function deriveSeverity(fatalities: number): number {
  if (fatalities >= 50) return 5;
  if (fatalities >= 20) return 4;
  if (fatalities >= 5) return 3;
  if (fatalities >= 1) return 2;
  return 1;
}

// Map ACLED region names to BTIP region codes
function mapRegion(acledRegion: string): string {
  const r = acledRegion.toLowerCase();
  if (r.includes("western africa")) return "west-africa";
  if (r.includes("eastern africa")) return "east-africa";
  if (r.includes("northern africa") || r.includes("north africa")) return "north-africa";
  if (r.includes("southern africa")) return "southern-africa";
  if (r.includes("middle africa") || r.includes("central africa")) return "central-africa";
  if (r.includes("middle east")) return "middle-east";
  if (r.includes("south asia")) return "south-asia";
  if (r.includes("southeast asia")) return "southeast-asia";
  if (r.includes("europe")) return "eastern-europe";
  return "sub-saharan-africa";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

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

    const ACLED_API_KEY = Deno.env.get("ACLED_API_KEY");
    const ACLED_EMAIL = Deno.env.get("ACLED_EMAIL");
    if (!ACLED_API_KEY || !ACLED_EMAIL) {
      return new Response(JSON.stringify({ error: "ACLED credentials not configured. Add ACLED_API_KEY and ACLED_EMAIL secrets." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse optional body
    let body: { region?: string; days?: number } = {};
    try { body = await req.json(); } catch { /* defaults */ }

    const days = body.days || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const sinceStr = since.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(`ACLED ingestion: fetching events since ${sinceStr}`);

    // Fetch from ACLED API – focus on Africa
    const acledUrl = new URL("https://api.acleddata.com/acled/read");
    acledUrl.searchParams.set("key", ACLED_API_KEY);
    acledUrl.searchParams.set("email", ACLED_EMAIL);
    acledUrl.searchParams.set("event_date", `${sinceStr}|${new Date().toISOString().split("T")[0]}`);
    acledUrl.searchParams.set("event_date_where", "BETWEEN");
    acledUrl.searchParams.set("limit", "200");
    // Africa regions in ACLED
    acledUrl.searchParams.set("region", "1|2|3|4|5"); // Western, Middle, Eastern, Southern, Northern Africa

    const acledRes = await fetch(acledUrl.toString());
    if (!acledRes.ok) {
      const errText = await acledRes.text();
      console.error(`ACLED API error [${acledRes.status}]:`, errText.slice(0, 500));
      return new Response(JSON.stringify({ error: `ACLED API returned ${acledRes.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const acledData = await acledRes.json();
    const events = acledData?.data || [];

    console.log(`ACLED returned ${events.length} events`);

    if (events.length === 0) {
      return new Response(
        JSON.stringify({ success: true, fetched: 0, inserted: 0, duplicatesSkipped: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicate against existing
    const { data: existingIncidents } = await supabase
      .from("incidents")
      .select("title")
      .gte("datetime", since.toISOString())
      .limit(500);

    const existingTitles = new Set((existingIncidents || []).map((i: any) => i.title.toLowerCase()));

    // Transform ACLED events to incidents
    const newRows: any[] = [];
    for (const evt of events) {
      const title = (evt.event_type && evt.country
        ? `${evt.event_type}: ${(evt.notes || evt.sub_event_type || "").slice(0, 80)} – ${evt.country}`
        : evt.notes?.slice(0, 150) || "ACLED Event"
      ).slice(0, 200);

      if (existingTitles.has(title.toLowerCase())) continue;
      existingTitles.add(title.toLowerCase());

      const fatalities = parseInt(evt.fatalities) || 0;

      newRows.push({
        title,
        location: evt.location || evt.admin1 || "Unknown",
        region: mapRegion(evt.region || ""),
        country: evt.country || null,
        subdivision: evt.admin1 || null,
        category: ACLED_CATEGORY_MAP[evt.event_type] || "armed-conflict",
        severity: deriveSeverity(fatalities),
        confidence: 85, // ACLED is a curated, verified dataset
        summary: (evt.notes || "").slice(0, 500) || null,
        datetime: evt.event_date ? new Date(evt.event_date).toISOString() : new Date().toISOString(),
        sources: evt.source ? [evt.source] : [],
        lat: evt.latitude ? parseFloat(evt.latitude) : null,
        lng: evt.longitude ? parseFloat(evt.longitude) : null,
        status: "ai" as const,
        section: "top_threats",
        analyst: "acled",
      });
    }

    console.log(`${newRows.length} new ACLED incidents after deduplication`);

    if (newRows.length > 0) {
      // Insert in batches of 50
      for (let i = 0; i < newRows.length; i += 50) {
        const batch = newRows.slice(i, i + 50);
        const { error: insertError } = await supabase.from("incidents").insert(batch);
        if (insertError) {
          console.error("Insert error:", insertError);
          return new Response(JSON.stringify({ error: insertError.message, inserted: i }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    console.log(`ACLED ingestion complete: ${newRows.length} incidents inserted`);

    return new Response(
      JSON.stringify({
        success: true,
        fetched: events.length,
        inserted: newRows.length,
        duplicatesSkipped: events.length - newRows.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ACLED ingestion error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
