import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizeAlias(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

interface ExtractedEntity {
  name: string;
  type: "threat_actor" | "organization" | "armed_group" | "government" | "person" | "location_group";
  role: "perpetrator" | "target" | "mentioned" | "affiliated";
  aliases: string[];
  country: string | null;
  description: string | null;
  confidence: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { requireAdminOrAnalyst } = await import("../_shared/auth.ts");
  const authResult = await requireAdminOrAnalyst(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("Gemini API key not configured");

    let body: { limit?: number; incident_ids?: string[] } = {};
    try { body = await req.json(); } catch { }

    const batchSize = body.limit || 20;

    // 1. Fetch unprocessed incidents
    let query = supabase
      .from("incidents")
      .select("id, title, summary, category, country, region, analyst")
      .order("created_at", { ascending: false })
      .limit(batchSize);

    if (body.incident_ids?.length) {
      query = query.in("id", body.incident_ids);
    }

    const { data: incidents, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    if (!incidents || incidents.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: "No incidents found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Filter out incidents that already have entity links
    const incidentIds = incidents.map(i => i.id);
    const { data: existingLinks } = await supabase
      .from("incident_entities")
      .select("incident_id")
      .in("incident_id", incidentIds);

    const linkedSet = new Set((existingLinks || []).map(l => l.incident_id));
    const unprocessed = incidents.filter(i => !linkedSet.has(i.id));

    if (unprocessed.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: "All fetched incidents already processed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`Entity extraction: processing ${unprocessed.length} incidents`);

    // 3. Load existing aliases to resolve against
    const { data: allAliases } = await supabase
      .from("entity_aliases")
      .select("entity_id, alias_normalized");

    const aliasMap = new Map<string, string>();
    for (const a of allAliases || []) {
      aliasMap.set(a.alias_normalized, a.entity_id);
    }

    let totalEntitiesCreated = 0;
    let totalLinksCreated = 0;
    let debugLog = "";

    // 4. Batch Process (Chunk size 5)
    for (let batch = 0; batch < unprocessed.length; batch += 5) {
      const chunk = unprocessed.slice(batch, batch + 5);

      const incidentsText = chunk.map((inc, i) =>
        `[INDEX: ${i}] ID: ${inc.id}\nTitle: ${inc.title}\nSummary: ${inc.summary || "N/A"}\nRegion: ${inc.region}`
      ).join("\n\n---\n\n");

      // NATIVE GEMINI API CALL (Structured Output)
      const prompt = `Extract named entities from these security incidents.
      
INCIDENTS:
${incidentsText}

Return a list where each item corresponds to an incident index and contains a list of entities found.
Use "type": "threat_actor" | "organization" | "armed_group" | "government" | "person" | "location_group".
Use "role": "perpetrator" | "target" | "mentioned" | "affiliated".`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

      const aiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4000,
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  incident_index: { type: "INTEGER" },
                  entities: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        name: { type: "STRING" },
                        type: { type: "STRING" },
                        role: { type: "STRING" },
                        aliases: { type: "ARRAY", items: { type: "STRING" } },
                        country: { type: "STRING" },
                        description: { type: "STRING" },
                        confidence: { type: "INTEGER" }
                      },
                      required: ["name", "type", "role", "confidence"]
                    }
                  }
                },
                required: ["incident_index", "entities"]
              }
            }
          }
        })
      });

      if (!aiRes.ok) {
        debugLog += `Batch ${batch} failed: ${await aiRes.text()}\n`;
        continue;
      }

      const aiData = await aiRes.json();
      const rawContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

      let results: any[] = [];
      try {
        results = JSON.parse(rawContent);
      } catch (e) {
        console.error("JSON Parse Error", e);
        debugLog += `Batch ${batch} JSON error\n`;
        continue;
      }

      // Process results
      for (const result of results) {
        const idx = result.incident_index;
        if (typeof idx !== 'number' || idx < 0 || idx >= chunk.length) continue;

        const incident = chunk[idx];
        const entities: ExtractedEntity[] = result.entities || [];

        for (const ent of entities) {
          if (!ent.name || !ent.type) continue;

          const normalizedName = normalizeAlias(ent.name);
          if (!normalizedName) continue;

          // Resolution Logic
          const allNames = [ent.name, ...(ent.aliases || [])];
          const allNormalized = allNames.map(normalizeAlias).filter(Boolean);

          let entityId: string | null = null;

          // 1. Try to find existing entity via aliases
          for (const norm of allNormalized) {
            if (aliasMap.has(norm)) {
              entityId = aliasMap.get(norm)!;
              break;
            }
          }

          if (!entityId) {
            // 2. Create new entity
            const { data: newEntity, error: entErr } = await supabase
              .from("entities")
              .insert({
                canonical_name: ent.name,
                entity_type: ent.type,
                description: ent.description,
                country_affiliation: ent.country,
                region: incident.region,
                confidence: ent.confidence || 50,
                first_seen: new Date().toISOString(),
                last_seen: new Date().toISOString(),
              })
              .select("id")
              .single();

            if (entErr) {
              console.error("Entity create error:", entErr);
              continue;
            }
            entityId = newEntity.id;
            totalEntitiesCreated++;
          }

          // 3. Register aliases (new or existing entity)
          for (const norm of allNormalized) {
            if (!aliasMap.has(norm)) {
              const originalAlias = allNames[allNormalized.indexOf(norm)] || norm;
              await supabase.from("entity_aliases").insert({
                entity_id: entityId,
                alias: originalAlias,
                alias_normalized: norm,
                source: "ai-extraction",
              });
              aliasMap.set(norm, entityId!);
            }
          }

          // 4. Link to Incident
          const { error: linkErr } = await supabase
            .from("incident_entities")
            .upsert({
              incident_id: incident.id,
              entity_id: entityId,
              role: ent.role || "mentioned",
              confidence: ent.confidence || 50,
              extracted_name: ent.name,
            }, { onConflict: "incident_id,entity_id,role" });

          if (!linkErr) totalLinksCreated++;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: unprocessed.length,
      entities_created: totalEntitiesCreated,
      links_created: totalLinksCreated,
      debug_log: debugLog
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});