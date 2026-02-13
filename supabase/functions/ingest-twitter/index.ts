import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Twitter OAuth 1.0a helper
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function generateNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function buildOAuthHeader(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): Promise<string> {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  // Combine oauth params and query params for signature base
  const allParams = { ...oauthParams, ...params };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys.map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`).join("&");

  const signatureBase = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;

  // HMAC-SHA1 using Web Crypto API
  const encoder = new TextEncoder();
  const keyData = encoder.encode(signingKey);
  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(signatureBase));
  const signatureBytes = btoa(String.fromCharCode(...new Uint8Array(sig)));
  oauthParams["oauth_signature"] = signatureBytes;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  return `OAuth ${headerParts}`;
}

// Keywords for security-related tweet searches
const SECURITY_KEYWORDS = [
  "security incident",
  "terror attack",
  "armed conflict",
  "civil unrest",
  "explosion reported",
  "shooting reported",
  "kidnapping",
  "cyber attack",
  "protest violence",
  "military operation",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const CONSUMER_KEY = Deno.env.get("TWITTER_CONSUMER_KEY");
  const CONSUMER_SECRET = Deno.env.get("TWITTER_CONSUMER_SECRET");
  const ACCESS_TOKEN = Deno.env.get("TWITTER_ACCESS_TOKEN");
  const ACCESS_TOKEN_SECRET = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!CONSUMER_KEY || !CONSUMER_SECRET || !ACCESS_TOKEN || !ACCESS_TOKEN_SECRET) {
    return new Response(
      JSON.stringify({ error: "Twitter API credentials not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    let totalIngested = 0;
    const errors: string[] = [];

    // Search for security-related tweets using recent search endpoint
    const query = SECURITY_KEYWORDS.slice(0, 5).map((k) => `"${k}"`).join(" OR ");
    const searchUrl = "https://api.x.com/2/tweets/search/recent";
    const queryParams: Record<string, string> = {
      query: `(${query}) -is:retweet lang:en`,
      max_results: "20",
      "tweet.fields": "created_at,author_id,geo,text",
    };

    const paramString = new URLSearchParams(queryParams).toString();
    const fullUrl = `${searchUrl}?${paramString}`;

    const authHeader = await buildOAuthHeader(
      "GET",
      searchUrl,
      queryParams,
      CONSUMER_KEY,
      CONSUMER_SECRET,
      ACCESS_TOKEN,
      ACCESS_TOKEN_SECRET
    );

    console.log("Fetching tweets from Twitter/X API...");

    const twitterRes = await fetch(fullUrl, {
      headers: { Authorization: authHeader },
    });

    if (!twitterRes.ok) {
      const errBody = await twitterRes.text();
      console.error(`Twitter API error [${twitterRes.status}]:`, errBody);
      return new Response(
        JSON.stringify({ error: `Twitter API failed: ${twitterRes.status}`, details: errBody }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const twitterData = await twitterRes.json();
    const tweets = twitterData.data || [];

    console.log(`Fetched ${tweets.length} tweets`);

    // Dedup against existing incidents
    const { data: existing } = await sb
      .from("incidents")
      .select("title")
      .eq("analyst", "twitter-socmint")
      .gte("datetime", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .limit(200);

    const existingTitles = new Set((existing || []).map((i: any) => i.title.toLowerCase()));

    for (const tweet of tweets) {
      const text: string = tweet.text || "";
      if (text.length < 30) continue;

      const title = text.slice(0, 120).replace(/\n/g, " ").replace(/https?:\/\/\S+/g, "").trim();
      if (!title || existingTitles.has(title.toLowerCase())) continue;

      // Keyword-based severity scoring
      const lower = text.toLowerCase();
      let severity = 3;
      let category = "social_media";

      if (/attack|killed|bomb|explo|terror|casualties|mass shooting/i.test(lower)) {
        severity = 5;
        category = "terrorism";
      } else if (/threat|warning|escalat|armed|military|strike/i.test(lower)) {
        severity = 4;
        category = "armed-conflict";
      } else if (/protest|demonstrat|unrest|riot|clashes/i.test(lower)) {
        severity = 3;
        category = "civil-unrest";
      } else if (/cyber|hack|breach|ransomware|ddos/i.test(lower)) {
        severity = 3;
        category = "cyber-attack";
      } else if (/kidnap|abduct|hostage/i.test(lower)) {
        severity = 4;
        category = "kidnapping";
      }

      const { error: insErr } = await sb.from("incidents").insert({
        title,
        summary: text.slice(0, 500),
        category,
        severity,
        confidence: 35, // Lower confidence for raw tweets
        region: "Global",
        location: "Twitter/X",
        section: "socmint",
        status: "ai",
        sources: [`https://x.com/i/status/${tweet.id}`],
        analyst: "twitter-socmint",
        datetime: tweet.created_at || new Date().toISOString(),
      });

      if (insErr) {
        errors.push(`Insert error: ${insErr.message}`);
      } else {
        totalIngested++;
        existingTitles.add(title.toLowerCase());
      }
    }

    console.log(`Twitter ingestion complete: ${totalIngested} incidents inserted`);

    return new Response(
      JSON.stringify({
        message: "Twitter/X ingestion complete",
        tweets_fetched: tweets.length,
        ingested: totalIngested,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Twitter ingestion error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
