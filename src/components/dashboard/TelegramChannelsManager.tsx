import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, MessageCircle, Loader2 } from "lucide-react";

interface TelegramChannel {
  id: string;
  username: string;
  label: string;
  enabled: boolean;
  created_at: string;
}

export function TelegramChannelsManager() {
  const [channels, setChannels] = useState<TelegramChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);

  async function fetchChannels() {
    const { data, error } = await supabase
      .from("telegram_channels")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) setChannels(data as TelegramChannel[]);
    if (error) console.error("Failed to fetch channels:", error);
    setLoading(false);
  }

  useEffect(() => { fetchChannels(); }, []);

  async function handleAdd() {
    if (!newUsername.trim() || !newLabel.trim()) {
      toast.error("Username and label are required");
      return;
    }
    const cleaned = newUsername.trim().replace(/^@/, "");
    if (!/^[a-zA-Z0-9_]{5,}$/.test(cleaned)) {
      toast.error("Invalid Telegram username format");
      return;
    }
    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("telegram_channels").insert({
      username: cleaned,
      label: newLabel.trim().slice(0, 100),
      created_by: user?.id || "",
    });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Channel already added" : error.message);
    } else {
      toast.success("Channel added");
      setNewUsername("");
      setNewLabel("");
      fetchChannels();
    }
    setAdding(false);
  }

  async function handleToggle(id: string, enabled: boolean) {
    const { error } = await supabase
      .from("telegram_channels")
      .update({ enabled })
      .eq("id", id);
    if (error) toast.error(error.message);
    else setChannels(prev => prev.map(c => c.id === id ? { ...c, enabled } : c));
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("telegram_channels").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      setChannels(prev => prev.filter(c => c.id !== id));
      toast.success("Channel removed");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono font-bold text-foreground flex items-center gap-2">
          <MessageCircle className="h-3.5 w-3.5 text-primary" />
          TELEGRAM CHANNELS
        </h3>
        <Badge variant="outline" className="text-[9px] font-mono">
          {channels.filter(c => c.enabled).length} active
        </Badge>
      </div>

      {/* Add new channel */}
      <Card className="p-3 bg-card border-border">
        <div className="flex gap-2">
          <Input
            placeholder="Label (e.g. Conflict News)"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            className="h-7 text-[10px] font-mono flex-[1]"
            maxLength={100}
          />
          <Input
            placeholder="@channel_username"
            value={newUsername}
            onChange={e => setNewUsername(e.target.value)}
            className="h-7 text-[10px] font-mono flex-[1]"
            maxLength={100}
          />
          <Button
            size="sm"
            className="h-7 text-[10px] font-mono"
            onClick={handleAdd}
            disabled={adding}
          >
            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
            Add
          </Button>
        </div>
      </Card>

      {/* Channel list */}
      <div className="space-y-1.5">
        {channels.map(channel => (
          <Card key={channel.id} className="p-2.5 bg-card border-border flex items-center gap-3">
            <Switch
              checked={channel.enabled}
              onCheckedChange={checked => handleToggle(channel.id, checked)}
              className="scale-75"
            />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono font-medium text-foreground truncate">
                {channel.label}
              </div>
              <div className="text-[9px] font-mono text-muted-foreground truncate">
                @{channel.username}
              </div>
            </div>
            <Badge
              variant={channel.enabled ? "default" : "secondary"}
              className="text-[8px] font-mono px-1.5"
            >
              {channel.enabled ? "ON" : "OFF"}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleDelete(channel.id)}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </Card>
        ))}
        {channels.length === 0 && (
          <p className="text-[10px] font-mono text-muted-foreground text-center py-4">
            No channels configured. Add a public channel above.
          </p>
        )}
      </div>
    </div>
  );
}
