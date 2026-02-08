import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Map, { Marker, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Target,
  Filter,
  Crosshair
} from "lucide-react";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Mock threat types
const THREAT_TYPES = [
  { value: "all", label: "All Threats" },
  { value: "kidnapping", label: "Kidnapping" },
  { value: "terrorism", label: "Terrorism" },
  { value: "robbery", label: "Armed Robbery" },
  { value: "protest", label: "Civil Unrest" },
  { value: "piracy", label: "Maritime / Piracy" },
];

// Mock time windows
const TIME_WINDOWS = [
  { value: "24h", label: "Last 24 Hours" },
  { value: "48h", label: "Last 48 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
];

// Mock incident markers centered around Nigeria/West Africa
const mockMarkers = [
  {
    id: "1",
    lat: 6.5244,
    lng: 3.3792,
    title: "Armed Robbery - Commercial Vehicles",
    location: "Lagos, Nigeria",
    severity: 4,
    confidence: 87,
    category: "robbery",
    datetime: "2026-02-07 06:45",
    source: "Field Agent Report #LA-0192",
  },
  {
    id: "2",
    lat: 4.8156,
    lng: 7.0498,
    title: "Kidnapping Threat - Industrial Zone",
    location: "Port Harcourt, Nigeria",
    severity: 5,
    confidence: 72,
    category: "kidnapping",
    datetime: "2026-02-07 05:30",
    source: "SIGINT Intercept #PH-0087",
  },
  {
    id: "3",
    lat: 12.0022,
    lng: 8.5920,
    title: "Militia Activity Detected",
    location: "Kano, Nigeria",
    severity: 5,
    confidence: 78,
    category: "terrorism",
    datetime: "2026-02-07 03:00",
    source: "Satellite Imagery Analysis",
  },
  {
    id: "4",
    lat: 9.0765,
    lng: 7.3986,
    title: "Political Demonstration",
    location: "Abuja, Nigeria",
    severity: 2,
    confidence: 94,
    category: "protest",
    datetime: "2026-02-05 14:00",
    source: "Open Source / Social Media",
  },
  {
    id: "5",
    lat: 5.5560,
    lng: -0.1969,
    title: "Road Blockade by Local Groups",
    location: "Accra, Ghana",
    severity: 2,
    confidence: 88,
    category: "protest",
    datetime: "2026-02-06 07:00",
    source: "Partner Agency Brief",
  },
  {
    id: "6",
    lat: 6.1375,
    lng: 1.2123,
    title: "Port Security Breach Attempt",
    location: "Lomé, Togo",
    severity: 3,
    confidence: 65,
    category: "robbery",
    datetime: "2026-01-20 22:30",
    source: "Port Authority Notification",
  },
  {
    id: "7",
    lat: 4.0511,
    lng: 9.7679,
    title: "Suspicious Vessel Activity",
    location: "Douala, Cameroon",
    severity: 3,
    confidence: 71,
    category: "piracy",
    datetime: "2026-01-15 19:00",
    source: "Maritime Patrol Report",
  },
  {
    id: "8",
    lat: 6.3350,
    lng: 5.6037,
    title: "Civil Unrest - Market Area",
    location: "Benin City, Nigeria",
    severity: 3,
    confidence: 82,
    category: "protest",
    datetime: "2026-02-01 16:45",
    source: "Local Security Contact",
  },
];

function getSeverityColor(severity: number) {
  switch (severity) {
    case 5:
      return "#ef4444"; // red
    case 4:
      return "#f97316"; // orange
    case 3:
      return "#eab308"; // amber
    case 2:
      return "#facc15"; // yellow
    default:
      return "#6b7280"; // gray
  }
}

function getSeverityBgClass(severity: number) {
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

interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  title: string;
  location: string;
  severity: number;
  confidence: number;
  category: string;
  datetime: string;
  source: string;
}

function ThreatMarker({ 
  marker, 
  onClick 
}: { 
  marker: MarkerData; 
  onClick: () => void;
}) {
  const color = getSeverityColor(marker.severity);
  
  return (
    <Marker
      latitude={marker.lat}
      longitude={marker.lng}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick();
      }}
    >
      <div 
        className="cursor-pointer relative group"
        title={marker.title}
      >
        {/* Outer pulse ring for high severity */}
        {marker.severity >= 4 && (
          <div 
            className="absolute inset-0 rounded-full opacity-30"
            style={{ 
              backgroundColor: color,
              transform: 'scale(2)',
            }}
          />
        )}
        {/* Main marker */}
        <div
          className="w-4 h-4 rounded-full border-2 border-white/80 shadow-lg"
          style={{ backgroundColor: color }}
        />
      </div>
    </Marker>
  );
}

