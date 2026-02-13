import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function generateNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

async function buildOAuthHeader(method: string, url: string, params: Record<string, string>, ck: string, cs: string, at: string, ats: string): Promise<string> {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: ck, oauth_nonce: generateNonce(), oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(), oauth_token: at, oauth_version: "1.0",
  };
  const allParams = { ...oauthParams, ...params };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys.map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`).join("&");
  const signatureBase = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(cs)}&${percentEncode(ats)}`;
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(signingKey), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(signatureBase));
  oauthParams["oauth_signature"] = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `OAuth ${Object.keys(oauthParams).sort().map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`).join(", ")}`;
}

async function contentHash(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const SECURITY_KEYWORDS = ["security incident", "terror attack", "armed conflict", "civil unrest", "explosion reported", "shooting reported", "kidnapping", "cyber attack", "protest violence", "military operation"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth guard: require admin or analyst role
  const { requireAdminOrAnalyst } = await import("../_shared/auth.ts");
  const authResult = await requireAdminOrAnalyst(req);
  if (!authResult.authorized) return authResult.response;

  const CK = Deno.env.get("TWITTER_CONSUMER_KEY"), CS = Deno.env.get("TWITTER_CONSUMER_SECRET");
  const AT = Deno.env.get("TWITTER_ACCESS_TOKEN"), ATS = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (!CK || !CS || !AT || !ATS) return new Response(JSON.stringify({ error: "Twitter API credentials not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    let totalIngested = 0, totalStaged = 0;
    const errors: string[] = [];

    const query = SECURITY_KEYWORDS.slice(0, 5).map((k) => `"${k}"`).join(" OR ");
    const searchUrl = "https://api.x.com/2/tweets/search/recent";
    const queryParams: Record<string, string> = { query: `(${query}) -is:retweet lang:en`, max_results: "20", "tweet.fields": "created_at,author_id,geo,text" };
    const fullUrl = `${searchUrl}?${new URLSearchParams(queryParams).toString()}`;
    const authHeader = await buildOAuthHeader("GET", searchUrl, queryParams, CK, CS, AT, ATS);

    const twitterRes = await fetch(fullUrl, { headers: { Authorization: authHeader } });
    if (!twitterRes.ok) { const errBody = await twitterRes.text(); return new Response(JSON.stringify({ error: `Twitter API failed: ${twitterRes.status}`, details: errBody }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    const tweets = (await twitterRes.json()).data || [];
    console.log(`Fetched ${tweets.length} tweets`);

    for (const tweet of tweets) {
      const text: string = tweet.text || "";
      if (text.length < 30) continue;

      const title = text.slice(0, 120).replace(/\n/g, " ").replace(/https?:\/\/\S+/g, "").trim();
      if (!title) continue;

      const hash = await contentHash(`tw-${tweet.id}-${title}`);
      const { data: existingRaw } = await sb.from("raw_events").select("id").eq("content_hash", hash).limit(1);
      if (existingRaw && existingRaw.length > 0) continue;

      const lower = text.toLowerCase();
      let severity = 3, category = "social_media";
      if (/attack|killed|bomb|explo|terror|casualties|mass shooting/i.test(lower)) { severity = 5; category = "terrorism"; }
      else if (/threat|warning|escalat|armed|military|strike/i.test(lower)) { severity = 4; category = "armed-conflict"; }
      else if (/protest|demonstrat|unrest|riot|clashes/i.test(lower)) { severity = 3; category = "civil-unrest"; }
      else if (/cyber|hack|breach|ransomware|ddos/i.test(lower)) { severity = 3; category = "cyber-attack"; }
      else if (/kidnap|abduct|hostage/i.test(lower)) { severity = 4; category = "kidnapping"; }

      // Stage raw event
      const { error: rawErr } = await sb.from("raw_events").insert({
        source_type: "twitter", source_label: "Twitter/X",
        source_url: `https://x.com/i/status/${tweet.id}`,
        raw_payload: tweet, content_hash: hash, status: "raw",
      });
      if (rawErr) { errors.push(`Raw: ${rawErr.message}`); continue; }
      totalStaged++;

      // Normalize
      const { data: inserted, error: insErr } = await sb.from("incidents").insert({
        title, summary: text.slice(0, 500), category, severity, confidence: 35,
        region: "Global", location: "Twitter/X", section: "socmint", status: "ai",
        sources: [`https://x.com/i/status/${tweet.id}`], analyst: "twitter-socmint",
        datetime: tweet.created_at || new Date().toISOString(),
      }).select("id");

      if (insErr) { errors.push(`Insert: ${insErr.message}`); }
      else {
        totalIngested++;
        if (inserted?.[0]?.id) await sb.from("raw_events").update({ status: "normalized", incident_id: inserted[0].id, normalized_at: new Date().toISOString() }).eq("content_hash", hash);
      }
    }

    return new Response(JSON.stringify({ message: "Twitter/X ingestion complete", tweets_fetched: tweets.length, staged: totalStaged, ingested: totalIngested, errors: errors.length > 0 ? errors : undefined }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Twitter error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
