import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const OPENCAGE_API_KEY = Deno.env.get("OPENCAGE_API_KEY");
    if (!OPENCAGE_API_KEY) {
      return new Response(JSON.stringify({ error: "OpenCage API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate optional body
    let body: { limit?: number } = {};
    try { body = await req.json(); } catch { /* defaults */ }

    const rawLimit = Number(body.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 50;

    // Find incidents missing coordinates
    const { data: incidents, error: fetchErr } = await supabase
      .from("incidents")
      .select("id, location, country, subdivision")
      .is("lat", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (fetchErr) {
      console.error("Fetch incidents error:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!incidents || incidents.length === 0) {
      return new Response(
        JSON.stringify({ success: true, geocoded: 0, total: 0, message: "All incidents already have coordinates" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Geocoding ${incidents.length} incidents missing coordinates`);

    let geocoded = 0;
    let failed = 0;

    for (const inc of incidents) {
      // Build query: location + country for better accuracy
      const query = [inc.location, inc.subdivision, inc.country].filter(Boolean).join(", ");
      if (!query) { failed++; continue; }

      try {
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${OPENCAGE_API_KEY}&limit=1&no_annotations=1`;
        const res = await fetch(url);

        if (!res.ok) {
          console.error(`OpenCage error for "${query}": ${res.status}`);
          failed++;
          // Rate limit: OpenCage free tier = 1 req/sec
          await new Promise(r => setTimeout(r, 1100));
          continue;
        }

        const data = await res.json();
        const result = data.results?.[0];

        if (result?.geometry) {
          const { lat, lng } = result.geometry;
          const { error: updateErr } = await supabase
            .from("incidents")
            .update({ lat, lng })
            .eq("id", inc.id);

          if (updateErr) {
            console.error(`Update error for ${inc.id}:`, updateErr);
            failed++;
          } else {
            geocoded++;
          }
        } else {
          failed++;
        }

        // Respect rate limit
        await new Promise(r => setTimeout(r, 1100));
      } catch (err) {
        console.error(`Geocode error for "${query}":`, err);
        failed++;
      }
    }

    console.log(`Geocoding complete: ${geocoded} enriched, ${failed} failed`);

    return new Response(
      JSON.stringify({ success: true, total: incidents.length, geocoded, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Geocode incidents error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
