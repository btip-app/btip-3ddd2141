import { useState, useMemo } from "react";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useIncidents, type Incident } from "@/hooks/useIncidents";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMonitoredRegions } from "@/hooks/useMonitoredRegions";
import { OsintSourcesManager } from "@/components/dashboard/OsintSourcesManager";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  Clock,
  Eye,
  MapPin,
  Radio,
  Route,
  Shield,
  Building2,
  Trash2,
  Loader2,
  Download,
  MessageSquare,
  Globe,
  Database,
  Newspaper,
} from "lucide-react";
import { format } from "date-fns";

// --- Types ---

type AlertStatus = "new" | "acknowledged" | "muted" | "snoozed";
type AlertType = "proximity" | "severity_increase" | "new_incident" | "route_threat";

interface Alert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  region: string;
  severity: number;
  timestamp: string;
  status: AlertStatus;
  category: string;
}

interface WatchItem {
  id: string;
  name: string;
  type: "region" | "asset" | "route";
  addedAt: string;
  incidentCount: number;
}

// --- Helpers ---

function mapIncidentToAlert(inc: Incident): Alert {
  let type: AlertType = "new_incident";
  if (inc.severity >= 5) type = "severity_increase";
  else if (inc.category?.toLowerCase().includes("route") || inc.category?.toLowerCase().includes("transport")) type = "route_threat";
  else if (inc.severity >= 4) type = "proximity";

  return {
    id: inc.id,
    type,
    title: inc.title,
    description: inc.summary || `${inc.category} incident in ${inc.location}. Severity ${inc.severity}/5.`,
    region: inc.country || inc.region || "Unknown",
    severity: inc.severity,
    timestamp: format(new Date(inc.datetime), "yyyy-MM-dd HH:mm"),
    status: "new",
    category: inc.category,
  };
}

const ALERT_TYPE_META: Record<AlertType, { label: string; icon: typeof AlertTriangle }> = {
  proximity: { label: "PROXIMITY", icon: Radio },
  severity_increase: { label: "ESCALATION", icon: AlertTriangle },
  new_incident: { label: "NEW INCIDENT", icon: Bell },
  route_threat: { label: "ROUTE THREAT", icon: Route },
};

const STATUS_META: Record<AlertStatus, { label: string; className: string }> = {
  new: { label: "NEW", className: "bg-destructive text-destructive-foreground" },
  acknowledged: { label: "ACK", className: "bg-primary/20 text-primary" },
  muted: { label: "MUTED", className: "bg-muted text-muted-foreground" },
  snoozed: { label: "SNOOZED", className: "bg-accent/20 text-accent" },
};

function getSeverityIndicator(severity: number) {
  switch (severity) {
    case 5: return { label: "CRITICAL", className: "bg-destructive text-destructive-foreground" };
    case 4: return { label: "HIGH", className: "bg-orange-600 text-white" };
    case 3: return { label: "MODERATE", className: "bg-amber-600 text-white" };
    case 2: return { label: "LOW", className: "bg-yellow-600 text-black" };
    default: return { label: "INFO", className: "bg-muted text-muted-foreground" };
  }
}

const WATCHLIST_TYPE_ICON: Record<string, typeof MapPin> = {
  region: MapPin,
  asset: Building2,
  route: Route,
};

// --- Component ---

