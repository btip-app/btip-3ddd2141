import { useState, useMemo } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuditLog } from "@/hooks/useAuditLog";
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

// Mock regions
const REGIONS = [
  { value: "all", label: "All Regions" },
  { value: "west-africa", label: "West Africa" },
  { value: "east-africa", label: "East Africa" },
  { value: "southern-africa", label: "Southern Africa" },
  { value: "central-africa", label: "Central Africa" },
  { value: "north-africa", label: "North Africa" },
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

type IncidentStatus = "ai" | "reviewed" | "confirmed";

interface Incident {
  id: string;
  title: string;
  datetime: string;
  location: string;
  severity: number;
  confidence: number;
  status: IncidentStatus;
  category: string;
  region: string;
  trend?: string;
  summary?: string;
  sources?: string[];
  analyst?: string;
}

// Static mock incidents with extended data
const mockIncidents: Incident[] = [
  {
    id: "1",
    title: "Armed Robbery Ring Targeting Commercial Vehicles",
    datetime: "2026-01-30 06:45",
    location: "Lagos, Nigeria",
    severity: 4,
    confidence: 87,
    status: "confirmed",
    category: "robbery",
    region: "west-africa",
    summary: "Multiple coordinated attacks on commercial vehicles along the Lagos-Ibadan expressway. Criminal group using roadblocks and armed personnel. Three incidents in past 48 hours.",
    sources: ["Local Police Report", "Field Agent LAGOS-07", "Media Monitoring"],
    analyst: "J. Okonkwo",
  },
  {
    id: "2",
    title: "Kidnapping Threat Near Industrial Zone",
    datetime: "2026-01-30 05:30",
    location: "Port Harcourt, Nigeria",
    severity: 5,
    confidence: 72,
    status: "reviewed",
    category: "kidnapping",
    region: "west-africa",
    summary: "Intelligence suggests targeted kidnapping operation planned against expatriate workers in the Trans-Amadi industrial area. Source reliability: B2.",
    sources: ["HUMINT Source PH-12", "Pattern Analysis"],
    analyst: "M. Adeyemi",
  },
  {
    id: "3",
    title: "Protest Activity Disrupting Supply Routes",
    datetime: "2026-01-30 04:15",
    location: "Nairobi, Kenya",
    severity: 3,
    confidence: 94,
    status: "confirmed",
    category: "protest",
    region: "east-africa",
    summary: "Labor union protests blocking Mombasa Road affecting cargo movement from port. Expected to continue for 24-48 hours pending negotiations.",
    sources: ["Ground Team NBO", "Traffic Monitoring", "Social Media Intel"],
    analyst: "P. Kimani",
  },
  {
    id: "4",
    title: "Suspicious Activity Near Port Facility",
    datetime: "2026-01-29 22:00",
    location: "Mombasa, Kenya",
    severity: 2,
    confidence: 65,
    status: "ai",
    category: "robbery",
    region: "east-africa",
    summary: "AI-flagged pattern of unusual vehicle movements near port storage facilities. Requires human verification.",
    sources: ["CCTV Analysis", "Pattern Recognition AI"],
    analyst: "Pending Review",
  },
  {
    id: "5",
    title: "Civil Unrest Following Election Results",
    datetime: "2026-01-29 18:30",
    location: "Johannesburg, South Africa",
    severity: 4,
    confidence: 91,
    status: "reviewed",
    category: "political",
    region: "southern-africa",
    summary: "Post-election tensions escalating in multiple townships. Isolated incidents of property damage reported. Security forces on heightened alert.",
    sources: ["Embassy Cables", "Local Media", "Field Team JNB"],
    analyst: "R. van der Berg",
  },
];

const trendingIncidents: Incident[] = [
  {
    id: "6",
    title: "Escalating Militia Activity in Northern Region",
    datetime: "2026-01-30 03:00",
    location: "Kano, Nigeria",
    severity: 5,
    confidence: 78,
    status: "ai",
    trend: "+12%",
    category: "terrorism",
    region: "west-africa",
    summary: "Increased movement patterns detected consistent with militant group operations. Cross-referencing with known faction territories.",
    sources: ["Satellite Imagery", "SIGINT", "Regional Partners"],
    analyst: "Pending Review",
  },
  {
    id: "7",
    title: "Increased Piracy Risk in Gulf Waters",
    datetime: "2026-01-30 01:45",
    location: "Gulf of Guinea",
    severity: 4,
    confidence: 83,
    status: "reviewed",
    trend: "+8%",
    category: "piracy",
    region: "west-africa",
    summary: "Maritime patrols report increased small vessel activity. Two attempted boardings in past week. Recommend enhanced escort protocols.",
    sources: ["IMB Report", "Navy Liaison", "Shipping Intel Network"],
    analyst: "C. Mensah",
  },
  {
    id: "8",
    title: "Political Tensions Rising Ahead of Summit",
    datetime: "2026-01-29 20:00",
    location: "Addis Ababa, Ethiopia",
    severity: 3,
    confidence: 69,
    status: "ai",
    trend: "+5%",
    category: "political",
    region: "east-africa",
    summary: "Social media analysis indicates rising tensions ahead of AU summit. Protest activity possible near diplomatic quarter.",
    sources: ["Social Media Analysis", "Open Source Intel"],
    analyst: "Pending Review",
  },
];

const myRegionIncidents: Incident[] = [
  {
    id: "9",
    title: "Road Blockade by Local Groups",
    datetime: "2026-01-30 07:00",
    location: "Accra, Ghana",
    severity: 2,
    confidence: 88,
    status: "confirmed",
    category: "protest",
    region: "west-africa",
    summary: "Community groups blocking access road near Tema junction. Dispute over local infrastructure project. Police negotiating.",
    sources: ["Ground Team ACC", "Local Contacts"],
    analyst: "K. Asante",
  },
  {
    id: "10",
    title: "Theft Incidents at Warehouse District",
    datetime: "2026-01-29 23:30",
    location: "Tema, Ghana",
    severity: 3,
    confidence: 76,
    status: "reviewed",
    category: "robbery",
    region: "west-africa",
    summary: "Series of break-ins targeting industrial warehouses. Organized group suspected. Enhanced security measures recommended.",
    sources: ["Police Report", "Security Contractor"],
    analyst: "K. Asante",
  },
];

// Combine all incidents for lookup
const allIncidents = [...mockIncidents, ...trendingIncidents, ...myRegionIncidents];

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

function getStatusColor(status: IncidentStatus) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-600/20 text-emerald-400 border-emerald-600/50";
    case "reviewed":
      return "bg-blue-600/20 text-blue-400 border-blue-600/50";
    case "ai":
      return "bg-purple-600/20 text-purple-400 border-purple-600/50";
  }
}

