import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Entity Resolution Pipeline
 * 1. Fetch unprocessed incidents (no linked entities)
 * 2. Use AI to extract threat actors, organizations, persons
 * 3. Resolve against existing entities via alias matching
 * 4. Create new entities or link to existing ones
 */

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

  // Auth guard: require admin or analyst role
  const { requireAdminOrAnalyst } = await import("../_shared/auth.ts");
  const authResult = await requireAdminOrAnalyst(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "AI gateway not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let body: { limit?: number; incident_ids?: string[] } = {};
    try { body = await req.json(); } catch {}

    const batchSize = body.limit || 20;

    // Fetch incidents without entity links (unprocessed)
    let query = supabase
      .from("incidents")
      .select("id, title, summary, category, country, region, sources, analyst")
      .order("created_at", { ascending: false })
      .limit(batchSize);

    if (body.incident_ids?.length) {
      query = query.in("id", body.incident_ids);
    }

    const { data: incidents, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;
    if (!incidents || incidents.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, entities_created: 0, links_created: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Filter out already-processed incidents
    const incidentIds = incidents.map(i => i.id);
    const { data: existingLinks } = await supabase
      .from("incident_entities")
      .select("incident_id")
      .in("incident_id", incidentIds);

    const linkedSet = new Set((existingLinks || []).map(l => l.incident_id));
    const unprocessed = incidents.filter(i => !linkedSet.has(i.id));

    if (unprocessed.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: "All incidents already processed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`Entity extraction: processing ${unprocessed.length} incidents`);

    // Load existing entity aliases for resolution
    const { data: allAliases } = await supabase
      .from("entity_aliases")
      .select("entity_id, alias_normalized");

    const aliasMap = new Map<string, string>(); // normalized alias -> entity_id
    for (const a of allAliases || []) {
      aliasMap.set(a.alias_normalized, a.entity_id);
    }

    // Batch incidents for AI extraction (groups of 5)
    let totalEntitiesCreated = 0;
    let totalLinksCreated = 0;

    for (let batch = 0; batch < unprocessed.length; batch += 5) {
      const chunk = unprocessed.slice(batch, batch + 5);

      const incidentsText = chunk.map((inc, i) =>
        `[${i + 1}] ID: ${inc.id}\nTitle: ${inc.title}\nSummary: ${inc.summary || "N/A"}\nCategory: ${inc.category}\nCountry: ${inc.country || "Unknown"}\nRegion: ${inc.region}\nSource: ${inc.analyst}`
      ).join("\n\n---\n\n");

      const prompt = `You are an intelligence analyst performing Named Entity Recognition (NER) and entity resolution on security incidents.

INCIDENTS:
${incidentsText}

For each incident, extract ALL threat actors, organizations, armed groups, governments, and persons mentioned. Return a JSON array:

[
  {
    "incident_index": 1,
    "entities": [
      {
        "name": "Canonical name of entity",
        "type": "threat_actor|organization|armed_group|government|person|location_group",
        "role": "perpetrator|target|mentioned|affiliated",
        "aliases": ["Alternative names", "Abbreviations", "Local language names"],
        "country": "Country of origin/affiliation or null",
        "description": "One-sentence description of who/what this entity is",
        "confidence": 50-100
      }
    ]
  }
]

RULES:
- Extract ALL named entities: militant groups, political parties, government bodies, military units, named individuals
- "type" meanings: threat_actor=non-state violent actor, armed_group=militia/rebel force, organization=NGO/company/political party, government=state institution, person=named individual, location_group=geographic faction
- Include known aliases (e.g., "Islamic State" -> ["ISIS", "ISIL", "Daesh", "IS"])
- "role": perpetrator=carried out attack, target=victim/target, mentioned=referenced, affiliated=linked but not directly involved
- confidence: 90+ for well-known groups, 60-89 for likely matches, 50-59 for uncertain
- Return ONLY valid JSON array, no markdown fences
- If no entities found for an incident, include it with empty entities array`;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "user", content: prompt }], temperature: 0.1, max_tokens: 4000 }),
      });

      if (!aiRes.ok) { console.error(`AI failed [${aiRes.status}]`); continue; }

      const raw = (await aiRes.json()).choices?.[0]?.message?.content || "[]";
      let results: any[];
      try {
        results = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        if (!Array.isArray(results)) results = [];
      } catch { console.error("Parse failed"); continue; }

      // Process each incident's entities
      for (const result of results) {
        const idx = (result.incident_index || 1) - 1;
        if (idx < 0 || idx >= chunk.length) continue;
        const incident = chunk[idx];
        const entities: ExtractedEntity[] = result.entities || [];

        for (const ent of entities) {
          if (!ent.name || !ent.type) continue;

          const normalizedName = normalizeAlias(ent.name);
          if (!normalizedName) continue;

          // Check all aliases (including canonical name) against existing entities
          const allNames = [ent.name, ...(ent.aliases || [])];
          const allNormalized = allNames.map(normalizeAlias).filter(Boolean);

          let entityId: string | null = null;

          // Try to resolve against existing aliases
          for (const norm of allNormalized) {
            if (aliasMap.has(norm)) {
              entityId = aliasMap.get(norm)!;
              break;
            }
          }

          if (!entityId) {
            // Create new entity
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

            if (entErr) { console.error("Entity create error:", entErr); continue; }
            entityId = newEntity.id;
            totalEntitiesCreated++;

            // Insert all aliases
            for (const norm of allNormalized) {
              if (!aliasMap.has(norm)) {
                const originalAlias = allNames[allNormalized.indexOf(norm)] || norm;
                const { error: aliasErr } = await supabase
                  .from("entity_aliases")
                  .insert({
                    entity_id: entityId,
                    alias: originalAlias,
                    alias_normalized: norm,
                    source: incident.analyst || "entity-extraction",
                  });
                if (!aliasErr) aliasMap.set(norm, entityId);
              }
            }
          } else {
            // Add any new aliases to existing entity
            for (const norm of allNormalized) {
              if (!aliasMap.has(norm)) {
                const originalAlias = allNames[allNormalized.indexOf(norm)] || norm;
                await supabase.from("entity_aliases").insert({
                  entity_id: entityId, alias: originalAlias,
                  alias_normalized: norm, source: incident.analyst || "entity-extraction",
                }).then(({ error }) => { if (!error) aliasMap.set(norm, entityId!); });
              }
            }
          }

          // Link entity to incident
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

    console.log(`Entity extraction complete: ${totalEntitiesCreated} entities created, ${totalLinksCreated} links`);

    return new Response(JSON.stringify({
      success: true,
      processed: unprocessed.length,
      entities_created: totalEntitiesCreated,
      links_created: totalLinksCreated,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Entity extraction error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