export default function Alerts() {
  const { incidents, loading } = useIncidents();
  const { regions } = useMonitoredRegions();
  const { log: auditLog } = useAuditLog();

  // Local overrides for alert status (id -> status)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, AlertStatus>>({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [ingesting, setIngesting] = useState(false);
  const [ingestingReddit, setIngestingReddit] = useState(false);
  const [ingestingMeta, setIngestingMeta] = useState(false);
  const [ingestingGdelt, setIngestingGdelt] = useState(false);
  const [ingestingAcled, setIngestingAcled] = useState(false);

  async function handleIngest() {
    setIngesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ingest-incidents", {
        body: {},
      });
      if (error) throw error;
      toast.success(`Ingested ${data.inserted} new incidents (${data.duplicatesSkipped} duplicates skipped)`);
      auditLog("INGEST_RUN", `Scraped ${data.scraped} sources, inserted ${data.inserted} incidents`);
    } catch (e: any) {
      console.error("Ingest error:", e);
      toast.error(e.message || "Ingestion failed");
    } finally {
      setIngesting(false);
    }
  }

  async function handleIngestReddit() {
    setIngestingReddit(true);
    try {
      const { data, error } = await supabase.functions.invoke("ingest-reddit", {
        body: {},
      });
      if (error) throw error;
      toast.success(`Reddit SOCMINT: ${data.inserted} new incidents from ${data.postsFetched} posts (${data.duplicatesSkipped} duplicates skipped)`);
      auditLog("SOCMINT_REDDIT", `Scraped ${data.subredditsScraped} subreddits, inserted ${data.inserted} incidents`);
    } catch (e: any) {
      console.error("Reddit ingest error:", e);
      toast.error(e.message || "Reddit ingestion failed");
    } finally {
      setIngestingReddit(false);
    }
  }

  async function handleIngestMeta() {
    setIngestingMeta(true);
    try {
      const { data, error } = await supabase.functions.invoke("ingest-meta", {
        body: {},
      });
      if (error) throw error;
      toast.success(`Meta SOCMINT: ${data.inserted} new incidents from ${data.targetsScraped} pages (${data.duplicatesSkipped} duplicates skipped)`);
      auditLog("SOCMINT_META", `Scraped ${data.targetsScraped}/${data.totalTargets} targets, inserted ${data.inserted} incidents`);
    } catch (e: any) {
      console.error("Meta ingest error:", e);
      toast.error(e.message || "Meta ingestion failed");
    } finally {
      setIngestingMeta(false);
    }
  }

  async function handleIngestGdelt() {
    setIngestingGdelt(true);
    try {
      const { data, error } = await supabase.functions.invoke("ingest-gdelt", {
        body: {},
      });
      if (error) throw error;
      toast.success(`GDELT: ${data.inserted} new incidents from ${data.fetched} articles (${data.duplicatesSkipped} duplicates skipped)`);
      auditLog("INGEST_GDELT", `Fetched ${data.fetched} articles, inserted ${data.inserted} incidents`);
    } catch (e: any) {
      console.error("GDELT ingest error:", e);
      toast.error(e.message || "GDELT ingestion failed");
    } finally {
      setIngestingGdelt(false);
    }
  }

  async function handleIngestAcled() {
    setIngestingAcled(true);
    try {
      const { data, error } = await supabase.functions.invoke("ingest-acled", {
        body: {},
      });
      if (error) throw error;
      toast.success(`ACLED: ${data.inserted} new incidents from ${data.fetched} events (${data.duplicatesSkipped} duplicates skipped)`);
      auditLog("INGEST_ACLED", `Fetched ${data.fetched} events, inserted ${data.inserted} incidents`);
    } catch (e: any) {
      console.error("ACLED ingest error:", e);
      toast.error(e.message || "ACLED ingestion failed");
    } finally {
      setIngestingAcled(false);
    }
  }

  // Derive alerts from live incidents
  const alerts = useMemo(() => {
    return incidents.map(inc => {
      const alert = mapIncidentToAlert(inc);
      if (statusOverrides[alert.id]) {
        alert.status = statusOverrides[alert.id];
      }
      return alert;
    });
  }, [incidents, statusOverrides]);

  // Build watchlist from monitored regions with incident counts
  const watchlist: WatchItem[] = useMemo(() => {
    return regions.map(r => ({
      id: r.id,
      name: r.subdivisionLabel ? `${r.countryLabel} — ${r.subdivisionLabel}` : r.countryLabel,
      type: "region" as const,
      addedAt: "—",
      incidentCount: incidents.filter(i =>
        i.region === r.region || i.country === r.country ||
        (r.subdivision && i.subdivision === r.subdivision)
      ).length,
    }));
  }, [regions, incidents]);

  const filteredAlerts = alerts.filter(a => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    return true;
  });

  const newCount = alerts.filter(a => a.status === "new").length;

  function handleAcknowledge(id: string) {
    const alert = alerts.find(a => a.id === id);
    setStatusOverrides(prev => ({ ...prev, [id]: "acknowledged" }));
    auditLog("ALERT_ACK", alert?.title ?? id);
  }

  function handleMute(id: string) {
    const alert = alerts.find(a => a.id === id);
    setStatusOverrides(prev => ({ ...prev, [id]: "muted" }));
    auditLog("ALERT_MUTE", alert?.title ?? id);
  }

  function handleSnooze(id: string) {
    const alert = alerts.find(a => a.id === id);
    setStatusOverrides(prev => ({ ...prev, [id]: "snoozed" }));
    auditLog("ALERT_SNOOZE", alert?.title ?? id);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-mono font-bold text-foreground">Alerts Center</h1>
          <p className="text-muted-foreground text-[10px] font-mono">
            {alerts.length} total alerts • {newCount} unacknowledged • Real-time
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-mono h-7"
            onClick={handleIngest}
            disabled={ingesting || ingestingReddit || ingestingMeta || ingestingGdelt || ingestingAcled}
          >
            {ingesting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
            {ingesting ? "Ingesting…" : "Ingest OSINT"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-mono h-7"
            onClick={handleIngestGdelt}
            disabled={ingesting || ingestingReddit || ingestingMeta || ingestingGdelt || ingestingAcled}
          >
            {ingestingGdelt ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Newspaper className="h-3 w-3 mr-1" />}
            {ingestingGdelt ? "Fetching…" : "GDELT"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-mono h-7"
            onClick={handleIngestAcled}
            disabled={ingesting || ingestingReddit || ingestingMeta || ingestingGdelt || ingestingAcled}
          >
            {ingestingAcled ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Database className="h-3 w-3 mr-1" />}
            {ingestingAcled ? "Fetching…" : "ACLED"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-mono h-7"
            onClick={handleIngestReddit}
            disabled={ingesting || ingestingReddit || ingestingMeta || ingestingGdelt || ingestingAcled}
          >
            {ingestingReddit ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <MessageSquare className="h-3 w-3 mr-1" />}
            {ingestingReddit ? "Scanning…" : "Reddit"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-mono h-7"
            onClick={handleIngestMeta}
            disabled={ingesting || ingestingReddit || ingestingMeta || ingestingGdelt || ingestingAcled}
          >
            {ingestingMeta ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Globe className="h-3 w-3 mr-1" />}
            {ingestingMeta ? "Scraping…" : "Meta"}
          </Button>
          <Badge variant="outline" className="text-[10px] font-mono">
            <Radio className="h-3 w-3 mr-1 text-green-500" />
            LIVE
          </Badge>
          <Badge variant={newCount > 0 ? "destructive" : "outline"} className="text-[10px] font-mono">
            <Bell className="h-3 w-3 mr-1" />
            {newCount} NEW
          </Badge>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Left: Alerts list */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Filter bar */}
          <Card className="mb-3 p-3 bg-card border-border">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">STATUS:</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px] h-7 text-[10px] font-mono bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all" className="text-[10px] font-mono">All</SelectItem>
                    <SelectItem value="new" className="text-[10px] font-mono">New</SelectItem>
                    <SelectItem value="acknowledged" className="text-[10px] font-mono">Acknowledged</SelectItem>
                    <SelectItem value="muted" className="text-[10px] font-mono">Muted</SelectItem>
                    <SelectItem value="snoozed" className="text-[10px] font-mono">Snoozed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">TYPE:</span>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px] h-7 text-[10px] font-mono bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all" className="text-[10px] font-mono">All Types</SelectItem>
                    <SelectItem value="proximity" className="text-[10px] font-mono">Proximity</SelectItem>
                    <SelectItem value="severity_increase" className="text-[10px] font-mono">Escalation</SelectItem>
                    <SelectItem value="new_incident" className="text-[10px] font-mono">New Incident</SelectItem>
                    <SelectItem value="route_threat" className="text-[10px] font-mono">Route Threat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="ml-auto">
                <Badge variant="outline" className="text-[10px] font-mono">
                  {filteredAlerts.length} shown
                </Badge>
              </div>
            </div>
          </Card>

          {/* Alerts list */}
          <div className="flex-1 overflow-auto space-y-2">
            {filteredAlerts.length === 0 ? (
              <Card className="p-8 bg-card border-border flex items-center justify-center">
                <div className="text-center">
                  <Shield className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-[10px] font-mono text-muted-foreground">No alerts match filters</p>
                </div>
              </Card>
            ) : (
              filteredAlerts.map(alert => {
                const typeMeta = ALERT_TYPE_META[alert.type];
                const TypeIcon = typeMeta.icon;
                const severity = getSeverityIndicator(alert.severity);
                const status = STATUS_META[alert.status];
                return (
                  <Card
                    key={alert.id}
                    className={`p-3 bg-card border-border ${alert.status === "new" ? "border-l-2 border-l-destructive" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="pt-0.5">
                        <TypeIcon className={`h-4 w-4 ${alert.status === "new" ? "text-destructive" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={`${severity.className} text-[8px] font-mono px-1.5 py-0`}>
                            {severity.label}
                          </Badge>
                          <Badge variant="outline" className="text-[8px] font-mono px-1.5 py-0">
                            {typeMeta.label}
                          </Badge>
                          <Badge className={`${status.className} text-[8px] font-mono px-1.5 py-0`}>
                            {status.label}
                          </Badge>
                        </div>
                        <h3 className="text-xs font-mono font-medium text-foreground mb-0.5">
                          {alert.title}
                        </h3>
                        <p className="text-[10px] font-mono text-muted-foreground mb-1.5">
                          {alert.description}
                        </p>
                        <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5" />
                            {alert.region}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {alert.timestamp}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {alert.status === "new" && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7"
                            title="Acknowledge"
                            onClick={() => handleAcknowledge(alert.id)}
                          >
                            <Check className="h-3.5 w-3.5 text-primary" />
                          </Button>
                        )}
                        {alert.status !== "muted" && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7"
                            title="Mute"
                            onClick={() => handleMute(alert.id)}
                          >
                            <BellOff className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {alert.status !== "snoozed" && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7"
                            title="Snooze"
                            onClick={() => handleSnooze(alert.id)}
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Watchlists + OSINT Sources */}
        <Card className="w-[320px] flex-shrink-0 flex flex-col border-border bg-card overflow-hidden">
          <div className="flex-1 overflow-auto">
            {/* Watchlists */}
            <div className="px-3 pt-3 pb-2">
              <h2 className="text-xs font-mono font-bold text-foreground flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-primary" />
                WATCHLISTS
              </h2>
              <p className="text-[9px] font-mono text-muted-foreground mt-0.5">
                {watchlist.length} regions monitored
              </p>
            </div>
            <Separator />
            <div className="px-2 pb-2">
              {watchlist.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-[10px] font-mono text-muted-foreground">
                    No monitored regions. Add regions from the Daily Brief.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 mt-2">
                  {watchlist.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2 rounded bg-secondary/30 border border-border"
                    >
                      <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono text-foreground truncate">{item.name}</div>
                        <div className="text-[8px] font-mono text-muted-foreground">
                          Added {item.addedAt}
                        </div>
                      </div>
                      {item.incidentCount > 0 && (
                        <Badge variant="destructive" className="text-[7px] font-mono px-1 py-0">
                          {item.incidentCount}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* OSINT Sources */}
            <Separator />
            <div className="p-3">
              <OsintSourcesManager />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
