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

// --- Helper: Fix Truncated JSON ---
function repairTruncatedJSON(jsonStr: string): string {
  const trimmed = jsonStr.trim();
  if (trimmed.endsWith("]")) return trimmed;

  // Find the last successfully closed object "},"
  const lastObjectEnd = trimmed.lastIndexOf("},");
  if (lastObjectEnd !== -1) {
    return trimmed.substring(0, lastObjectEnd + 1) + "]";
  }

  // If we have one object that closes but no comma?
  const lastClose = trimmed.lastIndexOf("}");
  if (lastClose !== -1 && trimmed.indexOf("[") < lastClose) {
    return trimmed.substring(0, lastClose + 1) + "]";
  }

  return "[]"; // Fallback
}

async function contentHash(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function stageAndNormalize(
  supabase: any,
  sourceType: string,
  extractedIncidents: any[],
  rawPayloads: any[]
) {
  if (!extractedIncidents.length) return { staged: 0, inserted: 0, duplicatesSkipped: 0 };

  const rawRows = extractedIncidents.map((inc: any, i: number) => ({
    source_type: sourceType,
    source_label: inc.sources?.[0] || sourceType,
    source_url: inc.sources?.[0] || null,
    raw_payload: rawPayloads[i] || inc,
    content_hash: null,
    status: "raw",
  }));

  for (let i = 0; i < rawRows.length; i++) {
    const key = `${extractedIncidents[i].title || ""}|${extractedIncidents[i].datetime || ""}|${extractedIncidents[i].location || ""}`;
    (rawRows[i] as any).content_hash = await contentHash(key);
  }

  const hashes = rawRows.map(r => r.content_hash);
  const { data: existingHashes } = await supabase
    .from("raw_events")
    .select("content_hash")
    .in("content_hash", hashes);

  const existingHashSet = new Set((existingHashes || []).map((h: any) => h.content_hash));

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

    if (existingHashSet.has(hash)) continue;
    if (existingTitles.has(inc.title?.toLowerCase())) {
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

  if (newRawRows.length > 0) {
    const { error: rawErr } = await supabase.from("raw_events").insert(newRawRows);
    if (rawErr) console.error("Raw events insert error:", rawErr);
  }

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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { requireAdminOrAnalyst } = await import("../_shared/auth.ts");
  const authResult = await requireAdminOrAnalyst(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) return new Response(JSON.stringify({ error: "Firecrawl missing" }), { status: 500, headers: corsHeaders });

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return new Response(JSON.stringify({ error: "Gemini missing" }), { status: 500, headers: corsHeaders });

    let body: { region?: string } = {};
    try { body = await req.json(); } catch { }

    const { data: dbSources } = await supabase.from("osint_sources").select("url, label").eq("enabled", true);
    const sourcesToScrape = (dbSources && dbSources.length > 0) ? dbSources : DEFAULT_SOURCES;

    const scrapedContent: string[] = [];
    let scrapeDebugLog = "";

    // SCRAPE
    for (const source of sourcesToScrape) {
      try {
        const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: source.url, formats: ["markdown"], timeout: 30000 }),
        });

        if (scrapeRes.ok) {
          const data = await scrapeRes.json();
          const markdown = data?.data?.markdown || data?.markdown || "";
          if (markdown.length > 100) {
            scrapedContent.push(`[Source: ${source.label} (${source.url})]\n${markdown.slice(0, 15000)}`);
            scrapeDebugLog += `[SUCCESS] ${source.label}: ${markdown.length} chars\n`;
          } else {
            scrapeDebugLog += `[WARN] ${source.label}: Content too short (${markdown.length})\n`;
          }
        } else {
          scrapeDebugLog += `[ERROR] ${source.label}: HTTP ${scrapeRes.status}\n`;
        }
      } catch (e) { scrapeDebugLog += `[EXCEPTION] ${source.label}: ${e}\n`; }
    }

    if (scrapedContent.length === 0) {
      return new Response(JSON.stringify({ error: "No sources scraped", debug_log: scrapeDebugLog }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // AI EXTRACT
    const extractionPrompt = `You are a security intelligence analyst.
TASK: Extract distinct security incidents (conflict, crime, terrorism, unrest) from the content below.
Return a list of objects.

CONTENT:
${scrapedContent.join("\n\n---\n\n")}

${body.region ? `Focus on: ${body.region}` : "Include all regions."}
Limit to 15 incidents.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const aiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: extractionPrompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                location: { type: "STRING" },
                region: { type: "STRING" },
                country: { type: "STRING" },
                category: { type: "STRING" },
                severity: { type: "INTEGER" },
                confidence: { type: "INTEGER" },
                summary: { type: "STRING" },
                datetime: { type: "STRING" },
                sources: { type: "ARRAY", items: { type: "STRING" } }
              },
              required: ["title", "location", "category", "severity", "datetime"]
            }
          }
        }
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI failed", details: errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const aiData = await aiRes.json();
    let rawContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    // --- CRITICAL FIX: REPAIR JSON IF TRUNCATED ---
    if (!rawContent.endsWith("]")) {
      console.log("JSON truncated, attempting repair...");
      rawContent = repairTruncatedJSON(rawContent);
    }

    let extractedIncidents: any[] = [];
    try {
      extractedIncidents = JSON.parse(rawContent);
    } catch (e) {
      return new Response(JSON.stringify({
        error: "JSON Parse Failed",
        raw_ai_response: rawContent.slice(0, 2000),
        scrape_debug: scrapeDebugLog
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!Array.isArray(extractedIncidents)) extractedIncidents = [];

    // Stage & Insert
    const result = await stageAndNormalize(supabase, "firecrawl", extractedIncidents, extractedIncidents);

    return new Response(
      JSON.stringify({
        success: true,
        scraped: scrapedContent.length,
        extracted: extractedIncidents.length,
        ...result,
        debug_scraped_log: scrapeDebugLog
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});