import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// GDELT GKG API – free, no key required
// Focus on African conflict/security events
const AFRICA_COUNTRIES = [
  "Nigeria", "Kenya", "Ethiopia", "Somalia", "Sudan", "South Sudan",
  "Democratic Republic of the Congo", "Mozambique", "Mali", "Burkina Faso",
  "Niger", "Chad", "Cameroon", "Libya", "Egypt", "South Africa",
  "Tanzania", "Uganda", "Rwanda", "Burundi", "Zimbabwe", "Angola",
  "Central African Republic", "Senegal", "Ghana", "Ivory Coast",
];

const SECURITY_THEMES = [
  "TERROR", "PROTEST", "KILL", "KIDNAP", "ARMED_CONFLICT",
  "CONFLICT", "MILITARY", "REBELLION", "RIOT", "ARREST",
  "COUP", "SEIZE", "ASSAULT", "BOMB", "ATTACK",
];

async function fetchGdeltEvents(): Promise<any[]> {
  // Try multiple focused queries to maximize results
  const queries = [
    "(attack OR conflict OR protest OR violence) (Africa OR Nigeria OR Kenya OR Ethiopia OR Somalia)",
    "(terrorism OR bombing OR kidnapping OR coup) (Africa OR Congo OR Mali OR Sudan OR Libya)",
    "(military OR rebellion OR riot) (Mozambique OR Cameroon OR Burkina Faso OR Niger OR Chad)",
  ];

  const allArticles: any[] = [];

  for (const query of queries) {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=30&timespan=72h&format=json&sort=DateDesc`;

    try {
      console.log(`GDELT query: ${query.slice(0, 60)}...`);
      const res = await fetch(url);

      if (!res.ok) {
        console.warn(`GDELT API returned ${res.status} for query`);
        continue;
      }

      const text = await res.text();
      // GDELT sometimes returns HTML error pages instead of JSON
      if (text.startsWith("<") || text.startsWith("<!")) {
        console.warn("GDELT returned HTML instead of JSON, skipping");
        continue;
      }

      const data = JSON.parse(text);
      const articles = data?.articles || [];
      console.log(`GDELT returned ${articles.length} articles for query`);
      allArticles.push(...articles);
    } catch (e) {
      console.warn("GDELT fetch error:", e);
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return allArticles.filter((a: any) => {
    if (!a.url || seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("GDELT ingestion started");

    // Fetch articles from GDELT
    const articles = await fetchGdeltEvents();

    if (articles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, fetched: 0, extracted: 0, inserted: 0, duplicatesSkipped: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetched ${articles.length} GDELT articles`);

    // Format for AI extraction
    const articlesText = articles
      .slice(0, 20)
      .map((a: any, i: number) =>
        `[${i + 1}] ${a.title || "No title"}\nSource: ${a.domain || "unknown"}\nDate: ${a.seendate || "unknown"}\nURL: ${a.url || ""}`
      )
      .join("\n\n---\n\n");

    const extractionPrompt = `You are a security intelligence analyst specializing in African conflict and political violence data. Extract real security incidents from the following GDELT news articles.

ARTICLES:
${articlesText}

Extract each distinct security incident and return a JSON array. Each incident must have:
{
  "title": "Brief descriptive title (max 100 chars)",
  "location": "Specific location (city, area, country)",
  "region": "Geographic region code (e.g. west-africa, east-africa, north-africa, sub-saharan-africa, southern-africa, central-africa, middle-east, southeast-asia, south-asia, eastern-europe, western-europe)",
  "country": "Country name",
  "subdivision": "State/province if known, or null",
  "category": "One of: armed-conflict, terrorism, civil-unrest, crime, natural-disaster, political-instability, piracy, kidnapping, cyber-attack",
  "severity": "Integer 1-5 (1=minor, 5=critical)",
  "confidence": "Integer 50-95 (news sources are higher confidence than social media)",
  "summary": "2-3 sentence summary of the incident",
  "datetime": "ISO 8601 datetime string",
  "sources": ["Source URL"],
  "lat": "Approximate latitude as number or null",
  "lng": "Approximate longitude as number or null"
}

RULES:
- Only extract articles that describe REAL security events (attacks, protests, conflicts, coups, disasters)
- Skip opinion pieces, economic news, sports, entertainment
- Focus on Africa but include other regions if clearly security-related
- Confidence should be 60-95 for mainstream news sources
- Severity 5 = mass casualties/coup; 4 = significant attack; 3 = moderate; 2 = minor; 1 = advisory
- Return ONLY a valid JSON array, no markdown fences
- Return at most 20 incidents
- If no real incidents found, return []`;

    // CHANGED: Call Google Gemini Direct API (OpenAI-compatible endpoint)
    const aiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash", // Using standard stable flash model
        messages: [{ role: "user", content: extractionPrompt }],
        temperature: 0.1,
        max_tokens: 5000,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error(`AI extraction failed [${aiRes.status}]:`, errText);
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "[]";

    // Extract first JSON array found in response (non-greedy)
    const jsonMatch = rawContent.match(/\[[\s\S]*?\]/);
    const cleanedContent = jsonMatch ? jsonMatch[0] : "[]";


    let extractedIncidents: any[];
    try {
      extractedIncidents = JSON.parse(cleanedContent);
      if (!Array.isArray(extractedIncidents)) extractedIncidents = [];
    } catch (e) {
      console.error("Failed to parse AI response. Raw:", rawContent);
      console.error("Cleaned:", cleanedContent);
      return new Response(
        JSON.stringify({
          error: "Failed to parse AI extraction",
          raw: rawContent.slice(0, 1000),
          inserted: 0
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`AI extracted ${extractedIncidents.length} incidents from GDELT`);

    // Deduplicate
    const { data: existingIncidents } = await supabase
      .from("incidents")
      .select("title")
      .gte("datetime", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(300);

    const existingTitles = new Set((existingIncidents || []).map((i: any) => i.title.toLowerCase()));
    const newIncidents = extractedIncidents.filter(
      (inc: any) => !existingTitles.has(inc.title?.toLowerCase())
    );

    console.log(`${newIncidents.length} new incidents after deduplication`);

    if (newIncidents.length > 0) {
      const rows = newIncidents.map((inc: any) => ({
        title: (inc.title || "Unknown Incident").slice(0, 200),
        location: inc.location || "Unknown",
        region: inc.region || "unknown",
        country: inc.country || null,
        subdivision: inc.subdivision || null,
        category: inc.category || "armed-conflict",
        severity: Math.min(5, Math.max(1, Number(inc.severity) || 3)),
        confidence: Math.min(100, Math.max(0, Number(inc.confidence) || 70)),
        summary: inc.summary || null,
        datetime: inc.datetime || new Date().toISOString(),
        sources: Array.isArray(inc.sources) ? inc.sources : [],
        lat: typeof inc.lat === "number" ? inc.lat : null,
        lng: typeof inc.lng === "number" ? inc.lng : null,
        status: "ai" as const,
        section: "top_threats",
        analyst: "gdelt",
      }));

      const { error: insertError } = await supabase.from("incidents").insert(rows);
      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: insertError.message, inserted: 0 }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`GDELT ingestion complete: ${newIncidents.length} incidents inserted`);

    return new Response(
      JSON.stringify({
        success: true,
        fetched: articles.length,
        extracted: extractedIncidents.length,
        inserted: newIncidents.length,
        duplicatesSkipped: extractedIncidents.length - newIncidents.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("GDELT ingestion error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});