function getStatusLabel(status: IncidentStatus) {
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

function IncidentDetailPanel({ incident }: { incident: Incident | null }) {
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
            {incident.datetime}
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
        <button className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-[10px] font-mono py-2 px-3 rounded border border-border">
          <ExternalLink className="h-3 w-3 inline mr-1" />
          FULL REPORT
        </button>
        <button className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-mono py-2 px-3 rounded border border-primary/30">
          ESCALATE
        </button>
      </div>
    </div>
  );
}

export default function DailyBrief() {
  const { role, isExecutive } = useUserRole();
  const { log: auditLog } = useAuditLog();

  const handleExport = () => {
    auditLog("REPORT_EXPORT", "Daily Intelligence Brief");
    toast.success("Export initiated", { description: "Report export queued (mock)" });
  };
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    THREAT_CATEGORIES.map(c => c.id) // All selected by default
  );

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
  const filteredTopThreats = useMemo(() => {
    return mockIncidents.filter(incident => {
      const regionMatch = selectedRegion === "all" || incident.region === selectedRegion;
      const categoryMatch = selectedCategories.includes(incident.category);
      return regionMatch && categoryMatch;
    });
  }, [selectedRegion, selectedCategories]);

  const filteredTrending = useMemo(() => {
    return trendingIncidents.filter(incident => {
      const regionMatch = selectedRegion === "all" || incident.region === selectedRegion;
      const categoryMatch = selectedCategories.includes(incident.category);
      return regionMatch && categoryMatch;
    });
  }, [selectedRegion, selectedCategories]);

  const selectedIncident = allIncidents.find(i => i.id === selectedIncidentId) || null;

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
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
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
