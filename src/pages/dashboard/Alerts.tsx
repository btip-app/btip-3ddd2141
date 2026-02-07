import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "lucide-react";

// --- Types ---

type AlertStatus = "new" | "acknowledged" | "muted" | "snoozed";
type AlertType = "proximity" | "severity_increase" | "new_incident" | "route_threat";

interface Alert {
  id: string;
  type: AlertType;
  title: string;
  description: string;
  relatedAsset: string;
  region: string;
  severity: number;
  timestamp: string;
  status: AlertStatus;
}

interface WatchItem {
  id: string;
  name: string;
  type: "region" | "asset" | "route";
  addedAt: string;
  incidentCount: number;
}

// --- Mock Data ---

const INITIAL_ALERTS: Alert[] = [
  {
    id: "al-1",
    type: "proximity",
    title: "Incident detected near Lagos HQ",
    description: "Armed robbery reported 3.2km from Lagos HQ. Category: robbery, severity 4.",
    relatedAsset: "Lagos HQ",
    region: "Lagos",
    severity: 4,
    timestamp: "2026-02-07 11:42",
    status: "new",
  },
  {
    id: "al-2",
    type: "severity_increase",
    title: "Severity escalation — Port Harcourt",
    description: "Kidnapping threat near PHC Refinery Complex upgraded from severity 3 to 5.",
    relatedAsset: "PHC Refinery Complex",
    region: "Rivers",
    severity: 5,
    timestamp: "2026-02-07 10:15",
    status: "new",
  },
  {
    id: "al-3",
    type: "route_threat",
    title: "Threat along Lagos → Abuja route",
    description: "Highway banditry report near Lokoja Waypoint, within 8km of route corridor.",
    relatedAsset: "Lagos → Abuja Express",
    region: "Kogi",
    severity: 3,
    timestamp: "2026-02-07 08:30",
    status: "new",
  },
  {
    id: "al-4",
    type: "new_incident",
    title: "New incident — Bonny Island area",
    description: "Suspicious vessel activity reported near Bonny Island Terminal.",
    relatedAsset: "Bonny Island Terminal",
    region: "Rivers",
    severity: 3,
    timestamp: "2026-02-07 06:00",
    status: "acknowledged",
  },
  {
    id: "al-5",
    type: "proximity",
    title: "Civil unrest near Exec Residence",
    description: "Protest activity detected 5.8km from Exec Residence - VI.",
    relatedAsset: "Exec Residence - VI",
    region: "Lagos",
    severity: 2,
    timestamp: "2026-02-06 22:10",
    status: "acknowledged",
  },
  {
    id: "al-6",
    type: "proximity",
    title: "Incident near Staff Housing",
    description: "Carjacking reported 4.1km from Staff Housing - Lekki.",
    relatedAsset: "Staff Housing - Lekki",
    region: "Lagos",
    severity: 4,
    timestamp: "2026-02-06 19:30",
    status: "muted",
  },
  {
    id: "al-7",
    type: "severity_increase",
    title: "Escalation — Kano militia activity",
    description: "Militia activity near Kano region increased to critical severity.",
    relatedAsset: "—",
    region: "Kano",
    severity: 5,
    timestamp: "2026-02-06 15:00",
    status: "snoozed",
  },
];

const INITIAL_WATCHLIST: WatchItem[] = [
  { id: "w1", name: "Lagos Metropolitan", type: "region", addedAt: "2026-01-15", incidentCount: 4 },
  { id: "w2", name: "Niger Delta Corridor", type: "region", addedAt: "2026-01-20", incidentCount: 3 },
  { id: "w3", name: "Lagos HQ", type: "asset", addedAt: "2026-01-10", incidentCount: 2 },
  { id: "w4", name: "PHC Refinery Complex", type: "asset", addedAt: "2026-01-10", incidentCount: 2 },
  { id: "w5", name: "Exec Residence - VI", type: "asset", addedAt: "2026-01-12", incidentCount: 1 },
  { id: "w6", name: "Lagos → Abuja Express", type: "route", addedAt: "2026-01-18", incidentCount: 1 },
  { id: "w7", name: "PHC → Bonny Island", type: "route", addedAt: "2026-01-22", incidentCount: 1 },
];

// --- Simulated incoming events pool ---

const SIMULATED_EVENTS: Omit<Alert, "id" | "timestamp" | "status">[] = [
  {
    type: "proximity",
    title: "New incident near Lagos HQ",
    description: "Suspicious surveillance activity reported 2.1km from Lagos HQ perimeter.",
    relatedAsset: "Lagos HQ",
    region: "Lagos",
    severity: 3,
  },
  {
    type: "severity_increase",
    title: "Escalation — Niger Delta pipeline",
    description: "Pipeline vandalism threat upgraded from severity 3 to 5 near PHC Refinery.",
    relatedAsset: "PHC Refinery Complex",
    region: "Rivers",
    severity: 5,
  },
  {
    type: "route_threat",
    title: "Incident along PHC → Bonny route",
    description: "Armed group sighting reported within 6km of PHC → Bonny Island corridor.",
    relatedAsset: "PHC → Bonny Island",
    region: "Rivers",
    severity: 4,
  },
  {
    type: "proximity",
    title: "Activity near Exec Residence",
    description: "Unknown vehicle loitering detected near Exec Residence - VI security zone.",
    relatedAsset: "Exec Residence - VI",
    region: "Lagos",
    severity: 3,
  },
  {
    type: "new_incident",
    title: "New incident — Abuja region",
    description: "Improvised roadblock reported on outskirts of Abuja near liaison office.",
    relatedAsset: "Abuja Liaison Office",
    region: "FCT",
    severity: 3,
  },
  {
    type: "severity_increase",
    title: "Escalation — Lagos maritime zone",
    description: "Piracy threat level increased in Lagos coastal waters, affecting port operations.",
    relatedAsset: "Lagos HQ",
    region: "Lagos",
    severity: 4,
  },
];

function formatNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// --- Helpers ---

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
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [watchlist, setWatchlist] = useState<WatchItem[]>(INITIAL_WATCHLIST);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [simulationActive, setSimulationActive] = useState(false);
  const eventIndexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const triggerNewAlert = useCallback(() => {
    const eventTemplate = SIMULATED_EVENTS[eventIndexRef.current % SIMULATED_EVENTS.length];
    eventIndexRef.current += 1;
    const newAlert: Alert = {
      ...eventTemplate,
      id: `al-sim-${Date.now()}`,
      timestamp: formatNow(),
      status: "new",
    };
    setAlerts(prev => [newAlert, ...prev]);
    toast.error(newAlert.title, {
      description: newAlert.description,
      duration: 5000,
    });
  }, []);

  useEffect(() => {
    if (simulationActive) {
      // Fire one immediately, then every 15–30s randomly
      triggerNewAlert();
      intervalRef.current = setInterval(() => {
        triggerNewAlert();
      }, 15000 + Math.random() * 15000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [simulationActive, triggerNewAlert]);

  const filteredAlerts = alerts.filter(a => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    return true;
  });

  const newCount = alerts.filter(a => a.status === "new").length;

  function handleAcknowledge(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "acknowledged" as AlertStatus } : a));
  }

  function handleMute(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "muted" as AlertStatus } : a));
  }

  function handleSnooze(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "snoozed" as AlertStatus } : a));
  }

  function handleRemoveWatch(id: string) {
    setWatchlist(prev => prev.filter(w => w.id !== id));
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-mono font-bold text-foreground">Alerts Center</h1>
          <p className="text-muted-foreground text-[10px] font-mono">
            {alerts.length} total alerts • {newCount} unacknowledged
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={simulationActive ? "destructive" : "outline"}
            className="text-[10px] font-mono h-7"
            onClick={() => setSimulationActive(prev => !prev)}
          >
            <Radio className="h-3 w-3 mr-1" />
            {simulationActive ? "LIVE FEED ON" : "SIMULATE FEED"}
          </Button>
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
                      {/* Icon */}
                      <div className="pt-0.5">
                        <TypeIcon className={`h-4 w-4 ${alert.status === "new" ? "text-destructive" : "text-muted-foreground"}`} />
                      </div>

                      {/* Content */}
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
                            <Building2 className="h-2.5 w-2.5" />
                            {alert.relatedAsset}
                          </span>
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

                      {/* Actions */}
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

        {/* Right: Watchlists */}
        <Card className="w-[300px] flex-shrink-0 flex flex-col border-border bg-card overflow-hidden">
          <div className="px-3 pt-3 pb-2">
            <h2 className="text-xs font-mono font-bold text-foreground flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-primary" />
              WATCHLISTS
            </h2>
            <p className="text-[9px] font-mono text-muted-foreground mt-0.5">
              {watchlist.length} items monitored
            </p>
          </div>
          <Separator />

          <Tabs defaultValue="regions" className="flex flex-col flex-1 min-h-0">
            <TabsList className="bg-secondary mx-3 mt-2">
              <TabsTrigger value="regions" className="text-[9px] font-mono">REGIONS</TabsTrigger>
              <TabsTrigger value="assets" className="text-[9px] font-mono">ASSETS</TabsTrigger>
              <TabsTrigger value="routes" className="text-[9px] font-mono">ROUTES</TabsTrigger>
            </TabsList>

            {(["regions", "assets", "routes"] as const).map(tabType => {
              const filterType = tabType === "regions" ? "region" : tabType === "assets" ? "asset" : "route";
              const items = watchlist.filter(w => w.type === filterType);
              return (
                <TabsContent key={tabType} value={tabType} className="flex-1 overflow-auto mt-0 px-2 pb-2">
                  {items.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-[10px] font-mono text-muted-foreground">No watched {tabType}</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 mt-2">
                      {items.map(item => {
                        const WIcon = WATCHLIST_TYPE_ICON[item.type];
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 p-2 rounded bg-secondary/30 border border-border"
                          >
                            <WIcon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
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
                            <Button
                              variant="ghost" size="icon"
                              className="h-5 w-5 flex-shrink-0"
                              title="Remove from watchlist"
                              onClick={() => handleRemoveWatch(item.id)}
                            >
                              <Trash2 className="h-2.5 w-2.5 text-muted-foreground" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
