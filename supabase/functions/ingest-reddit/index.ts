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
async function stageAndNormalize(supabase: any, sourceType: string, extractedIncidents: any[], rawPayloads: any[]) {
  if (!extractedIncidents.length) return { staged: 0, inserted: 0, duplicatesSkipped: 0 };

  const rawRows = await Promise.all(extractedIncidents.map(async (inc: any, i: number) => {
    const key = `${inc.title || ""}|${inc.datetime || ""}|${inc.location || ""}`;
    // If rawPayloads[i] is undefined (because we extracted more incidents than we have source pages),
    // fallback to storing the incident object itself ('inc') as the payload.
    const payload = rawPayloads[i] || inc;
    return {
      source_type: sourceType,
      source_label: inc.sources?.[0] || sourceType,
      source_url: inc.sources?.[0] || null,
      raw_payload: payload,
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
      confidence: Math.min(100, Math.max(0, Number(inc.confidence) || 50)),
      summary: inc.summary || null,
      datetime: inc.datetime || new Date().toISOString(),
      sources: Array.isArray(inc.sources) ? inc.sources : [],
      lat: typeof inc.lat === "number" ? inc.lat : null,
      lng: typeof inc.lng === "number" ? inc.lng : null,
      status: "ai" as const,
      section: "top_threats",
      analyst: "reddit-socmint",
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

// --- Helper: Fetch RSS Feed ---
async function fetchSubreddit(sub: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.reddit.com/r/${sub}/hot.rss`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

const DEFAULT_SUBREDDITS = ["worldnews", "geopolitics", "security", "conflict", "CombatFootage"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { requireAdminOrAnalyst } = await import("../_shared/auth.ts");
  const authResult = await requireAdminOrAnalyst(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return new Response(JSON.stringify({ error: "Gemini API key not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let body: { subreddits?: string[]; region?: string } = {};
    try { body = await req.json(); } catch { }

    const subs = body.subreddits?.length ? body.subreddits : DEFAULT_SUBREDDITS;
    const scrapedContent: string[] = [];
    let totalItemsFound = 0;

    // FETCH LOOP
    for (const sub of subs) {
      const rssText = await fetchSubreddit(sub);
      if (rssText && rssText.length > 500) {
        scrapedContent.push(`[SOURCE: r/${sub}]\n${rssText.slice(0, 20000)}`);
        const itemCount = (rssText.match(/<item>/g) || []).length;
        totalItemsFound += itemCount;
      }
    }

    if (scrapedContent.length === 0) {
      // RETURN HERE: We explicitly include 'postsFetched' even if 0
      return new Response(JSON.stringify({ success: true, postsFetched: 0, extracted: 0, inserted: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `You are an intelligence analyst. Extract distinct security incidents from this Reddit RSS content.

CONTENT:
${scrapedContent.join("\n\n---\n\n")}

${body.region ? `Focus on: ${body.region}` : "Include all regions."}

RULES:
- Return ONLY a valid JSON array.
- Extract title and description from <item> tags.
- Ignore AutoModerator/Meta posts.
- Max 20 incidents.
- SHORT summaries.`;

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
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

    if (!aiRes.ok) return new Response(JSON.stringify({ error: "AI extraction failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const aiData = await aiRes.json();
    let rawContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    if (!rawContent.endsWith("]")) rawContent = repairTruncatedJSON(rawContent);

    let extracted: any[];
    try { extracted = JSON.parse(rawContent); if (!Array.isArray(extracted)) extracted = []; }
    catch { return new Response(JSON.stringify({ error: "Parse failed", inserted: 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    // Use 'extracted' as the payload source to prevent mismatches
    const result = await stageAndNormalize(supabase, "reddit", extracted, extracted);

    // RETURN HERE: Include 'postsFetched' in success response
    return new Response(JSON.stringify({ success: true, postsFetched: totalItemsFound, extracted: extracted.length, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Reddit error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});