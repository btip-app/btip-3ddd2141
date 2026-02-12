import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// OSINT sources to scrape for security incidents
// Default OSINT sources (fallback if DB has none)
const DEFAULT_SOURCES = [
  { url: "https://www.aljazeera.com/tag/security/", label: "Al Jazeera Security" },
  { url: "https://www.bbc.com/news/topics/cwlw3xz047jt", label: "BBC Conflicts" },
  { url: "https://reliefweb.int/updates?view=reports&search=security+incident", label: "ReliefWeb" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse optional body for region filter
    let body: { region?: string } = {};
    try { body = await req.json(); } catch { /* use defaults */ }

    // Load sources from DB (enabled only), fallback to defaults
    const { data: dbSources } = await supabase
      .from("osint_sources")
      .select("url, label")
      .eq("enabled", true);

    const sourcesToScrape = (dbSources && dbSources.length > 0)
      ? dbSources
      : DEFAULT_SOURCES;

    console.log(`Ingestion started, scraping ${sourcesToScrape.length} sources`);

    // Step 1: Scrape each source via Firecrawl
    const scrapedContent: string[] = [];
    for (const source of sourcesToScrape) {
      try {
        console.log(`Scraping: ${source.label}`);
        const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: source.url,
            formats: ["markdown"],
            onlyMainContent: true,
          }),
        });

        if (scrapeRes.ok) {
          const data = await scrapeRes.json();
          const markdown = data?.data?.markdown || data?.markdown || "";
          if (markdown) {
            scrapedContent.push(`[Source: ${source.label}]\n${markdown.slice(0, 5000)}`);
          }
        } else {
          console.warn(`Failed to scrape ${source.label}: ${scrapeRes.status}`);
        }
      } catch (e) {
        console.warn(`Error scraping ${source.label}:`, e);
      }
    }

    if (scrapedContent.length === 0) {
      return new Response(JSON.stringify({ error: "No sources could be scraped", inserted: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Scraped ${scrapedContent.length} sources, sending to AI for extraction`);

    // Step 2: Use AI to extract structured incidents from scraped content
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
  "severity": "Integer 1-5 (1=minor, 5=critical)",
  "confidence": "Integer 50-100 indicating data confidence",
  "summary": "2-3 sentence summary of the incident",
  "datetime": "ISO 8601 datetime string (use today's date if not specified)",
  "sources": ["URL or source name"],
  "lat": "Approximate latitude as number or null",
  "lng": "Approximate longitude as number or null"
}

${body.region ? `Focus on incidents in or near: ${body.region}` : "Include all regions."}

RULES:
- Only extract REAL security incidents, not opinion pieces or analysis
- Each incident must be a distinct event
- Severity 5 = mass casualties/major attack; 4 = significant; 3 = moderate; 2 = minor; 1 = advisory
- Return ONLY a valid JSON array, no markdown fences
- Return at most 15 incidents
- If no incidents found, return an empty array []`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: extractionPrompt }],
        temperature: 0.1,
        max_tokens: 4000,
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
    const cleanedContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let extractedIncidents: any[];
    try {
      extractedIncidents = JSON.parse(cleanedContent);
      if (!Array.isArray(extractedIncidents)) {
        extractedIncidents = [];
      }
    } catch {
      console.error("Failed to parse AI response:", cleanedContent.slice(0, 500));
      return new Response(JSON.stringify({ error: "Failed to parse AI extraction", inserted: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`AI extracted ${extractedIncidents.length} incidents`);

    // Step 3: Deduplicate against existing incidents (by title similarity)
    const { data: existingIncidents } = await supabase
      .from("incidents")
      .select("title")
      .gte("datetime", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(200);

    const existingTitles = new Set((existingIncidents || []).map((i: any) => i.title.toLowerCase()));

    const newIncidents = extractedIncidents.filter(
      (inc: any) => !existingTitles.has(inc.title?.toLowerCase())
    );

    console.log(`${newIncidents.length} new incidents after deduplication`);

    // Step 4: Insert into database
    if (newIncidents.length > 0) {
      const rows = newIncidents.map((inc: any) => ({
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
        analyst: `firecrawl-ingest`,
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

    console.log(`Ingestion complete: ${newIncidents.length} incidents inserted`);

    return new Response(
      JSON.stringify({
        success: true,
        scraped: scrapedContent.length,
        extracted: extractedIncidents.length,
        inserted: newIncidents.length,
        duplicatesSkipped: extractedIncidents.length - newIncidents.length,
      }),
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
