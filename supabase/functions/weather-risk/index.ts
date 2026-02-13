import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WeatherAlert {
  event: string;
  sender: string;
  description: string;
  start: number;
  end: number;
}

interface RegionWeather {
  regionId: string;
  regionName: string;
  country: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  alerts: WeatherAlert[];
  riskLevel: "low" | "moderate" | "high" | "severe";
  riskFactors: string[];
}

function assessRisk(
  temp: number,
  windSpeed: number,
  humidity: number,
  alerts: WeatherAlert[]
): { level: "low" | "moderate" | "high" | "severe"; factors: string[] } {
  const factors: string[] = [];

  if (alerts.length > 0) factors.push(`${alerts.length} active weather alert(s)`);
  if (temp > 45) factors.push("Extreme heat (>45°C)");
  else if (temp > 40) factors.push("Dangerous heat (>40°C)");
  if (temp < 0) factors.push("Freezing conditions");
  if (windSpeed > 20) factors.push("High winds (>20 m/s)");
  else if (windSpeed > 15) factors.push("Strong winds (>15 m/s)");
  if (humidity > 90) factors.push("Very high humidity (>90%)");
  if (humidity < 15) factors.push("Extreme dryness — fire risk");

  let level: "low" | "moderate" | "high" | "severe" = "low";
  if (alerts.length > 0) level = "high";
  if (factors.length >= 3 || alerts.length > 1) level = "severe";
  else if (factors.length >= 2) level = "high";
  else if (factors.length >= 1) level = "moderate";

  return { level, factors };
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
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OWM_KEY = Deno.env.get("OPENWEATHERMAP_API_KEY");
    if (!OWM_KEY) {
      return new Response(JSON.stringify({ error: "OpenWeatherMap API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's monitored regions
    const { data: regions, error: regErr } = await supabase
      .from("monitored_regions")
      .select("*")
      .eq("user_id", user.id);

    if (regErr) {
      return new Response(JSON.stringify({ error: regErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!regions || regions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, regions: [], message: "No monitored regions configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: RegionWeather[] = [];

    for (const region of regions) {
      const locationQuery = region.subdivision_label
        ? `${region.subdivision_label},${region.country_label}`
        : region.country_label;

      try {
        // Get coordinates via geocoding
        const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(locationQuery)}&limit=1&appid=${OWM_KEY}`;
        const geoRes = await fetch(geoUrl);
        if (!geoRes.ok) continue;
        const geoData = await geoRes.json();
        if (!geoData?.[0]) continue;

        const { lat, lon } = geoData[0];

        // Get weather + alerts via One Call (free tier uses weather API)
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OWM_KEY}`;
        const weatherRes = await fetch(weatherUrl);
        if (!weatherRes.ok) continue;
        const w = await weatherRes.json();

        // Try to get alerts from One Call 3.0 (may not be available on free tier)
        let alerts: WeatherAlert[] = [];
        try {
          const alertUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,daily&units=metric&appid=${OWM_KEY}`;
          const alertRes = await fetch(alertUrl);
          if (alertRes.ok) {
            const alertData = await alertRes.json();
            alerts = (alertData.alerts || []).map((a: any) => ({
              event: a.event,
              sender: a.sender_name,
              description: a.description?.slice(0, 200) || "",
              start: a.start,
              end: a.end,
            }));
          }
        } catch { /* free tier may not support One Call */ }

        const temp = w.main?.temp ?? 0;
        const windSpeed = w.wind?.speed ?? 0;
        const humidity = w.main?.humidity ?? 0;

        const { level, factors } = assessRisk(temp, windSpeed, humidity, alerts);

        results.push({
          regionId: region.id,
          regionName: region.subdivision_label
            ? `${region.country_label} — ${region.subdivision_label}`
            : region.country_label,
          country: region.country_label,
          temp,
          feelsLike: w.main?.feels_like ?? 0,
          humidity,
          windSpeed,
          description: w.weather?.[0]?.description || "Unknown",
          icon: w.weather?.[0]?.icon || "01d",
          alerts,
          riskLevel: level,
          riskFactors: factors,
        });
      } catch (err) {
        console.error(`Weather error for ${locationQuery}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, regions: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Weather risk error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
