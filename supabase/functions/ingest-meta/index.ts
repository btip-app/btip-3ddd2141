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

async function stageAndNormalize(supabase: any, sourceType: string, extractedIncidents: any[], rawPayloads: any[]) {
  const rawRows = await Promise.all(extractedIncidents.map(async (inc: any, i: number) => {
    const key = `${inc.title || ""}|${inc.datetime || ""}|${inc.location || ""}`;
    return { source_type: sourceType, source_label: inc.sources?.[0] || sourceType, source_url: inc.sources?.[0] || null, raw_payload: rawPayloads[i] || inc, content_hash: await contentHash(key), status: "raw" };
  }));

  const hashes = rawRows.map(r => r.content_hash);
  const { data: existingH } = await supabase.from("raw_events").select("content_hash").in("content_hash", hashes);
  const hashSet = new Set((existingH || []).map((h: any) => h.content_hash));
  const { data: existingInc } = await supabase.from("incidents").select("title").gte("datetime", new Date(Date.now() - 7 * 86400000).toISOString()).limit(300);
  const titleSet = new Set((existingInc || []).map((i: any) => i.title.toLowerCase()));

  const newRaw: any[] = [], newInc: any[] = [];
  for (let i = 0; i < extractedIncidents.length; i++) {
    const inc = extractedIncidents[i];
    if (hashSet.has(rawRows[i].content_hash)) continue;
    if (titleSet.has(inc.title?.toLowerCase())) { newRaw.push({ ...rawRows[i], status: "duplicate" }); continue; }
    newRaw.push(rawRows[i]);
    newInc.push({
      title: (inc.title || "Unknown").slice(0, 200), location: inc.location || "Unknown", region: inc.region || "unknown",
      country: inc.country || null, subdivision: inc.subdivision || null, category: inc.category || "crime",
      severity: Math.min(5, Math.max(1, Number(inc.severity) || 3)), confidence: Math.min(100, Math.max(0, Number(inc.confidence) || 40)),
      summary: inc.summary || null, datetime: inc.datetime || new Date().toISOString(),
      sources: Array.isArray(inc.sources) ? inc.sources : [], lat: typeof inc.lat === "number" ? inc.lat : null,
      lng: typeof inc.lng === "number" ? inc.lng : null, status: "ai" as const, section: "top_threats", analyst: "meta-socmint",
    });
  }

  if (newRaw.length > 0) { const { error } = await supabase.from("raw_events").insert(newRaw); if (error) console.error("Raw err:", error); }
  let inserted = 0;
  if (newInc.length > 0) {
    const { data: ins, error } = await supabase.from("incidents").insert(newInc).select("id");
    if (error) console.error("Inc err:", error);
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
  { url: "https://www.facebook.com/ReutersNews", label: "Reuters FB" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth guard: require admin or analyst role
  const { requireAdminOrAnalyst } = await import("../_shared/auth.ts");
  const authResult = await requireAdminOrAnalyst(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!FIRECRAWL_API_KEY) return new Response(JSON.stringify({ error: "Firecrawl not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "AI gateway not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let body: { targets?: { url: string; label: string }[]; region?: string } = {};
    try { body = await req.json(); } catch {}

    const targets = body.targets?.length ? body.targets : DEFAULT_TARGETS;
    const scraped: { label: string; url: string; content: string }[] = [];

    for (const t of targets) {
      try {
        const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST", headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: t.url, formats: ["markdown"], onlyMainContent: true, waitFor: 3000 }),
        });
        if (res.ok) { const d = await res.json(); const md = d?.data?.markdown || d?.markdown || ""; if (md.length > 100) scraped.push({ label: t.label, url: t.url, content: md.slice(0, 5000) }); }
      } catch {}
    }

    if (scraped.length === 0) return new Response(JSON.stringify({ success: true, scraped: 0, inserted: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const combined = scraped.map(s => `=== ${s.label} ===\n${s.content}`).join("\n\n---\n\n");
    const prompt = `You are a SOCMINT analyst. Extract real security incidents from Meta social media content.

CONTENT:
${combined}

Return JSON array: {"title":"...","location":"...","region":"...","country":"...","subdivision":"...or null","category":"armed-conflict|terrorism|civil-unrest|crime|natural-disaster|political-instability|piracy|kidnapping|cyber-attack","severity":"1-5","confidence":"30-80","summary":"...","datetime":"ISO8601","sources":["URL"],"lat":"num or null","lng":"num or null"}

${body.region ? `Focus: ${body.region}` : "All regions."}
Only REAL events. Max 15. JSON only, no markdown.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: prompt }], temperature: 0.1, max_tokens: 4000 }),
    });

    if (!aiRes.ok) return new Response(JSON.stringify({ error: "AI extraction failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const raw = (await aiRes.json()).choices?.[0]?.message?.content || "[]";
    let extracted: any[];
    try { extracted = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()); if (!Array.isArray(extracted)) extracted = []; } catch { return new Response(JSON.stringify({ error: "Parse failed", inserted: 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    const result = await stageAndNormalize(supabase, "meta", extracted, scraped.slice(0, extracted.length));

    return new Response(JSON.stringify({ success: true, targetsScraped: scraped.length, extracted: extracted.length, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Meta error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
