import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_SOURCES = [
  { url: "https://www.aljazeera.com/tag/security/", label: "Al Jazeera Security" },
  { url: "https://www.bbc.com/news/topics/cwlw3xz047jt", label: "BBC Conflicts" },
  { url: "https://reliefweb.int/updates?view=reports&search=security+incident", label: "ReliefWeb" },
];

/** Generate a simple hash for dedup */
async function contentHash(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Stage raw events, then normalize to incidents */
async function stageAndNormalize(
  supabase: any,
  sourceType: string,
  extractedIncidents: any[],
  rawPayloads: any[]
) {
  // Stage all raw events
  const rawRows = extractedIncidents.map((inc: any, i: number) => ({
    source_type: sourceType,
    source_label: inc.sources?.[0] || sourceType,
    source_url: inc.sources?.[0] || null,
    raw_payload: rawPayloads[i] || inc,
    content_hash: null, // will be set below
    status: "raw",
  }));

  // Compute hashes
  for (let i = 0; i < rawRows.length; i++) {
    const key = `${extractedIncidents[i].title || ""}|${extractedIncidents[i].datetime || ""}|${extractedIncidents[i].location || ""}`;
    rawRows[i].content_hash = await contentHash(key);
  }

  // Check for existing hashes (dedup at staging level)
  const hashes = rawRows.map(r => r.content_hash);
  const { data: existingHashes } = await supabase
    .from("raw_events")
    .select("content_hash")
    .in("content_hash", hashes);

  const existingHashSet = new Set((existingHashes || []).map((h: any) => h.content_hash));

  // Also check incidents table for title dedup
  const { data: existingIncidents } = await supabase
    .from("incidents")
    .select("title")
    .gte("datetime", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .limit(300);

  const existingTitles = new Set((existingIncidents || []).map((i: any) => i.title.toLowerCase()));

  const newRawRows: any[] = [];
  const newIncidentRows: any[] = [];

  for (let i = 0; i < extractedIncidents.length; i++) {
    const inc = extractedIncidents[i];
    const hash = rawRows[i].content_hash;

    if (existingHashSet.has(hash)) {
      continue; // duplicate at raw level
    }
    if (existingTitles.has(inc.title?.toLowerCase())) {
      // Stage as duplicate for provenance but don't normalize
      newRawRows.push({ ...rawRows[i], status: "duplicate" });
      continue;
    }

    newRawRows.push(rawRows[i]);
    newIncidentRows.push({
      title: (inc.title || "Unknown Incident").slice(0, 200),
      location: inc.location || "Unknown",
      region: inc.region || "unknown",
      country: inc.country || null,
      subdivision: inc.subdivision || null,
      category: inc.category || "crime",
      severity: Math.min(5, Math.max(1, Number(inc.severity) || 3)),
      confidence: Math.min(100, Math.max(0, Number(inc.confidence) || 60)),
      summary: inc.summary || null,
      datetime: inc.datetime || new Date().toISOString(),
      sources: Array.isArray(inc.sources) ? inc.sources : [],
      lat: typeof inc.lat === "number" ? inc.lat : null,
      lng: typeof inc.lng === "number" ? inc.lng : null,
      status: "ai" as const,
      section: "top_threats",
      analyst: `${sourceType}-ingest`,
    });
  }

  // Insert raw events
  if (newRawRows.length > 0) {
    const { error: rawErr } = await supabase.from("raw_events").insert(newRawRows);
    if (rawErr) console.error("Raw events insert error:", rawErr);
  }

  // Insert normalized incidents and link back
  let insertedCount = 0;
  if (newIncidentRows.length > 0) {
    const { data: inserted, error: incErr } = await supabase
      .from("incidents")
      .insert(newIncidentRows)
      .select("id");

    if (incErr) {
      console.error("Incidents insert error:", incErr);
    } else {
      insertedCount = inserted?.length || 0;

      // Update raw_events with incident_id and mark as normalized
      const normalizedRaws = newRawRows.filter(r => r.status === "raw");
      for (let i = 0; i < Math.min(normalizedRaws.length, (inserted || []).length); i++) {
        await supabase
          .from("raw_events")
          .update({
            status: "normalized",
            incident_id: inserted[i].id,
            normalized_at: new Date().toISOString(),
          })
          .eq("content_hash", normalizedRaws[i].content_hash)
          .eq("status", "raw");
      }
    }
  }

  return {
    staged: newRawRows.length,
    inserted: insertedCount,
    duplicatesSkipped: extractedIncidents.length - newIncidentRows.length,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth guard: require admin or analyst role
  const { requireAdminOrAnalyst } = await import("../_shared/auth.ts");
  const authResult = await requireAdminOrAnalyst(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { region?: string } = {};
    try { body = await req.json(); } catch { /* defaults */ }

    const { data: dbSources } = await supabase
      .from("osint_sources").select("url, label").eq("enabled", true);

    const sourcesToScrape = (dbSources && dbSources.length > 0) ? dbSources : DEFAULT_SOURCES;

    console.log(`Ingestion started, scraping ${sourcesToScrape.length} sources`);

    // Scrape sources
    const scrapedContent: string[] = [];
    for (const source of sourcesToScrape) {
      try {
        const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: source.url, formats: ["markdown"], onlyMainContent: true }),
        });
        if (scrapeRes.ok) {
          const data = await scrapeRes.json();
          const markdown = data?.data?.markdown || data?.markdown || "";
          if (markdown) scrapedContent.push(`[Source: ${source.label}]\n${markdown.slice(0, 5000)}`);
        }
      } catch (e) { console.warn(`Error scraping ${source.label}:`, e); }
    }

    if (scrapedContent.length === 0) {
      return new Response(JSON.stringify({ error: "No sources could be scraped", inserted: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AI extraction
    const extractionPrompt = `You are a security intelligence analyst. Extract real security incidents from the following scraped news content.

SCRAPED CONTENT:
${scrapedContent.join("\n\n---\n\n")}

Extract each distinct security incident and return a JSON array. Each incident must have:
{
  "title": "Brief descriptive title (max 100 chars)",
  "location": "Specific location (city, area)",
  "region": "Geographic region (e.g. middle-east, sub-saharan-africa, southeast-asia, south-asia, central-america, eastern-europe, west-africa, east-africa, north-africa)",
  "country": "Country name",
  "subdivision": "State/province if known, or null",
  "category": "One of: armed-conflict, terrorism, civil-unrest, crime, natural-disaster, political-instability, piracy, kidnapping, cyber-attack",
  "severity": "Integer 1-5",
  "confidence": "Integer 50-100",
  "summary": "2-3 sentence summary",
  "datetime": "ISO 8601 datetime string",
  "sources": ["URL or source name"],
  "lat": "Approximate latitude or null",
  "lng": "Approximate longitude or null"
}

${body.region ? `Focus on incidents in or near: ${body.region}` : "Include all regions."}

RULES:
- Only extract REAL security incidents
- Return ONLY a valid JSON array, no markdown fences
- Return at most 15 incidents`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: extractionPrompt }], temperature: 0.1, max_tokens: 4000 }),
    });

    if (!aiRes.ok) {
      console.error(`AI extraction failed [${aiRes.status}]`);
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "[]";
    const cleanedContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let extractedIncidents: any[];
    try {
      extractedIncidents = JSON.parse(cleanedContent);
      if (!Array.isArray(extractedIncidents)) extractedIncidents = [];
    } catch {
      console.error("Failed to parse AI response");
      return new Response(JSON.stringify({ error: "Failed to parse AI extraction", inserted: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`AI extracted ${extractedIncidents.length} incidents`);

    // Stage → Normalize pipeline
    const result = await stageAndNormalize(supabase, "firecrawl", extractedIncidents, extractedIncidents);

    console.log(`Ingestion complete: ${result.inserted} incidents inserted, ${result.staged} staged`);

    return new Response(
      JSON.stringify({ success: true, scraped: scrapedContent.length, extracted: extractedIncidents.length, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Ingestion error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
