import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useIncidents, type Incident } from "@/hooks/useIncidents";
import { useMonitoredRegions } from "@/hooks/useMonitoredRegions";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, TrendingUp, MapPin, Clock, Shield, Filter, User, FileText, ExternalLink } from "lucide-react";
import EscalateModal from "@/components/dashboard/EscalateModal";
import { AddRegionDialog } from "@/components/dashboard/AddRegionDialog";
import {
  REGIONS as GEO_REGIONS,
  getCountriesForRegion,
  getSubdivisionsForCountry,
  getSubdivisionTerm,
} from "@/data/geography";

// Build region options from geography data
const REGIONS = [
  { value: "all", label: "All Regions" },
  ...GEO_REGIONS.map(r => ({ value: r.value, label: r.label })),
];

// Mock threat categories
const THREAT_CATEGORIES = [
  { id: "kidnapping", label: "Kidnapping" },
  { id: "terrorism", label: "Terrorism" },
  { id: "robbery", label: "Armed Robbery" },
  { id: "protest", label: "Protest / Civil Unrest" },
  { id: "political", label: "Political Instability" },
  { id: "piracy", label: "Piracy / Maritime" },
];

// (Incident type imported from useIncidents hook)

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

function getSeverityLabel(severity: number) {
  switch (severity) {
    case 5: return "CRITICAL";
    case 4: return "HIGH";
    case 3: return "MODERATE";
    case 2: return "LOW";
    default: return "INFO";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-600/20 text-emerald-400 border-emerald-600/50";
    case "reviewed":
      return "bg-blue-600/20 text-blue-400 border-blue-600/50";
    case "ai":
      return "bg-purple-600/20 text-purple-400 border-purple-600/50";
  }
}

