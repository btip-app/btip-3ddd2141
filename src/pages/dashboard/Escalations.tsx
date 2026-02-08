import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Clock, Eye } from "lucide-react";

interface Escalation {
  id: string;
  incident_id: string;
  incident_title: string;
  priority: string;
  assigned_to: string;
  notes: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const DIRECTOR_LABELS: Record<string, string> = {
  "dir-security": "Chief Security Officer",
  "dir-ops": "Director of Operations",
  "dir-regional": "Regional Security Director",
  "dir-intel": "Head of Intelligence",
};

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-destructive text-destructive-foreground",
  high: "bg-orange-600 text-white",
  routine: "bg-yellow-600 text-black",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-destructive/20 text-destructive border-destructive/50",
  acknowledged: "bg-blue-600/20 text-blue-400 border-blue-600/50",
  resolved: "bg-emerald-600/20 text-emerald-400 border-emerald-600/50",
};

export default function Escalations() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchEscalations = async () => {
    setLoading(true);
    const query = supabase
      .from("escalations")
      .select("*")
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch escalations:", error);
      toast.error("Failed to load escalations.");
    } else {
      setEscalations((data as Escalation[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEscalations();

    const channel = supabase
      .channel("escalations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "escalations" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setEscalations((prev) => [payload.new as Escalation, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setEscalations((prev) =>
              prev.map((e) =>
                e.id === (payload.new as Escalation).id
                  ? (payload.new as Escalation)
                  : e
              )
            );
          } else if (payload.eventType === "DELETE") {
            setEscalations((prev) =>
              prev.filter((e) => e.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("escalations")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.error("Update error:", error);
      toast.error("Failed to update status.");
      return;
    }

    toast.success(`Escalation marked as ${newStatus}.`);
    setEscalations((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e))
    );
  };

  const filtered =
    filter === "all"
      ? escalations
      : escalations.filter((e) => e.status === filter);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-sm font-mono font-bold text-foreground tracking-wide">
              ESCALATION MANAGEMENT
            </h1>
            <p className="text-[10px] font-mono text-muted-foreground mt-1">
              {escalations.length} total •{" "}
              {escalations.filter((e) => e.status === "open").length} open
            </p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[160px] font-mono text-xs bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-mono text-xs">
                All Statuses
              </SelectItem>
              <SelectItem value="open" className="font-mono text-xs">
                Open
              </SelectItem>
              <SelectItem value="acknowledged" className="font-mono text-xs">
                Acknowledged
              </SelectItem>
              <SelectItem value="resolved" className="font-mono text-xs">
                Resolved
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator className="mb-4" />

        {/* List */}
        {loading ? (
          <div className="text-xs font-mono text-muted-foreground text-center py-12">
            Loading escalations…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <CheckCircle className="h-8 w-8 text-muted-foreground mx-auto" />
            <div className="text-xs font-mono text-muted-foreground">
              {filter === "all"
                ? "No escalations found."
                : `No ${filter} escalations.`}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((esc) => (
              <EscalationRow
                key={esc.id}
                escalation={esc}
                onUpdateStatus={updateStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EscalationRow({
  escalation,
  onUpdateStatus,
}: {
  escalation: Escalation;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  const isOpen = escalation.status === "open";
  const isAcknowledged = escalation.status === "acknowledged";

  return (
    <div className="bg-card border border-border rounded p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono text-muted-foreground mb-1">
            ID-{escalation.incident_id} •{" "}
            {new Date(escalation.created_at).toLocaleString()}
          </div>
          <h3 className="text-xs font-mono font-medium text-foreground truncate">
            {escalation.incident_title}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge
            className={`${PRIORITY_STYLES[escalation.priority] || "bg-muted"} text-[10px] font-mono`}
          >
            {escalation.priority.toUpperCase()}
          </Badge>
          <Badge
            variant="outline"
            className={`${STATUS_STYLES[escalation.status] || ""} text-[10px] font-mono`}
          >
            {escalation.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
        <span>
          Assigned:{" "}
          <span className="text-foreground">
            {DIRECTOR_LABELS[escalation.assigned_to] || escalation.assigned_to}
          </span>
        </span>
      </div>

      {/* Notes */}
      {escalation.notes && (
        <div className="bg-secondary/30 rounded p-2.5 text-[10px] font-mono text-foreground leading-relaxed">
          {escalation.notes}
        </div>
      )}

      {/* Actions */}
      {(isOpen || isAcknowledged) && (
        <div className="flex gap-2 pt-1">
          {isOpen && (
            <button
              onClick={() => onUpdateStatus(escalation.id, "acknowledged")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[10px] font-mono rounded border border-blue-600/30 cursor-pointer transition-colors"
            >
              <Eye className="h-3 w-3" />
              ACKNOWLEDGE
            </button>
          )}
          {(isOpen || isAcknowledged) && (
            <button
              onClick={() => onUpdateStatus(escalation.id, "resolved")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-[10px] font-mono rounded border border-emerald-600/30 cursor-pointer transition-colors"
            >
              <CheckCircle className="h-3 w-3" />
              RESOLVE
            </button>
          )}
        </div>
      )}
    </div>
  );
}
