import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS" //to remove 
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 1. Security Check: Verify the user has a valid Supabase session
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Initialize Supabase Client
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
    const conversationHistory = Array.isArray(history) ? history : [];

    // 4. Context Retrieval: Fetch the 50 most recent incidents to ground the AI
    const { data: incidents, error: incError } = await supabase
      .from("incidents")
      .select("id, title, location, severity, confidence, category, status, datetime, summary")
      .order("datetime", { ascending: false })
      .limit(50);

    if (incError) console.error("Database fetch error:", incError);

    const incidentContext = (incidents || [])
      .map(i => `- [ID:${i.id.slice(0, 8)}] "${i.title}" | ${i.location} | Severity:${i.severity}/5 | Summary: ${i.summary || "N/A"}`)
      .join("\n");

    // 5. API Key Verification
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Gemini API key not configured in Supabase secrets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are BTIP Copilot, a security intelligence analyst.
    CURRENT INCIDENT DATABASE:
    ${incidentContext}

    RESPONSE FORMAT: You MUST respond with a valid JSON object using this exact schema:
    {
      "riskLevel": "low" | "medium" | "high" | "critical",
      "confidence": <number 0-100>,
      "summary": "<2-3 sentence natural language assessment>",
      "evidence": ["<point 1>", "<point 2>"],
      "recommendations": ["<action 1>", "<action 2>"],
      "linkedIncidents": [{"id": "<id>", "title": "<title>", "severity": <1-5>}]
    }
    DO NOT include markdown code blocks (like \`\`\`json) in your response.`;

    // 6. Call Google Gemini with Streaming Enabled
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `System Instruction: ${systemPrompt}` }] },
          ...conversationHistory.map(m => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }]
          })),
          { role: "user", parts: [{ text: query }] }
        ],
        generationConfig: { 
          temperature: 0.2,
          topP: 0.8,
          topK: 40
        }
      }),
    });

    // 7. Stream Processing
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
              
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);
              const delta = data.candidates?.[0]?.content?.parts?.[0]?.text;

              if (delta) {
                fullContent += delta;
                // Send the typing-effect chunk to the dashboard
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", delta })}\n\n`));
              }
            }
          }

          // 8. Final Completion: Send the fully parsed JSON object for the UI cards
          const cleanJson = fullContent.replace(/```json|```/g, "").trim();
          let parsed;
          try {
            parsed = JSON.parse(cleanJson);
          } catch {
            parsed = { 
              riskLevel: "medium", 
              summary: "Analysis complete but could not be formatted. Raw output: " + fullContent.slice(0, 100),
              evidence: [], recommendations: [], linkedIncidents: [], confidence: 50
            };
          }
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete", parsed })}\n\n`));
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return new Response(stream, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/event-stream", 
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      },
    });

  } catch (e) {
    console.error("Copilot Error:", e);
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});