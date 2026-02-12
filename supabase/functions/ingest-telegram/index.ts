import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function contentHash(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (!BOT_TOKEN) return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { data: channels, error: chErr } = await sb.from("telegram_channels").select("*").eq("enabled", true);
    if (chErr) throw chErr;
    if (!channels || channels.length === 0) return new Response(JSON.stringify({ message: "No enabled Telegram channels", ingested: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let totalIngested = 0;
    let totalStaged = 0;
    const errors: string[] = [];

    for (const channel of channels) {
      try {
        const username = channel.username.replace(/^@/, "");
        const chatRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=@${username}`);
        const chatData = await chatRes.json();
        if (!chatData.ok) { errors.push(`@${username}: ${chatData.description || "not found"}`); continue; }

        const chatId = chatData.result.id;
        const updatesRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=100&allowed_updates=["channel_post"]`);
        const updatesData = await updatesRes.json();
        if (!updatesData.ok) { errors.push(`Updates failed: ${updatesData.description}`); continue; }

        const posts = (updatesData.result || [])
          .filter((u: any) => u.channel_post && u.channel_post.chat.id === chatId)
          .map((u: any) => u.channel_post);

        if (posts.length === 0) continue;

        const maxUpdateId = Math.max(...updatesData.result.map((u: any) => u.update_id));
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${maxUpdateId + 1}&limit=1`);

        for (const post of posts) {
          const text = post.text || post.caption || "";
          if (!text || text.length < 20) continue;

          const hash = await contentHash(`tg-${chatId}-${post.message_id}-${text.slice(0, 100)}`);

          // Check raw_events dedup
          const { data: existingRaw } = await sb.from("raw_events").select("id").eq("content_hash", hash).limit(1);
          if (existingRaw && existingRaw.length > 0) continue;

          const lowerText = text.toLowerCase();
          let severity = 3;
          let category = "social_media";
          if (/attack|killed|bomb|explo|terror|casualties/i.test(lowerText)) { severity = 5; category = "terrorism"; }
          else if (/threat|warning|escalat|mobiliz|armed/i.test(lowerText)) { severity = 4; category = "political_violence"; }
          else if (/protest|demonstrat|unrest|riot/i.test(lowerText)) { severity = 3; category = "civil-unrest"; }
          else if (/disinformation|propaganda|fake.*news/i.test(lowerText)) { severity = 2; category = "disinformation"; }

          const title = text.slice(0, 120).replace(/\n/g, " ");
          const sourceUrl = `https://t.me/${username}/${post.message_id}`;

          // Stage raw event
          const { error: rawErr } = await sb.from("raw_events").insert({
            source_type: "telegram",
            source_label: `Telegram: @${username}`,
            source_url: sourceUrl,
            raw_payload: { text, message_id: post.message_id, chat_id: chatId, date: post.date },
            content_hash: hash,
            status: "raw",
          });
          if (rawErr) { errors.push(`Raw insert: ${rawErr.message}`); continue; }
          totalStaged++;

          // Normalize to incident
          const { data: inserted, error: insErr } = await sb.from("incidents").insert({
            title, summary: text.slice(0, 500), category, severity,
            confidence: 40, region: "Global", location: `Telegram: @${username}`,
            section: "socmint", status: "ai", sources: [sourceUrl], analyst: "TELEGRAM-BOT",
          }).select("id");

          if (insErr) { errors.push(`Incident insert: ${insErr.message}`); }
          else {
            totalIngested++;
            // Link raw event
            if (inserted?.[0]?.id) {
              await sb.from("raw_events").update({ status: "normalized", incident_id: inserted[0].id, normalized_at: new Date().toISOString() }).eq("content_hash", hash);
            }
          }
        }
      } catch (channelErr) { errors.push(`@${channel.username}: ${String(channelErr)}`); }
    }

    return new Response(JSON.stringify({
      message: "Telegram ingestion complete", channels_processed: channels.length,
      staged: totalStaged, ingested: totalIngested, errors: errors.length > 0 ? errors : undefined,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
