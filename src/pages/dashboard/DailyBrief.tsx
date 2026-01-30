import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AlertTriangle, TrendingUp, MapPin, Clock, Shield } from "lucide-react";

// Static mock incidents
const mockIncidents = [
  {
    id: "1",
    title: "Armed Robbery Ring Targeting Commercial Vehicles",
    datetime: "2026-01-30 06:45",
    location: "Lagos, Nigeria",
    severity: 4,
    confidence: 87,
    status: "confirmed" as const,
  },
  {
    id: "2",
    title: "Kidnapping Threat Near Industrial Zone",
    datetime: "2026-01-30 05:30",
    location: "Port Harcourt, Nigeria",
    severity: 5,
    confidence: 72,
    status: "reviewed" as const,
  },
  {
    id: "3",
    title: "Protest Activity Disrupting Supply Routes",
    datetime: "2026-01-30 04:15",
    location: "Nairobi, Kenya",
    severity: 3,
    confidence: 94,
    status: "confirmed" as const,
  },
  {
    id: "4",
    title: "Suspicious Activity Near Port Facility",
    datetime: "2026-01-29 22:00",
    location: "Mombasa, Kenya",
    severity: 2,
    confidence: 65,
    status: "ai" as const,
  },
  {
    id: "5",
    title: "Civil Unrest Following Election Results",
    datetime: "2026-01-29 18:30",
    location: "Johannesburg, South Africa",
    severity: 4,
    confidence: 91,
    status: "reviewed" as const,
  },
];

const trendingIncidents = [
  {
    id: "6",
    title: "Escalating Militia Activity in Northern Region",
    datetime: "2026-01-30 03:00",
    location: "Kano, Nigeria",
    severity: 5,
    confidence: 78,
    status: "ai" as const,
    trend: "+12%",
  },
  {
    id: "7",
    title: "Increased Piracy Risk in Gulf Waters",
    datetime: "2026-01-30 01:45",
    location: "Gulf of Guinea",
    severity: 4,
    confidence: 83,
    status: "reviewed" as const,
    trend: "+8%",
  },
  {
    id: "8",
    title: "Political Tensions Rising Ahead of Summit",
    datetime: "2026-01-29 20:00",
    location: "Addis Ababa, Ethiopia",
    severity: 3,
    confidence: 69,
    status: "ai" as const,
    trend: "+5%",
  },
];

const myRegionIncidents = [
  {
    id: "9",
    title: "Road Blockade by Local Groups",
    datetime: "2026-01-30 07:00",
    location: "Accra, Ghana",
    severity: 2,
    confidence: 88,
    status: "confirmed" as const,
  },
  {
    id: "10",
    title: "Theft Incidents at Warehouse District",
    datetime: "2026-01-29 23:30",
    location: "Tema, Ghana",
    severity: 3,
    confidence: 76,
    status: "reviewed" as const,
  },
];

function getSeverityColor(severity: number) {
  switch (severity) {
    case 5:
      return "bg-destructive text-destructive-foreground";
    case 4:
      return "bg-orange-600 text-white";
    case 3:
      return "bg-amber-600 text-white";
    case 2:
      return "bg-yellow-600 text-black";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getStatusColor(status: "ai" | "reviewed" | "confirmed") {
  switch (status) {
    case "confirmed":
      return "bg-emerald-600/20 text-emerald-400 border-emerald-600/50";
    case "reviewed":
      return "bg-blue-600/20 text-blue-400 border-blue-600/50";
    case "ai":
      return "bg-purple-600/20 text-purple-400 border-purple-600/50";
  }
}

function getStatusLabel(status: "ai" | "reviewed" | "confirmed") {
  switch (status) {
    case "confirmed":
      return "CONFIRMED";
    case "reviewed":
      return "REVIEWED";
    case "ai":
      return "AI";
  }
}

interface IncidentCardProps {
  incident: {
    id: string;
    title: string;
    datetime: string;
    location: string;
    severity: number;
    confidence: number;
    status: "ai" | "reviewed" | "confirmed";
    trend?: string;
  };
  onClick: () => void;
  showTrend?: boolean;
}

function IncidentCard({ incident, onClick, showTrend }: IncidentCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded p-3 cursor-pointer hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-xs font-mono font-medium text-foreground leading-tight line-clamp-2">
          {incident.title}
        </h4>
        {showTrend && incident.trend && (
          <span className="text-[10px] font-mono text-destructive flex items-center gap-0.5 shrink-0">
            <TrendingUp className="h-3 w-3" />
            {incident.trend}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground mb-2">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {incident.datetime}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {incident.location}
        </span>
      </div>
      
      <div className="flex items-center gap-1.5">
        <Badge className={`${getSeverityColor(incident.severity)} text-[10px] font-mono px-1.5 py-0 h-5 rounded`}>
          SEV-{incident.severity}
        </Badge>
        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-5 rounded border-muted-foreground/30">
          {incident.confidence}%
        </Badge>
        <Badge variant="outline" className={`${getStatusColor(incident.status)} text-[10px] font-mono px-1.5 py-0 h-5 rounded`}>
          {getStatusLabel(incident.status)}
        </Badge>
      </div>
    </div>
  );
}

export default function DailyBrief() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);

  const handleIncidentClick = (id: string) => {
    setSelectedIncident(id);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h1 className="text-lg font-mono font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Daily Intelligence Brief
          </h1>
          <p className="text-muted-foreground text-[10px] font-mono mt-0.5">
            Operational threat summary • Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-foreground">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">
            CLASSIFICATION: INTERNAL
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Threats Today - Takes 2 columns */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              TOP THREATS TODAY
              <Badge variant="outline" className="ml-auto text-[10px] font-mono">
                {mockIncidents.length} ACTIVE
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {mockIncidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  onClick={() => handleIncidentClick(incident.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trending Escalations */}
        <Card className="bg-card border-border">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              TRENDING ESCALATIONS
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="space-y-2">
              {trendingIncidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  onClick={() => handleIncidentClick(incident.id)}
                  showTrend
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Regions */}
      <Card className="bg-card border-border">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            MY REGIONS
            <span className="text-[10px] font-normal text-muted-foreground ml-2">
              [Ghana • West Africa]
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {myRegionIncidents.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                onClick={() => handleIncidentClick(incident.id)}
              />
            ))}
            {/* Empty state placeholder */}
            <div className="bg-secondary/30 border border-dashed border-border rounded p-3 flex items-center justify-center min-h-[100px]">
              <span className="text-[10px] font-mono text-muted-foreground">
                + Add Region
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incident Detail Sheet */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[400px] border-l border-border">
          <SheetHeader className="border-b border-border pb-4">
            <SheetTitle className="text-sm font-mono">
              INCIDENT DETAIL
            </SheetTitle>
            <SheetDescription className="text-[10px] font-mono">
              ID: {selectedIncident || "—"}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 p-4 flex items-center justify-center h-[calc(100%-80px)]">
            <div className="text-center space-y-2">
              <div className="text-muted-foreground text-xs font-mono">[INCIDENT_DETAIL_PANEL]</div>
              <div className="text-muted-foreground/50 text-[10px] font-mono">Placeholder content</div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
