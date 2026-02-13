import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Helper: Fix Truncated JSON ---
function repairTruncatedJSON(jsonStr: string): string {
  const trimmed = jsonStr.trim();
  if (trimmed.endsWith("]")) return trimmed;
  const lastObjectEnd = trimmed.lastIndexOf("},");
  if (lastObjectEnd !== -1) return trimmed.substring(0, lastObjectEnd + 1) + "]";
  const lastClose = trimmed.lastIndexOf("}");
  if (lastClose !== -1 && trimmed.indexOf("[") < lastClose) return trimmed.substring(0, lastClose + 1) + "]";
  return "[]";
}

// --- Helper: Content Hashing ---
async function contentHash(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// --- Helper: Database Staging ---
async function stageAndNormalize(supabase: any, sourceType: string, extractedIncidents: any[]) {
  if (!extractedIncidents.length) return { staged: 0, inserted: 0, duplicatesSkipped: 0 };

  const rawRows = await Promise.all(extractedIncidents.map(async (inc: any) => {
    const key = `${inc.title || ""}|${inc.datetime || ""}|${inc.location || ""}`;
    return {
      source_type: sourceType,
      source_label: inc.sources?.[0] || sourceType,
      source_url: inc.sources?.[0] || null,
      raw_payload: inc,
      content_hash: await contentHash(key),
      status: "raw"
    };
  }));

  const hashes = rawRows.map(r => r.content_hash);
  const { data: existingH } = await supabase.from("raw_events").select("content_hash").in("content_hash", hashes);
  const hashSet = new Set((existingH || []).map((h: any) => h.content_hash));

  const { data: existingInc } = await supabase.from("incidents").select("title").gte("datetime", new Date(Date.now() - 7 * 86400000).toISOString()).limit(300);
  const titleSet = new Set((existingInc || []).map((i: any) => i.title.toLowerCase()));

  const newRaw: any[] = [];
  const newInc: any[] = [];

  for (let i = 0; i < extractedIncidents.length; i++) {
    const inc = extractedIncidents[i];
    if (hashSet.has(rawRows[i].content_hash)) continue;
    if (titleSet.has(inc.title?.toLowerCase())) {
      newRaw.push({ ...rawRows[i], status: "duplicate" });
      continue;
    }

    newRaw.push(rawRows[i]);
    newInc.push({
      title: (inc.title || "Unknown").slice(0, 200),
      location: inc.location || "Unknown",
      region: inc.region || "unknown",
      country: inc.country || null,
      subdivision: inc.subdivision || null,
      category: inc.category || "crime",
      severity: Math.min(5, Math.max(1, Number(inc.severity) || 3)),
      confidence: Math.min(100, Math.max(0, Number(inc.confidence) || 40)),
      summary: inc.summary || null,
      datetime: inc.datetime || new Date().toISOString(),
      sources: Array.isArray(inc.sources) ? inc.sources : [],
      lat: typeof inc.lat === "number" ? inc.lat : null,
      lng: typeof inc.lng === "number" ? inc.lng : null,
      status: "ai" as const,
      section: "top_threats",
      analyst: "meta-socmint",
    });
  }

  if (newRaw.length > 0) {
    const { error } = await supabase.from("raw_events").insert(newRaw);
    if (error) console.error("Raw insert error:", error);
  }

  let inserted = 0;
  if (newInc.length > 0) {
    const { data: ins, error } = await supabase.from("incidents").insert(newInc).select("id");
    if (error) console.error("Incidents insert error:", error);
    else {
      inserted = ins?.length || 0;
      const norm = newRaw.filter(r => r.status === "raw");
      for (let j = 0; j < Math.min(norm.length, (ins || []).length); j++) {
        await supabase.from("raw_events").update({ status: "normalized", incident_id: ins[j].id, normalized_at: new Date().toISOString() }).eq("content_hash", norm[j].content_hash).eq("status", "raw");
      }
    }
  }
  return { staged: newRaw.length, inserted, duplicatesSkipped: extractedIncidents.length - newInc.length };
}

const DEFAULT_TARGETS = [
  { url: "https://www.instagram.com/bbcnews/", label: "BBC News" },
  { url: "https://www.instagram.com/reuters/", label: "Reuters" },
  { url: "https://www.facebook.com/BBCNews", label: "BBC News FB" },
];

// --- Helper: Construct Fallback Search Query ---
function getSearchQuery(url: string): string {
  try {
    const u = new URL(url);
    const pathParts = u.pathname.split('/').filter(Boolean);
    const handle = pathParts[0] || "news";
    const domain = u.hostname.replace("www.", "");
    // Targeted query: "site:instagram.com/bbcnews conflict OR attack"
    return `site:${domain}/${handle} "security" OR "conflict" OR "attack" OR "protest"`;
  } catch {
    return "security incidents news";
  }
}

async function scrapeWithFirecrawl(url: string, apiKey: string): Promise<{ content: string; log: string }> {
  try {
    // ---------------------------------------------------------
    // STRATEGY 1: Direct Scrape (Original Logic)
    // ---------------------------------------------------------
    let response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], timeout: 30000 }),
    });

    if (response.ok) {
      const data = await response.json();
      const markdown = data?.data?.markdown || data?.markdown || "";
      // If content is substantial, use it.
      if (markdown.length > 300) {
        return { content: markdown.slice(0, 10000), log: "OK (Direct) " };
      }
    }

    // ---------------------------------------------------------
    // STRATEGY 2: Fallback to Search Engine (If Direct Failed)
    // ---------------------------------------------------------
    const searchQuery = getSearchQuery(url);
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(searchQuery)}`;

    response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: searchUrl, formats: ["markdown"], timeout: 30000 }),
    });

    if (response.ok) {
      const data = await response.json();
      const markdown = data?.data?.markdown || data?.markdown || "";
      if (markdown.length > 200) {
        return {
          content: `[SEARCH RESULT SNIPPETS FOR: ${searchQuery}]\n${markdown.slice(0, 15000)}`,
          log: "OK (Search Fallback) "
        };
      }
    }

    return { content: "", log: "Failed (Blocked) " };
  } catch (e) {
    return { content: "", log: `Error: ${e instanceof Error ? e.message : String(e)} ` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { requireAdminOrAnalyst } = await import("../_shared/auth.ts");
  const authResult = await requireAdminOrAnalyst(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) return new Response(JSON.stringify({ error: "Firecrawl not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return new Response(JSON.stringify({ error: "Gemini not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let body: { targets?: { url: string; label: string }[]; region?: string } = {};
    try { body = await req.json(); } catch { }

    const targets = body.targets?.length ? body.targets : DEFAULT_TARGETS;
    const scraped: { label: string; url: string; content: string }[] = [];
    let debugLog = "";

    // SCRAPE LOOP
    for (const t of targets) {
      debugLog += `Target: ${t.label}... `;
      const { content, log } = await scrapeWithFirecrawl(t.url, FIRECRAWL_API_KEY);
      debugLog += log + "\n";

      if (content.length > 100) {
        scraped.push({ label: t.label, url: t.url, content });
      }
    }

    if (scraped.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        targetsScraped: 0,
        extracted: 0,
        inserted: 0,
        debug_log: debugLog
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const combined = scraped.map(s => `=== ${s.label} ===\n${s.content}`).join("\n\n---\n\n");

    // --- SPECIALIZED PROMPT FOR FRAGMENTED DATA ---
    const extractionPrompt = `You are a Social Media Intelligence analyst.
