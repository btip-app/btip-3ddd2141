import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import EscalateModal from "@/components/dashboard/EscalateModal";
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  FileText,
  Shield,
  AlertTriangle,
  ExternalLink,
  Printer,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

type Incident = Tables<"incidents">;
type IncidentStatus = Incident["status"];

function getSeverityColor(severity: number) {
  switch (severity) {
    case 5: return "bg-destructive text-destructive-foreground";
    case 4: return "bg-orange-600 text-white";
    case 3: return "bg-amber-600 text-white";
    case 2: return "bg-yellow-600 text-black";
    default: return "bg-muted text-muted-foreground";
  }
}

function getSeverityLabel(severity: number) {
  switch (severity) {
    case 5: return "CRITICAL";
    case 4: return "HIGH";
    case 3: return "MODERATE";
    case 2: return "LOW";
    default: return "INFO";
  }
}

function getStatusColor(status: IncidentStatus) {
  switch (status) {
    case "confirmed": return "bg-emerald-600/20 text-emerald-400 border-emerald-600/50";
    case "reviewed": return "bg-blue-600/20 text-blue-400 border-blue-600/50";
    case "ai": return "bg-purple-600/20 text-purple-400 border-purple-600/50";
  }
}

function getStatusLabel(status: IncidentStatus) {
  switch (status) {
    case "confirmed": return "CONFIRMED";
    case "reviewed": return "REVIEWED";
    case "ai": return "AI";
  }
}

function getRecommendedActions(incident: Incident): string[] {
  const base: string[] = [];
  if (incident.severity >= 4) {
    base.push("Notify regional security director immediately");
    base.push("Activate contingency travel protocols for affected area");
  }
  if (incident.severity >= 3) {
    base.push("Brief operations teams on updated threat posture");
    base.push("Review asset exposure within 50 km radius");
  }
  if (incident.status === "ai") {
    base.push("Assign analyst for manual validation");
  }
  if (incident.category === "kidnapping") {
    base.push("Issue travel advisory for expatriate personnel");
  }
  if (incident.category === "piracy") {
    base.push("Coordinate with maritime security escorts");
  }
  if (incident.category === "cyber") {
    base.push("Activate incident response team and isolate affected systems");
  }
  base.push("Continue monitoring for escalation indicators");
  return base;
}

export default function IncidentReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function fetchIncident() {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("id", id)
        .single();
      if (data) setIncident(data);
      if (error) console.error("Failed to fetch incident:", error.message);
      setLoading(false);
    }
    fetchIncident();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto" />
          <div className="text-sm font-mono text-muted-foreground">Incident not found</div>
          <button onClick={() => navigate(-1)} className="text-xs font-mono text-primary hover:underline">← Go back</button>
        </div>
      </div>
    );
  }

  const actions = getRecommendedActions(incident);

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto print-report">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 no-print">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <ArrowLeft className="h-3.5 w-3.5" /> BACK
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 border border-border rounded cursor-pointer transition-colors">
          <Printer className="h-3.5 w-3.5" /> EXPORT PDF
        </button>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="text-[10px] font-mono text-muted-foreground mb-2">
          INCIDENT REPORT • ID-{incident.id.slice(0, 8)} • {incident.category.toUpperCase()} • Generated {new Date().toLocaleDateString()}
        </div>
        <h1 className="text-lg font-mono font-bold text-foreground mb-3">{incident.title}</h1>
        <div className="flex items-center gap-2">
          <Badge className={`${getSeverityColor(incident.severity)} text-[10px] font-mono`}>{getSeverityLabel(incident.severity)}</Badge>
          <Badge variant="outline" className={`${getStatusColor(incident.status)} text-[10px] font-mono`}>{getStatusLabel(incident.status)}</Badge>
          <Badge variant="outline" className="text-[10px] font-mono border-muted-foreground/30">{incident.confidence}% CONFIDENCE</Badge>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetaField icon={<MapPin className="h-3.5 w-3.5" />} label="Location" value={incident.location} />
        <MetaField icon={<Clock className="h-3.5 w-3.5" />} label="Timestamp" value={format(new Date(incident.datetime), "yyyy-MM-dd HH:mm")} />
        <MetaField icon={<User className="h-3.5 w-3.5" />} label="Analyst" value={incident.analyst || "Unassigned"} />
        <MetaField icon={<Shield className="h-3.5 w-3.5" />} label="Region" value={incident.region ? incident.region.replace("-", " ").replace(/\b\w/g, c => c.toUpperCase()) : "—"} />
      </div>
      {incident.lat != null && incident.lng != null && (
        <div className="text-[10px] font-mono text-muted-foreground mb-6">
          COORDINATES: {Number(incident.lat).toFixed(4)}, {Number(incident.lng).toFixed(4)}
        </div>
      )}

      <Separator className="mb-6" />

      {/* Intelligence Summary */}
      <section className="mb-6">
        <SectionHeader icon={<FileText className="h-3.5 w-3.5" />} label="Intelligence Summary" />
        <div className="bg-secondary/30 border border-border rounded p-4">
          <p className="text-xs font-mono text-foreground leading-relaxed">
            {incident.summary || "No intelligence summary available for this incident."}
          </p>
        </div>
      </section>

      {/* Sources */}
      <section className="mb-6">
        <SectionHeader icon={<ExternalLink className="h-3.5 w-3.5" />} label="Sources" />
        <div className="bg-secondary/30 border border-border rounded p-4 space-y-1.5">
          {incident.sources && incident.sources.length > 0 ? (
            incident.sources.map((source, idx) => (
              <div key={idx} className="text-xs font-mono text-foreground flex items-center gap-2">
                <span className="text-muted-foreground">•</span> {source}
              </div>
            ))
          ) : (
            <div className="text-xs font-mono text-muted-foreground">No sources listed</div>
          )}
        </div>
      </section>

      {/* Recommended Actions */}
      <section className="mb-6">
        <SectionHeader icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Recommended Actions" />
        <div className="bg-secondary/30 border border-border rounded p-4 space-y-2">
          {actions.map((action, idx) => (
            <div key={idx} className="text-xs font-mono text-foreground flex items-start gap-2">
              <span className="text-primary font-bold mt-px">{idx + 1}.</span> {action}
            </div>
          ))}
        </div>
      </section>

      <Separator className="mb-6" />

      {/* Footer actions */}
      <div className="flex gap-3 pb-8 no-print">
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-[10px] font-mono rounded border border-border cursor-pointer transition-colors">← BACK TO DASHBOARD</button>
        <button onClick={() => setEscalateOpen(true)} className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-mono rounded border border-primary/30 cursor-pointer transition-colors">ESCALATE INCIDENT</button>
      </div>

      {/* Print footer */}
      <div className="hidden print-only pb-4 border-t border-border pt-4 mt-8">
        <div className="text-[9px] font-mono text-muted-foreground text-center">Bastion Intelligence CONFIDENTIAL • Generated {new Date().toISOString()} • For authorized personnel only</div>
      </div>
      <EscalateModal open={escalateOpen} onOpenChange={setEscalateOpen} incidentId={incident.id} incidentTitle={incident.title} />
    </div>
  );
}

function MetaField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase">{label}</div>
      <div className="flex items-center gap-1.5 text-xs font-mono text-foreground">{icon}{value}</div>
    </div>
  );
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-primary">{icon}</span>
      <h2 className="text-xs font-mono font-bold text-foreground uppercase">{label}</h2>
    </div>
  );
}
