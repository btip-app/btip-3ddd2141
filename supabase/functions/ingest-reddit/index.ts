import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Default security-related subreddits
const DEFAULT_SUBREDDITS = [
  "worldnews",
  "geopolitics",
  "security",
  "terrorism",
  "CombatFootage",
  "CredibleDefense",
];

async function fetchSubreddit(subreddit: string, limit = 25): Promise<any[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`,
      {
        headers: {
          "User-Agent": "BTIP-SOCMINT/1.0 (security intelligence platform)",
        },
      }
    );
    if (!res.ok) {
      console.warn(`Reddit r/${subreddit} returned ${res.status}`);
      return [];
    }
    const data = await res.json();
    return (data?.data?.children || []).map((c: any) => c.data);
  } catch (e) {
    console.warn(`Failed to fetch r/${subreddit}:`, e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse optional body
    let body: { subreddits?: string[]; region?: string } = {};
    try { body = await req.json(); } catch { /* defaults */ }

    const subreddits = body.subreddits?.length ? body.subreddits : DEFAULT_SUBREDDITS;

    console.log(`Reddit SOCMINT: scraping ${subreddits.length} subreddits`);

    // Step 1: Fetch posts from all subreddits
    const allPosts: any[] = [];
    for (const sub of subreddits) {
      const posts = await fetchSubreddit(sub, 20);
      allPosts.push(
        ...posts.map((p: any) => ({
          subreddit: sub,
          title: p.title || "",
          selftext: (p.selftext || "").slice(0, 1000),
          url: p.url || "",
          permalink: `https://reddit.com${p.permalink}`,
          score: p.score || 0,
          created_utc: p.created_utc || 0,
        }))
      );
    }

    if (allPosts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, scraped: 0, extracted: 0, inserted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter to security-relevant posts (score > 10 to reduce noise)
    const relevantPosts = allPosts
      .filter((p) => p.score > 10)
      .slice(0, 50);

    console.log(`Fetched ${allPosts.length} posts, ${relevantPosts.length} above score threshold`);

    // Step 2: Format for AI extraction
    const postsText = relevantPosts
      .map(
        (p) =>
          `[r/${p.subreddit} | score:${p.score}] ${p.title}\n${p.selftext ? p.selftext.slice(0, 300) : ""}\nURL: ${p.permalink}`
      )
      .join("\n\n---\n\n");

    const extractionPrompt = `You are a security intelligence analyst specializing in SOCMINT (Social Media Intelligence). Extract real security incidents from the following Reddit posts.

REDDIT POSTS:
${postsText}

Extract each distinct security incident and return a JSON array. Each incident must have:
{
  "title": "Brief descriptive title (max 100 chars)",
  "location": "Specific location (city, area, country)",
  "region": "Geographic region (e.g. middle-east, sub-saharan-africa, southeast-asia, south-asia, central-america, eastern-europe, west-africa, east-africa, north-africa, western-europe, north-america)",
  "country": "Country name",
  "subdivision": "State/province if known, or null",
  "category": "One of: armed-conflict, terrorism, civil-unrest, crime, natural-disaster, political-instability, piracy, kidnapping, cyber-attack",
  "severity": "Integer 1-5 (1=minor, 5=critical)",
  "confidence": "Integer 30-90 (social media sources are inherently lower confidence)",
  "summary": "2-3 sentence summary of the incident",
  "datetime": "ISO 8601 datetime string",
  "sources": ["Reddit permalink URL"],
  "lat": "Approximate latitude as number or null",
  "lng": "Approximate longitude as number or null"
}

${body.region ? `Focus on incidents in or near: ${body.region}` : "Include all regions."}

RULES:
- Only extract posts that describe REAL security events (attacks, protests, conflicts, disasters)
- Skip opinion posts, analysis, memes, or discussions without a specific incident
- Confidence should be 30-70 for unverified social media reports, 70-90 if multiple corroborating details
- Severity 5 = mass casualties; 4 = significant; 3 = moderate; 2 = minor; 1 = advisory
- Return ONLY a valid JSON array, no markdown fences
- Return at most 15 incidents
- If no real incidents found, return []`;

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
      if (!Array.isArray(extractedIncidents)) extractedIncidents = [];
    } catch {
      console.error("Failed to parse AI response:", cleanedContent.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to parse AI extraction", inserted: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`AI extracted ${extractedIncidents.length} incidents from Reddit`);

    // Step 3: Deduplicate against existing incidents
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
        confidence: Math.min(100, Math.max(0, Number(inc.confidence) || 50)),
        summary: inc.summary || null,
        datetime: inc.datetime || new Date().toISOString(),
        sources: Array.isArray(inc.sources) ? inc.sources : [],
        lat: typeof inc.lat === "number" ? inc.lat : null,
        lng: typeof inc.lng === "number" ? inc.lng : null,
        status: "ai" as const,
        section: "top_threats",
        analyst: "reddit-socmint",
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

    console.log(`Reddit SOCMINT complete: ${newIncidents.length} incidents inserted`);

    return new Response(
      JSON.stringify({
        success: true,
        subredditsScraped: subreddits.length,
        postsFetched: allPosts.length,
        postsAnalyzed: relevantPosts.length,
        extracted: extractedIncidents.length,
        inserted: newIncidents.length,
        duplicatesSkipped: extractedIncidents.length - newIncidents.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Reddit SOCMINT error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