Your task is to extract security incidents from the content below, which contains **fragmented search engine snippets** and headlines.

CONTENT:
${combined}

${body.region ? `Focus on: ${body.region}` : "Include all regions."}

CRITICAL INSTRUCTIONS:
1. The content is messy (search results). Do NOT expect full articles.
2. Read the **headlines** and **snippets** (e.g. "...bombing reported in [City] yesterday...").
3. Reconstruct the event from these fragments.
4. If a snippet says "Explosion kills 5 in Mogadishu", THAT IS A VALID INCIDENT. Extract it.
5. Ignore generic text like "Log In", "Cookies", "Related Searches".
6. Return a valid JSON array. Max 15 items.`;

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
                sources: { type: "ARRAY", items: { type: "STRING" } },
                lat: { type: "NUMBER" },
                lng: { type: "NUMBER" }
              },
              required: ["title", "location", "category", "datetime"]
            }
          }
        }
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI extraction failed", details: errText, debug_log: debugLog }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiRes.json();
    let rawContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    if (!rawContent.endsWith("]")) rawContent = repairTruncatedJSON(rawContent);

    let extractedIncidents: any[];
    try { extractedIncidents = JSON.parse(rawContent); if (!Array.isArray(extractedIncidents)) extractedIncidents = []; }
    catch {
      return new Response(JSON.stringify({
        error: "Parse failed",
        inserted: 0,
        debug_log: debugLog,
        raw_response: rawContent.slice(0, 500)
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await stageAndNormalize(supabase, "meta", extractedIncidents);

    return new Response(JSON.stringify({
      success: true,
      targetsScraped: scraped.length,
      extracted: extractedIncidents.length,
      ...result,
      debug_log: debugLog
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Meta error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});