export default function ThreatMap() {
  const navigate = useNavigate();
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const [threatType, setThreatType] = useState("all");
  const [timeWindow, setTimeWindow] = useState("30d");
  const [severityRange, setSeverityRange] = useState([1, 5]);
  const [confidenceRange, setConfidenceRange] = useState([0, 100]);

  const [viewState, setViewState] = useState({
    latitude: 9.0820,
    longitude: 8.6753,
    zoom: 5.5,
  });

  // Filter markers based on current filter state
  const filteredMarkers = useMemo(() => {
    const now = new Date("2026-02-07T12:00:00");
    const windowMs: Record<string, number> = {
      "24h": 24 * 60 * 60 * 1000,
      "48h": 48 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    const cutoff = new Date(now.getTime() - (windowMs[timeWindow] || windowMs["30d"]));

    return mockMarkers.filter(m => {
      if (threatType !== "all" && m.category !== threatType) return false;
      if (m.severity < severityRange[0] || m.severity > severityRange[1]) return false;
      if (m.confidence < confidenceRange[0] || m.confidence > confidenceRange[1]) return false;
      if (new Date(m.datetime) < cutoff) return false;
      return true;
    });
  }, [threatType, timeWindow, severityRange, confidenceRange]);

  const handleMarkerClick = useCallback((marker: MarkerData) => {
    setSelectedMarker(marker);
    setDrawerOpen(true);
  }, []);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] gap-3">
        <Target className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-xs font-mono text-muted-foreground">THREAT MAP UNAVAILABLE</p>
        <p className="text-[10px] font-mono text-muted-foreground/60">Map token not configured. Contact system administrator.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Top Toolbar */}
      <Card className="mb-3 p-3 bg-card border-border">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-xs font-mono font-bold text-foreground">THREAT MAP</span>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-2">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-mono text-muted-foreground">FILTERS:</span>
          </div>

          {/* Threat Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">TYPE:</span>
            <Select value={threatType} onValueChange={setThreatType}>
              <SelectTrigger className="w-[140px] h-7 text-[10px] font-mono bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {THREAT_TYPES.map(type => (
                  <SelectItem 
                    key={type.value} 
                    value={type.value}
                    className="text-[10px] font-mono"
                  >
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Window Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">TIME:</span>
            <Select value={timeWindow} onValueChange={setTimeWindow}>
              <SelectTrigger className="w-[130px] h-7 text-[10px] font-mono bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {TIME_WINDOWS.map(tw => (
                  <SelectItem 
                    key={tw.value} 
                    value={tw.value}
                    className="text-[10px] font-mono"
                  >
                    {tw.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity Range */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">SEVERITY:</span>
            <div className="w-[100px]">
              <Slider
                value={severityRange}
                onValueChange={setSeverityRange}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
            </div>
            <span className="text-[10px] font-mono text-foreground w-10">
              {severityRange[0]}-{severityRange[1]}
            </span>
          </div>

          {/* Confidence Range */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">CONF:</span>
            <div className="w-[100px]">
              <Slider
                value={confidenceRange}
                onValueChange={setConfidenceRange}
                min={0}
                max={100}
                step={10}
                className="w-full"
              />
            </div>
            <span className="text-[10px] font-mono text-foreground w-14">
              {confidenceRange[0]}-{confidenceRange[1]}%
            </span>
          </div>

          {/* Marker count */}
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono">
              <Crosshair className="h-3 w-3 mr-1" />
              {filteredMarkers.length} / {mockMarkers.length} INCIDENTS
            </Badge>
          </div>
        </div>
      </Card>

      {/* Map Container */}
      <div className="flex-1 rounded-lg overflow-hidden border border-border">
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-left" />
          
          {/* Render markers */}
          {filteredMarkers.map(marker => (
            <ThreatMarker
              key={marker.id}
              marker={marker}
              onClick={() => handleMarkerClick(marker)}
            />
          ))}
        </Map>
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
        <span>SEVERITY:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span>Critical</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-orange-600" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-600" />
          <span>Moderate</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-600" />
          <span>Low</span>
        </div>
      </div>

      {/* Incident Detail Sheet */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[400px] border-l border-border overflow-y-auto">
          <SheetHeader className="border-b border-border pb-4">
            <SheetTitle className="text-sm font-mono">
              INCIDENT DETAIL
            </SheetTitle>
            <SheetDescription className="text-[10px] font-mono">
              ID: {selectedMarker?.id || "—"} • {selectedMarker?.category?.toUpperCase() || "—"}
            </SheetDescription>
          </SheetHeader>
          
          {selectedMarker ? (
            <div className="space-y-4 pt-4">
              {/* Severity & Title */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`${getSeverityBgClass(selectedMarker.severity)} text-[10px] font-mono`}>
                    {getSeverityLabel(selectedMarker.severity)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {selectedMarker.confidence}% CONF
                  </Badge>
                </div>
                <h3 className="text-sm font-mono font-medium text-foreground">
                  {selectedMarker.title}
                </h3>
              </div>

              <Separator />

              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                <div>
                  <div className="text-muted-foreground mb-1">LOCATION</div>
                  <div className="flex items-center gap-1 text-foreground">
                    <MapPin className="h-3 w-3" />
                    {selectedMarker.location}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">TIMESTAMP</div>
                  <div className="flex items-center gap-1 text-foreground">
                    <Clock className="h-3 w-3" />
                    {selectedMarker.datetime}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">COORDINATES</div>
                  <div className="text-foreground">
                    {selectedMarker.lat.toFixed(4)}, {selectedMarker.lng.toFixed(4)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">CATEGORY</div>
                  <div className="text-foreground capitalize">
                    {selectedMarker.category}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Placeholder content */}
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] font-mono text-muted-foreground mb-2">INTELLIGENCE SUMMARY</div>
                  <div className="bg-secondary/30 rounded p-3 text-[10px] font-mono text-muted-foreground">
                    [SUMMARY_PLACEHOLDER]
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-mono text-muted-foreground mb-2">SOURCE</div>
                  <div className="bg-secondary/30 rounded p-3 text-[10px] font-mono text-foreground">
                    {selectedMarker.source}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-mono text-muted-foreground mb-2">RECOMMENDED ACTIONS</div>
                  <div className="bg-secondary/30 rounded p-3 text-[10px] font-mono text-muted-foreground">
                    [ACTIONS_PLACEHOLDER]
                  </div>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => selectedMarker && navigate(`/dashboard/incident/${selectedMarker.id}`)}
                  className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-[10px] font-mono py-2 px-3 rounded border border-border cursor-pointer"
                >
                  VIEW FULL REPORT
                </button>
                <button
                  onClick={() => toast.info("Escalation workflow is not yet available.")}
                  className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-mono py-2 px-3 rounded border border-primary/30 cursor-pointer"
                >
                  ESCALATE
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center h-[calc(100%-80px)]">
              <div className="text-center space-y-2">
                <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto" />
                <div className="text-muted-foreground text-xs font-mono">Select an incident</div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