function getStatusLabel(status: string) {
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
  incident: Incident;
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
          {new Date(incident.datetime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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

function IncidentDetailPanel({ incident }: { incident: Incident | null }) {
  const navigate = useNavigate();
  const [escalateOpen, setEscalateOpen] = useState(false);

  if (!incident) return null;

  return (
    <div className="space-y-4 pt-4">
      {/* Title & Severity */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge className={`${getSeverityColor(incident.severity)} text-[10px] font-mono`}>
            {getSeverityLabel(incident.severity)}
          </Badge>
          <Badge variant="outline" className={`${getStatusColor(incident.status)} text-[10px] font-mono`}>
            {getStatusLabel(incident.status)}
          </Badge>
        </div>
        <h3 className="text-sm font-mono font-medium text-foreground">
          {incident.title}
        </h3>
      </div>

      <Separator />

      {/* Meta Info */}
      <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
        <div>
          <div className="text-muted-foreground mb-1">LOCATION</div>
          <div className="flex items-center gap-1 text-foreground">
            <MapPin className="h-3 w-3" />
            {incident.location}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1">TIMESTAMP</div>
          <div className="flex items-center gap-1 text-foreground">
            <Clock className="h-3 w-3" />
            {new Date(incident.datetime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1">CONFIDENCE</div>
          <div className="text-foreground">{incident.confidence}%</div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1">ANALYST</div>
          <div className="flex items-center gap-1 text-foreground">
            <User className="h-3 w-3" />
            {incident.analyst || "—"}
          </div>
        </div>
      </div>

      <Separator />

      {/* Summary */}
      <div>
        <div className="text-[10px] font-mono text-muted-foreground mb-2 flex items-center gap-1">
          <FileText className="h-3 w-3" />
          INTELLIGENCE SUMMARY
        </div>
        <p className="text-xs font-mono text-foreground leading-relaxed">
          {incident.summary || "No summary available."}
        </p>
      </div>

      <Separator />

      {/* Sources */}
      <div>
        <div className="text-[10px] font-mono text-muted-foreground mb-2">SOURCES</div>
        <div className="space-y-1">
          {incident.sources?.map((source, idx) => (
            <div key={idx} className="text-[10px] font-mono text-foreground flex items-center gap-1">
              <span className="text-muted-foreground">•</span>
              {source}
            </div>
          )) || <div className="text-[10px] font-mono text-muted-foreground">No sources listed</div>}
        </div>
      </div>

      <Separator />

      {/* Actions placeholder */}
      <div className="flex gap-2">
        <button
          onClick={() => navigate(`/dashboard/incident/${incident.id}`)}
          className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-[10px] font-mono py-2 px-3 rounded border border-border cursor-pointer"
        >
          <ExternalLink className="h-3 w-3 inline mr-1" />
          FULL REPORT
        </button>
        <button
          onClick={() => setEscalateOpen(true)}
          className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-mono py-2 px-3 rounded border border-primary/30 cursor-pointer"
        >
          ESCALATE
        </button>
      </div>
      <EscalateModal
        open={escalateOpen}
        onOpenChange={setEscalateOpen}
        incidentId={incident.id}
        incidentTitle={incident.title}
      />
    </div>
  );
}

export default function DailyBrief() {
  const { role, isExecutive } = useUserRole();
  const { log: auditLog } = useAuditLog();
  const { incidents, loading: incidentsLoading } = useIncidents();
  const [addRegionOpen, setAddRegionOpen] = useState(false);
  const { regions: monitoredRegions, addRegion, removeRegion } = useMonitoredRegions();

  const handleExport = () => {
    auditLog("REPORT_EXPORT", "Daily Intelligence Brief");
    toast.success("Export initiated", { description: "Report export queued (mock)" });
  };
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedSubdivision, setSelectedSubdivision] = useState("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    THREAT_CATEGORIES.map(c => c.id) // All selected by default
  );

  // Derived geography options
  const countryOptions = useMemo(() => {
    return getCountriesForRegion(selectedRegion);
  }, [selectedRegion]);

  const subdivisionOptions = useMemo(() => {
    if (selectedCountry === "all") return [];
    return getSubdivisionsForCountry(selectedCountry);
  }, [selectedCountry]);

  const subdivisionLabel = useMemo(() => {
    if (selectedCountry === "all") return "Subdivision";
    return getSubdivisionTerm(selectedCountry).toUpperCase();
  }, [selectedCountry]);

  // Reset child selections when parent changes
  const handleRegionChange = (value: string) => {
    setSelectedRegion(value);
    setSelectedCountry("all");
    setSelectedSubdivision("all");
  };

  const handleCountryChange = (value: string) => {
    setSelectedCountry(value);
    setSelectedSubdivision("all");
  };

  const handleIncidentClick = (id: string) => {
    setSelectedIncidentId(id);
    setDrawerOpen(true);
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Filter incidents based on selections
  const matchesGeoFilters = (incident: Incident) => {
    if (selectedRegion !== "all" && incident.region !== selectedRegion) return false;
    if (selectedCountry !== "all" && incident.country !== selectedCountry) return false;
    if (selectedSubdivision !== "all" && incident.subdivision !== selectedSubdivision) return false;
    return selectedCategories.includes(incident.category);
  };

  const filteredTopThreats = useMemo(() => {
    return incidents.filter(i => i.section === 'top_threats' && !i.trend).filter(matchesGeoFilters);
  }, [incidents, selectedRegion, selectedCountry, selectedSubdivision, selectedCategories]);

  const filteredTrending = useMemo(() => {
    return incidents.filter(i => i.section === 'trending' || i.trend).filter(matchesGeoFilters);
  }, [incidents, selectedRegion, selectedCountry, selectedSubdivision, selectedCategories]);

  const myRegionIncidents = useMemo(() => {
    if (monitoredRegions.length === 0) return [];
    return incidents.filter(i =>
      monitoredRegions.some(r =>
        r.country === i.country &&
        (!r.subdivision || r.subdivision === i.subdivision)
      )
    );
  }, [incidents, monitoredRegions]);

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || null;

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
            {incidentsLoading ? 'Loading...' : `Operational threat summary • Last updated: ${new Date().toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(isExecutive || role === 'admin') && (
            <Button
              variant="outline"
              size="sm"
              className="text-[10px] font-mono h-7"
              onClick={handleExport}
            >
              <Download className="h-3 w-3 mr-1" />
              EXPORT
            </Button>
          )}
          <div className="text-right">
            <div className="text-xs font-mono text-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              CLASSIFICATION: INTERNAL
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4 p-3 bg-secondary/30 rounded border border-border">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] font-mono text-muted-foreground">FILTERS:</span>
        </div>
        
        {/* Region Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground">REGION:</span>
          <Select value={selectedRegion} onValueChange={handleRegionChange}>
            <SelectTrigger className="w-[160px] h-7 text-[10px] font-mono bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              {REGIONS.map(region => (
                <SelectItem 
                  key={region.value} 
                  value={region.value}
                  className="text-[10px] font-mono"
                >
                  {region.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Country Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground">COUNTRY:</span>
          <Select value={selectedCountry} onValueChange={handleCountryChange}>
            <SelectTrigger className="w-[150px] h-7 text-[10px] font-mono bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              <SelectItem value="all" className="text-[10px] font-mono">All Countries</SelectItem>
              {countryOptions.map(c => (
                <SelectItem key={c.value} value={c.value} className="text-[10px] font-mono">
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subdivision Dropdown — only shown when a country is selected */}
        {selectedCountry !== "all" && subdivisionOptions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">{subdivisionLabel}:</span>
            <Select value={selectedSubdivision} onValueChange={setSelectedSubdivision}>
              <SelectTrigger className="w-[160px] h-7 text-[10px] font-mono bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="all" className="text-[10px] font-mono">All {getSubdivisionTerm(selectedCountry)}s</SelectItem>
                {subdivisionOptions.map(s => (
                  <SelectItem key={s.value} value={s.value} className="text-[10px] font-mono">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Separator orientation="vertical" className="h-6" />

        {/* Category Checkboxes */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-mono text-muted-foreground">CATEGORIES:</span>
          {THREAT_CATEGORIES.map(category => (
            <label 
              key={category.id} 
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Checkbox
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => handleCategoryToggle(category.id)}
                className="h-3 w-3 border-muted-foreground/50"
              />
              <span className="text-[10px] font-mono text-foreground">
                {category.label}
              </span>
            </label>
          ))}
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
                {filteredTopThreats.length} ACTIVE
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {filteredTopThreats.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredTopThreats.map((incident) => (
                  <IncidentCard
                    key={incident.id}
                    incident={incident}
                    onClick={() => handleIncidentClick(incident.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[10px] font-mono text-muted-foreground">
                No threats matching current filters
              </div>
            )}
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
            {filteredTrending.length > 0 ? (
              <div className="space-y-2">
                {filteredTrending.map((incident) => (
                  <IncidentCard
                    key={incident.id}
                    incident={incident}
                    onClick={() => handleIncidentClick(incident.id)}
                    showTrend
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[10px] font-mono text-muted-foreground">
                No escalations matching filters
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* My Regions */}
      <Card className="bg-card border-border">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            MY REGIONS
            {monitoredRegions.length > 0 && (
              <span className="text-[10px] font-normal text-muted-foreground ml-2">
                [{monitoredRegions.map(r => r.countryLabel).join(' • ')}]
              </span>
            )}
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
            {/* Add Region button */}
            <button
              onClick={() => setAddRegionOpen(true)}
              className="bg-secondary/30 border border-dashed border-border rounded p-3 flex items-center justify-center min-h-[100px] cursor-pointer hover:border-primary/50 hover:bg-secondary/50 transition-colors"
            >
              <span className="text-[10px] font-mono text-muted-foreground">
                + Add Region
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      <AddRegionDialog
        open={addRegionOpen}
        onOpenChange={setAddRegionOpen}
        onAdd={async (r) => { await addRegion(r); }}
        existing={monitoredRegions}
      />

      {/* Incident Detail Sheet */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[420px] border-l border-border overflow-y-auto">
          <SheetHeader className="border-b border-border pb-4">
            <SheetTitle className="text-sm font-mono">
              INCIDENT DETAIL
            </SheetTitle>
            <SheetDescription className="text-[10px] font-mono">
              ID: {selectedIncidentId || "—"} • {selectedIncident?.category?.toUpperCase() || "—"}
            </SheetDescription>
          </SheetHeader>
          <IncidentDetailPanel incident={selectedIncident} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
