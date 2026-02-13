import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { mapDatabaseError } from "@/lib/errorMessages";
import { Plus, Trash2, Globe, Loader2 } from "lucide-react";

interface OsintSource {
  id: string;
  url: string;
  label: string;
  enabled: boolean;
  created_at: string;
}

export function OsintSourcesManager() {
  const [sources, setSources] = useState<OsintSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);

  async function fetchSources() {
    const { data, error } = await supabase
      .from("osint_sources")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) setSources(data as OsintSource[]);
    if (error) console.error("Failed to fetch sources:", error);
    setLoading(false);
  }

  useEffect(() => { fetchSources(); }, []);

  async function handleAdd() {
    if (!newUrl.trim() || !newLabel.trim()) {
      toast.error("URL and label are required");
      return;
    }
    try {
      new URL(newUrl.trim());
    } catch {
      toast.error("Invalid URL format");
      return;
    }
    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("osint_sources").insert({
      url: newUrl.trim(),
      label: newLabel.trim().slice(0, 100),
      created_by: user?.id || "",
    });
    if (error) {
      toast.error(mapDatabaseError(error));
    } else {
      toast.success("Source added");
      setNewUrl("");
      setNewLabel("");
      fetchSources();
    }
    setAdding(false);
  }

  async function handleToggle(id: string, enabled: boolean) {
    const { error } = await supabase
      .from("osint_sources")
      .update({ enabled })
      .eq("id", id);
    if (error) toast.error(mapDatabaseError(error));
    else setSources(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("osint_sources").delete().eq("id", id);
    if (error) toast.error(mapDatabaseError(error));
    else {
      setSources(prev => prev.filter(s => s.id !== id));
      toast.success("Source removed");
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
          <Globe className="h-3.5 w-3.5 text-primary" />
          <span className="acronym">OSINT</span> SOURCES
        </h3>
        <Badge variant="outline" className="text-[9px] font-mono">
          {sources.filter(s => s.enabled).length} active
        </Badge>
      </div>

      {/* Add new source */}
      <Card className="p-3 bg-card border-border">
        <div className="flex gap-2">
          <Input
            placeholder="Label (e.g. Reuters Security)"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            className="h-7 text-[10px] font-mono flex-[1]"
            maxLength={100}
          />
          <Input
            placeholder="https://example.com/security-feed"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            className="h-7 text-[10px] font-mono flex-[2]"
            maxLength={500}
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

      {/* Source list */}
      <div className="space-y-1.5">
        {sources.map(source => (
          <Card key={source.id} className="p-2.5 bg-card border-border flex items-center gap-3">
            <Switch
              checked={source.enabled}
              onCheckedChange={checked => handleToggle(source.id, checked)}
              className="scale-75"
            />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono font-medium text-foreground truncate">
                {source.label}
              </div>
              <div className="text-[9px] font-mono text-muted-foreground truncate">
                {source.url}
              </div>
            </div>
            <Badge
              variant={source.enabled ? "default" : "secondary"}
              className="text-[8px] font-mono px-1.5"
            >
              {source.enabled ? "ON" : "OFF"}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleDelete(source.id)}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </Card>
        ))}
        {sources.length === 0 && (
          <p className="text-[10px] font-mono text-muted-foreground text-center py-4">
            No sources configured. Add one above.
          </p>
        )}
      </div>
    </div>
  );
}
