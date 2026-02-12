import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { query, history } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Missing query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const conversationHistory: { role: string; content: string }[] = Array.isArray(history) ? history : [];

    console.log(`Copilot query from user ${user.id}: ${query}`);

    // Fetch recent incidents for context (expanded window for trend analysis)
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

    // Compute trend statistics for predictive context
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

    // Category breakdown
    const catCounts: Record<string, { last7: number; prev7: number; last30: number }> = {};
    for (const i of allIncidents as any[]) {
      const cat = i.category;
      if (!catCounts[cat]) catCounts[cat] = { last7: 0, prev7: 0, last30: 0 };
      const age = now - new Date(i.datetime).getTime();
      if (age < _7d) catCounts[cat].last7++;
      if (age >= _7d && age < _14d) catCounts[cat].prev7++;
      if (age < _30d) catCounts[cat].last30++;
    }

    // Region breakdown
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
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
- PREDICTIVE ANALYSIS: Use the trend data to project future risk. Look at week-over-week changes, category trends, and regional patterns to forecast threat direction
- If a category or region shows a RISING trend, factor that into a higher risk projection
- The forecast.direction should reflect whether you expect things to get worse, stay the same, or improve
- If no incidents match the query, say so honestly and set riskLevel to "low"`;

    console.log("Calling AI gateway with streaming...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory.slice(-10).map((m: any) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          })),
          { role: "user", content: query },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const body = await aiResponse.text();
      console.error(`AI gateway error [${status}]:`, body);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream the SSE response through to the client
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
              const data = line.slice(6).trim();
              if (data === "[DONE]") {
                // Send the final parsed JSON
                const jsonStr = fullContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                let parsed;
                try {
                  parsed = JSON.parse(jsonStr);
                } catch {
                  parsed = {
                    riskLevel: "medium",
                    confidence: 50,
                    summary: fullContent.slice(0, 500),
                    evidence: ["AI response could not be structured"],
                    recommendations: ["Review raw analysis output"],
                    linkedIncidents: [],
                  };
                }
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete", parsed })}\n\n`));
                controller.close();
                return;
              }

              try {
                const json = JSON.parse(data);
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", delta })}\n\n`));
                }
              } catch {
                // skip unparseable lines
              }
            }
          }

          // If we exit the loop without [DONE], finalize
          if (fullContent) {
            const jsonStr = fullContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            let parsed;
            try {
              parsed = JSON.parse(jsonStr);
            } catch {
              parsed = {
                riskLevel: "medium",
                confidence: 50,
                summary: fullContent.slice(0, 500),
                evidence: ["AI response could not be structured"],
                recommendations: ["Review raw analysis output"],
                linkedIncidents: [],
              };
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete", parsed })}\n\n`));
          }
          controller.close();
        } catch (e) {
          console.error("Stream error:", e);
          controller.error(e);
        }
      },
    });

    console.log("Streaming response started");

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
