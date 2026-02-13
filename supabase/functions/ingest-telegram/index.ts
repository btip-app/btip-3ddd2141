import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!BOT_TOKEN) {
    return new Response(
      JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 1. Fetch enabled channels
    const { data: channels, error: chErr } = await sb
      .from("telegram_channels")
      .select("*")
      .eq("enabled", true);

    if (chErr) throw chErr;
    if (!channels || channels.length === 0) {
      return new Response(
        JSON.stringify({ message: "No enabled Telegram channels configured", ingested: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalIngested = 0;
    const errors: string[] = [];

    for (const channel of channels) {
      try {
        // 2. Get recent messages from channel via Bot API
        // The bot must be added to the channel as a member
        const username = channel.username.replace(/^@/, "");
        
        // Use getUpdates with channel_post filtering isn't ideal;
        // Instead we use the chat history approach: get chat info then recent messages
        // First, resolve the channel by username
        const chatRes = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=@${username}`
        );
        const chatData = await chatRes.json();

        if (!chatData.ok) {
          errors.push(`Channel @${username}: ${chatData.description || "not found"}`);
          continue;
        }

        const chatId = chatData.result.id;

        // Fetch recent messages using getUpdates won't work for channels the bot reads passively.
        // We use forwardMessage trick or getChatHistory — but Bot API doesn't have getChatHistory.
        // The correct approach: use getUpdates which captures channel_post updates.
        // For a scheduled job, we need to poll getUpdates with an offset.
        
        // Alternative: use the undocumented but working approach of reading via web preview
        // For Bot API: the bot receives channel_post updates automatically if it's a member.
        // We'll use getUpdates and filter for this channel.

        // Fetch latest updates (up to 100)
        const updatesRes = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=100&allowed_updates=["channel_post"]`
        );
        const updatesData = await updatesRes.json();

        if (!updatesData.ok) {
          errors.push(`Updates fetch failed: ${updatesData.description}`);
          continue;
        }

        const posts = (updatesData.result || [])
          .filter((u: any) => u.channel_post && u.channel_post.chat.id === chatId)
          .map((u: any) => u.channel_post);

        if (posts.length === 0) continue;

        // Acknowledge processed updates
        const maxUpdateId = Math.max(...updatesData.result.map((u: any) => u.update_id));
        await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${maxUpdateId + 1}&limit=1`
        );

        // 3. Convert posts to incidents
        for (const post of posts) {
          const text = post.text || post.caption || "";
          if (!text || text.length < 20) continue; // Skip very short messages

          const messageId = `tg-${chatId}-${post.message_id}`;

          // Check for duplicates
          const { data: existing } = await sb
            .from("incidents")
            .select("id")
            .eq("title", messageId)
            .limit(1);

          if (existing && existing.length > 0) continue;

          // Determine severity from keywords
          const lowerText = text.toLowerCase();
          let severity = 3;
          let category = "social_media";
          
          if (/attack|killed|bomb|explo|terror|casualties/i.test(lowerText)) {
            severity = 5;
            category = "terrorism";
          } else if (/threat|warning|escalat|mobiliz|armed/i.test(lowerText)) {
            severity = 4;
            category = "political_violence";
          } else if (/protest|demonstrat|unrest|riot/i.test(lowerText)) {
            severity = 3;
            category = "civil_unrest";
          } else if (/disinformation|propaganda|fake.*news|narrative/i.test(lowerText)) {
            severity = 2;
            category = "disinformation";
          }

          const title = text.slice(0, 120).replace(/\n/g, " ");
          const summary = text.slice(0, 500);

          const { error: insErr } = await sb.from("incidents").insert({
            title: title,
            summary: summary,
            category,
            severity,
            confidence: 40, // Lower confidence for raw social media
            region: "Global",
            location: `Telegram: @${username}`,
            section: "socmint",
            status: "ai",
            sources: [`https://t.me/${username}/${post.message_id}`],
            analyst: "TELEGRAM-BOT",
          });

          if (insErr) {
            errors.push(`Insert error: ${insErr.message}`);
          } else {
            totalIngested++;
          }
        }
      } catch (channelErr) {
        errors.push(`@${channel.username}: ${String(channelErr)}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Telegram ingestion complete`,
        channels_processed: channels.length,
        ingested: totalIngested,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
