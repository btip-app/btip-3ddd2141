import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
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

    let rawBody: any;
    try { rawBody = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query, history } = rawBody;
    if (!query || typeof query !== "string" || query.length > 2000) {
      return new Response(JSON.stringify({ error: "Invalid or missing query (max 2000 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const conversationHistory: { role: string; content: string }[] = (Array.isArray(history) ? history : [])
      .slice(-10)
      .filter((m: any) => typeof m?.role === "string" && typeof m?.content === "string" && m.content.length <= 5000);

    console.log(`Copilot query from user ${user.id}: ${query}`);

    // Fetch recent incidents for context
    const { data: incidents, error: incError } = await supabase
      .from("incidents")
      .select("id, title, location, severity, confidence, category, status, datetime, region, country, subdivision, summary, sources")
      .order("datetime", { ascending: false })
      .limit(200);

    if (incError) {
      console.error("Failed to fetch incidents:", incError);
    }

    const allIncidents = incidents || [];

    const incidentContext = allIncidents
      .slice(0, 50)
      .map(
        (i: any) =>
          `- [ID:${i.id.slice(0, 8)}] "${i.title}" | ${i.location} | Severity:${i.severity}/5 | Confidence:${i.confidence}% | Category:${i.category} | Status:${i.status} | ${i.datetime} | Summary: ${i.summary || "N/A"}`
      )
      .join("\n");

    const now = Date.now();
    const _7d = 7 * 86400000;
    const _14d = 14 * 86400000;
    const _30d = 30 * 86400000;

    const last7d = allIncidents.filter((i: any) => now - new Date(i.datetime).getTime() < _7d);
    const prev7d = allIncidents.filter((i: any) => {
      const age = now - new Date(i.datetime).getTime();
      return age >= _7d && age < _14d;
    });
    const last30d = allIncidents.filter((i: any) => now - new Date(i.datetime).getTime() < _30d);

    const catCounts: Record<string, { last7: number; prev7: number; last30: number }> = {};
    for (const i of allIncidents as any[]) {
      const cat = i.category;
      if (!catCounts[cat]) catCounts[cat] = { last7: 0, prev7: 0, last30: 0 };
      const age = now - new Date(i.datetime).getTime();
      if (age < _7d) catCounts[cat].last7++;
      if (age >= _7d && age < _14d) catCounts[cat].prev7++;
      if (age < _30d) catCounts[cat].last30++;
    }

    const regionCounts: Record<string, { last7: number; prev7: number }> = {};
    for (const i of allIncidents as any[]) {
      const region = i.country || i.region || "unknown";
      if (!regionCounts[region]) regionCounts[region] = { last7: 0, prev7: 0 };
      const age = now - new Date(i.datetime).getTime();
      if (age < _7d) regionCounts[region].last7++;
      if (age >= _7d && age < _14d) regionCounts[region].prev7++;
    }

    const trendContext = `
TREND ANALYSIS DATA (for predictive assessments):
- Total incidents: ${allIncidents.length} (last 30d: ${last30d.length})
- Last 7 days: ${last7d.length} incidents | Previous 7 days: ${prev7d.length} incidents
- Week-over-week change: ${last7d.length - prev7d.length > 0 ? "+" : ""}${last7d.length - prev7d.length} (${prev7d.length > 0 ? ((last7d.length / prev7d.length - 1) * 100).toFixed(0) : "N/A"}%)

CATEGORY TRENDS:
${Object.entries(catCounts).map(([cat, c]) => `  ${cat}: 7d=${c.last7}, prev7d=${c.prev7}, 30d=${c.last30} | trend=${c.prev7 > 0 ? (c.last7 > c.prev7 * 1.2 ? "RISING" : c.last7 < c.prev7 * 0.8 ? "DECLINING" : "STABLE") : c.last7 > 0 ? "NEW" : "INACTIVE"}`).join("\n")}

REGIONAL TRENDS:
${Object.entries(regionCounts).map(([region, c]) => `  ${region}: 7d=${c.last7}, prev7d=${c.prev7} | trend=${c.prev7 > 0 ? (c.last7 > c.prev7 * 1.2 ? "RISING" : c.last7 < c.prev7 * 0.8 ? "DECLINING" : "STABLE") : c.last7 > 0 ? "NEW" : "INACTIVE"}`).join("\n")}

AVG SEVERITY (last 7d): ${last7d.length > 0 ? (last7d.reduce((s: number, i: any) => s + i.severity, 0) / last7d.length).toFixed(1) : "N/A"}
AVG SEVERITY (prev 7d): ${prev7d.length > 0 ? (prev7d.reduce((s: number, i: any) => s + i.severity, 0) / prev7d.length).toFixed(1) : "N/A"}
`;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Gemini AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are BTIP Copilot, a security intelligence decision-support analyst with predictive capabilities. You provide structured threat assessments and risk forecasts based on real incident data and trend analysis.

CURRENT INCIDENT DATABASE (${allIncidents.length} total, showing 50 most recent):
${incidentContext}

${trendContext}

RESPONSE FORMAT:
You MUST respond with a valid JSON object (no markdown, no code fences) using this exact schema:
{
  "riskLevel": "low" | "medium" | "high" | "critical",
  "confidence": <number 0-100>,
  "summary": "<2-3 sentence natural language threat assessment>",
  "evidence": ["<evidence point 1>", "<evidence point 2>", ...],
  "recommendations": ["<action 1>", "<action 2>", ...],
  "linkedIncidents": [{"id": "<incident id>", "title": "<title>", "severity": <1-5>}, ...],
  "forecast": {
    "direction": "escalating" | "stable" | "de-escalating",
    "horizon": "<e.g. '7-14 days'>",
    "rationale": "<1-2 sentences explaining the projection>",
    "riskProjection": "low" | "medium" | "high" | "critical"
  }
}

GUIDELINES:
- Base your analysis ONLY on the incident data and trend statistics provided above
- Reference specific incidents by their titles and locations
- Risk level should reflect the highest severity incidents matching the query
- Confidence should reflect how many relevant incidents you found
- Provide 3-6 evidence points citing specific incidents
- Give 3-5 actionable security recommendations
- Link the most relevant incidents (up to 5)
- PREDICTIVE ANALYSIS: Use the trend data to project future risk.
- If no incidents match the query, say so honestly and set riskLevel to "low"`;

    console.log("Calling Gemini AI API with streaming...");

    // Using the Google Gemini API (OpenAI-compatible endpoint)
    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash", // Using current stable Gemini model
        stream: true,
        temperature: 0.3,
        top_p: 0.8,
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory.map(m => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          })),
          { role: "user", content: query },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error(`Gemini AI error [${aiResponse.status}]:`, errText);
      return new Response(JSON.stringify({ error: `AI analysis failed: ${aiResponse.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reader = aiResponse.body!.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;

              const jsonStr = line.slice(6).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;

              try {
                const data = JSON.parse(jsonStr);
                const delta = data.choices?.[0]?.delta?.content;

                if (delta) {
                  fullContent += delta;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", delta })}\n\n`));
                }
              } catch (parseErr) {
                // Skip unparseable lines
              }
            }
          }

          console.log("Full AI content length:", fullContent.length);
          const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
          const cleanedJson = jsonMatch ? jsonMatch[0] : null;

          let parsed;
          try {
            parsed = cleanedJson ? JSON.parse(cleanedJson) : null;
          } catch {
            console.error("Failed to parse final Gemini AI JSON.");
            parsed = {
              riskLevel: "medium",
              confidence: 50,
              summary: "Analysis incomplete due to formatting.",
              evidence: ["AI response could not be structured"],
              recommendations: ["Review raw analysis output"],
              linkedIncidents: [],
              forecast: { direction: "stable", horizon: "unknown", rationale: "Structure failure", riskProjection: "medium" }
            };
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete", parsed })}\n\n`));
          controller.close();
        } catch (e) {
          console.error("Stream error:", e);
          controller.error(e);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    console.error("Copilot error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});