import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function contentHash(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function stageAndNormalize(supabase: any, sourceType: string, extractedIncidents: any[], rawPayloads: any[]) {
  if (!extractedIncidents.length) return { staged: 0, inserted: 0, duplicatesSkipped: 0 };

  const rawRows = await Promise.all(extractedIncidents.map(async (inc: any, i: number) => {
    const key = `${inc.title || ""}|${inc.datetime || ""}|${inc.location || ""}`;
    return {
      source_type: sourceType,
      source_label: inc.sources?.[0] || sourceType,
      source_url: inc.sources?.[0] || null,
      raw_payload: rawPayloads[i] || inc,
      content_hash: await contentHash(key),
      status: "raw",
    };
  }));

  const hashes = rawRows.map(r => r.content_hash);
  const { data: existingHashes } = await supabase.from("raw_events").select("content_hash").in("content_hash", hashes);
  const existingHashSet = new Set((existingHashes || []).map((h: any) => h.content_hash));

  const { data: existingInc } = await supabase.from("incidents").select("title")
    .gte("datetime", new Date(Date.now() - 7 * 86400000).toISOString()).limit(300);
  const existingTitles = new Set((existingInc || []).map((i: any) => i.title.toLowerCase()));

  const newRawRows: any[] = [];
  const newIncidentRows: any[] = [];

  for (let i = 0; i < extractedIncidents.length; i++) {
    const inc = extractedIncidents[i];
    if (existingHashSet.has(rawRows[i].content_hash)) continue;
    if (existingTitles.has(inc.title?.toLowerCase())) {
      newRawRows.push({ ...rawRows[i], status: "duplicate" });
      continue;
    }
    newRawRows.push(rawRows[i]);
    newIncidentRows.push({
      title: (inc.title || "Unknown Incident").slice(0, 200),
      location: inc.location || "Unknown", region: inc.region || "unknown",
      country: inc.country || null, subdivision: inc.subdivision || null,
      category: inc.category || "armed-conflict",
      severity: Math.min(5, Math.max(1, Number(inc.severity) || 3)),
      confidence: Math.min(100, Math.max(0, Number(inc.confidence) || 70)),
      summary: inc.summary || null, datetime: inc.datetime || new Date().toISOString(),
      sources: Array.isArray(inc.sources) ? inc.sources : [],
      lat: typeof inc.lat === "number" ? inc.lat : null,
      lng: typeof inc.lng === "number" ? inc.lng : null,
      status: "ai" as const, section: "top_threats", analyst: "gdelt",
    });
  }

  if (newRawRows.length > 0) {
    const { error } = await supabase.from("raw_events").insert(newRawRows);
    if (error) console.error("Raw insert error:", error);
  }

  let insertedCount = 0;
  if (newIncidentRows.length > 0) {
    const { data: inserted, error } = await supabase.from("incidents").insert(newIncidentRows).select("id");
    if (error) { console.error("Incidents insert error:", error); }
    else {
      insertedCount = inserted?.length || 0;
      const normalizedRaws = newRawRows.filter(r => r.status === "raw");
      for (let j = 0; j < Math.min(normalizedRaws.length, (inserted || []).length); j++) {
        await supabase.from("raw_events").update({ status: "normalized", incident_id: inserted[j].id, normalized_at: new Date().toISOString() })
          .eq("content_hash", normalizedRaws[j].content_hash).eq("status", "raw");
      }
    }
  }
  return { staged: newRawRows.length, inserted: insertedCount, duplicatesSkipped: extractedIncidents.length - newIncidentRows.length };
}

async function fetchGdeltEvents(): Promise<any[]> {
  const queries = [
    "(attack OR conflict OR protest OR violence) (Africa OR Nigeria OR Kenya OR Ethiopia OR Somalia)",
    "(terrorism OR bombing OR kidnapping OR coup) (Africa OR Congo OR Mali OR Sudan OR Libya)",
    "(military OR rebellion OR riot) (Mozambique OR Cameroon OR Burkina Faso OR Niger OR Chad)",
  ];
  const allArticles: any[] = [];
  for (const query of queries) {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=30&timespan=72h&format=json&sort=DateDesc`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const text = await res.text();
      if (text.startsWith("<")) continue;
      const data = JSON.parse(text);
      allArticles.push(...(data?.articles || []));
    } catch (e) { console.warn("GDELT fetch error:", e); }
  }
  const seen = new Set<string>();
  return allArticles.filter((a: any) => { if (!a.url || seen.has(a.url)) return false; seen.add(a.url); return true; });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { requireAdminOrAnalyst } = await import("../_shared/auth.ts");
  const authResult = await requireAdminOrAnalyst(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Lovable API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("GDELT ingestion started");
    const articles = await fetchGdeltEvents();
    if (articles.length === 0) return new Response(JSON.stringify({ success: true, fetched: 0, inserted: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    console.log(`Fetched ${articles.length} GDELT articles`);

    const articlesText = articles.slice(0, 20).map((a: any, i: number) =>
      `[${i + 1}] ${a.title || "No title"}\nSource: ${a.domain || "unknown"}\nDate: ${a.seendate || "unknown"}\nURL: ${a.url || ""}`
    ).join("\n\n---\n\n");

    const extractionPrompt = `Extract distinct security incidents (conflict, crime, terrorism, unrest) from these GDELT articles.
IMPORTANT: Only extract incidents that occurred in AFRICAN countries. Discard any incidents from non-African countries (e.g. Russia, Ukraine, USA, Europe, Asia, etc.).
Use one of these region values: west-africa, east-africa, north-africa, southern-africa, central-africa, sub-saharan-africa, horn-of-africa, sahel.

ARTICLES:
${articlesText}

Return a JSON array of objects with keys: title, location, region, country, category, severity (1-5), confidence (0-100), summary, datetime, sources (array of URLs), lat, lng.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract structured security incident data from news articles. Only include incidents from African countries. Return valid JSON array." },
          { role: "user", content: extractionPrompt },
        ],
        temperature: 0.1,
        max_tokens: 8192,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI extraction failed", details: errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "[]";

    let extractedIncidents: any[];
    try {
      const parsed = JSON.parse(rawContent);
      extractedIncidents = Array.isArray(parsed) ? parsed : (parsed.incidents || parsed.data || []);
    } catch (e) {
      return new Response(JSON.stringify({
        error: "JSON Parse Failed",
        raw: rawContent.slice(0, 1000)
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Post-filter: ensure only African regions made it through
    const AFRICAN_REGIONS = ["west-africa", "east-africa", "southern-africa", "north-africa", "central-africa", "sub-saharan-africa", "horn-of-africa", "sahel"];
    extractedIncidents = extractedIncidents.filter((inc: any) => AFRICAN_REGIONS.includes(inc.region));

    console.log(`AI extracted ${extractedIncidents.length} incidents from GDELT`);

    const result = await stageAndNormalize(supabase, "gdelt", extractedIncidents, articles.slice(0, extractedIncidents.length));

    return new Response(JSON.stringify({ success: true, fetched: articles.length, extracted: extractedIncidents.length, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("GDELT error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});