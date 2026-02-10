import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Public security-focused pages/accounts to scrape via Firecrawl
const DEFAULT_TARGETS = [
  { url: "https://www.instagram.com/bbcnews/", label: "BBC News" },
  { url: "https://www.instagram.com/cabornedefense/", label: "OSINT Defense" },
  { url: "https://www.facebook.com/BBCNews", label: "BBC News FB" },
  { url: "https://www.instagram.com/reuters/", label: "Reuters" },
  { url: "https://www.instagram.com/alabornenews/", label: "Al Jazeera" },
  { url: "https://www.facebook.com/ReutersNews", label: "Reuters FB" },
];

async function scrapeWithFirecrawl(url: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!response.ok) {
      console.warn(`Firecrawl scrape failed for ${url}: ${response.status}`);
      return "";
    }

    const data = await response.json();
    const markdown = data?.data?.markdown || data?.markdown || "";
    return markdown.slice(0, 5000); // cap per page
  } catch (e) {
    console.warn(`Firecrawl error for ${url}:`, e);
    return "";
  }
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

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl connector not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse optional body
    let body: { targets?: { url: string; label: string }[]; region?: string } = {};
    try { body = await req.json(); } catch { /* defaults */ }

    const targets = body.targets?.length ? body.targets : DEFAULT_TARGETS;

    console.log(`Meta SOCMINT: scraping ${targets.length} targets for user ${user.id}`);

    // Step 1: Scrape all targets with Firecrawl
    const scrapedContent: { label: string; url: string; content: string }[] = [];
    for (const target of targets) {
      const content = await scrapeWithFirecrawl(target.url, FIRECRAWL_API_KEY);
      if (content.length > 100) {
        scrapedContent.push({ label: target.label, url: target.url, content });
      }
    }

    console.log(`Scraped ${scrapedContent.length}/${targets.length} targets successfully`);

    if (scrapedContent.length === 0) {
      return new Response(
        JSON.stringify({ success: true, scraped: 0, extracted: 0, inserted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: AI extraction
    const combinedText = scrapedContent
      .map((s) => `=== ${s.label} (${s.url}) ===\n${s.content}`)
      .join("\n\n---\n\n");

    const extractionPrompt = `You are a security intelligence analyst specializing in SOCMINT (Social Media Intelligence) from Meta platforms (Instagram, Facebook). Extract real security incidents from the following scraped social media content.

SCRAPED CONTENT:
${combinedText}

Extract each distinct security incident and return a JSON array. Each incident must have:
{
  "title": "Brief descriptive title (max 100 chars)",
  "location": "Specific location (city, area, country)",
  "region": "Geographic region (e.g. middle-east, sub-saharan-africa, southeast-asia, south-asia, central-america, eastern-europe, west-africa, east-africa, north-africa, western-europe, north-america)",
  "country": "Country name",
  "subdivision": "State/province if known, or null",
  "category": "One of: armed-conflict, terrorism, civil-unrest, crime, natural-disaster, political-instability, piracy, kidnapping, cyber-attack",
  "severity": "Integer 1-5 (1=minor, 5=critical)",
  "confidence": "Integer 30-80 (scraped social media = lower confidence)",
  "summary": "2-3 sentence summary of the incident",
  "datetime": "ISO 8601 datetime string (use today if unknown)",
  "sources": ["Source URL"],
  "lat": "Approximate latitude as number or null",
  "lng": "Approximate longitude as number or null"
}

${body.region ? `Focus on incidents in or near: ${body.region}` : "Include all regions."}

RULES:
- Only extract posts that describe REAL security events (attacks, protests, conflicts, disasters)
- Skip promotional content, lifestyle posts, ads, or non-security content
- Confidence should be 30-60 for unverified scrapes, 60-80 if corroborated by reputable source
- Severity 5 = mass casualties; 4 = significant; 3 = moderate; 2 = minor; 1 = advisory
- Return ONLY a valid JSON array, no markdown fences
- Return at most 15 incidents
- If no real incidents found, return []`;

    const aiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
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
      if (!Array.isArray(extractedIncidents)) extractedIncidents = [];
    } catch {
      console.error("Failed to parse AI response:", cleanedContent.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to parse AI extraction", inserted: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`AI extracted ${extractedIncidents.length} incidents from Meta`);

    // Step 3: Deduplicate
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

    // Step 4: Insert
    if (newIncidents.length > 0) {
      const rows = newIncidents.map((inc: any) => ({
        title: (inc.title || "Unknown Incident").slice(0, 200),
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

    console.log(`Meta SOCMINT complete: ${newIncidents.length} incidents inserted`);

    return new Response(
      JSON.stringify({
        success: true,
        targetsScraped: scrapedContent.length,
        totalTargets: targets.length,
        extracted: extractedIncidents.length,
        inserted: newIncidents.length,
        duplicatesSkipped: extractedIncidents.length - newIncidents.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Meta SOCMINT error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
