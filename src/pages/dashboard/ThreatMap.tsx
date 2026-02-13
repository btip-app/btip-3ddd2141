import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useIncidents, type Incident } from "@/hooks/useIncidents";
import EscalateModal from "@/components/dashboard/EscalateModal";
import Map, { Marker, NavigationControl, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Crosshair,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZGljaGlleHBsaWNpdCIsImEiOiJjbWxmM3F3NHIwMG9wM2Vwdnprcjc0cmx1In0.WIfFr47OLll54VZXQy1Vsg";

const THREAT_TYPES = [
  { value: "all", label: "All Threats" },
  { value: "armed-conflict", label: "Armed Conflict" },
  { value: "terrorism", label: "Terrorism" },
  { value: "civil-unrest", label: "Civil Unrest" },
  { value: "crime", label: "Crime / Lawlessness" },
  { value: "political-instability", label: "Political Instability" },
  { value: "piracy", label: "Piracy / Maritime" },
  { value: "kidnapping", label: "Kidnapping" },
  { value: "cyber-attack", label: "Cyber Attack" },
  { value: "natural-disaster", label: "Natural Disaster" },
];

const TIME_WINDOWS = [
  { value: "24h", label: "Last 24 Hours" },
  { value: "48h", label: "Last 48 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
];

function getSeverityColor(severity: number) {
  switch (severity) {
    case 5: return "#ef4444";
    case 4: return "#f97316";
    case 3: return "#eab308";
    case 2: return "#facc15";
    default: return "#6b7280";
  }
}

function getSeverityBgClass(severity: number) {
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
  sources: string[] | null;
  summary: string | null;
  status: string;
}

function incidentToMarker(inc: Incident): MarkerData | null {
  if (inc.lat == null || inc.lng == null) return null;
  return {
    id: inc.id,
    lat: inc.lat,
    lng: inc.lng,
    title: inc.title,
    location: inc.location,
    severity: inc.severity,
    confidence: inc.confidence,
    category: inc.category,
    datetime: inc.datetime,
    sources: inc.sources,
    summary: inc.summary,
    status: inc.status,
  };
}

function ThreatMarker({ marker, onClick }: { marker: MarkerData; onClick: () => void }) {
  const color = getSeverityColor(marker.severity);
  return (
    <Marker latitude={marker.lat} longitude={marker.lng} anchor="center" onClick={(e) => { e.originalEvent.stopPropagation(); onClick(); }}>
      <div className="cursor-pointer relative group" title={marker.title}>
        {marker.severity >= 4 && (
          <div className="absolute inset-0 rounded-full opacity-30" style={{ backgroundColor: color, transform: 'scale(2)' }} />
        )}
        <div className="w-4 h-4 rounded-full border-2 border-white/80 shadow-lg" style={{ backgroundColor: color }} />
      </div>
    </Marker>
  );
}

export default function ThreatMap() {
  const navigate = useNavigate();
  const { incidents, loading } = useIncidents();
  const [showHeatmap, setShowHeatmap] = useState(false);

  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);

  const [threatType, setThreatType] = useState("all");
  const [timeWindow, setTimeWindow] = useState("30d");
  const [severityRange, setSeverityRange] = useState([1, 5]);
  const [confidenceRange, setConfidenceRange] = useState([0, 100]);

  const [viewState, setViewState] = useState({
    latitude: 9.0820,
    longitude: 8.6753,
    zoom: 5.5,
  });

  const allMarkers = useMemo(() => incidents.map(incidentToMarker).filter(Boolean) as MarkerData[], [incidents]);

  // GeoJSON for heatmap layer
  const heatmapGeoJSON = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: allMarkers.map(m => ({
      type: "Feature" as const,
      properties: { severity: m.severity, confidence: m.confidence },
      geometry: { type: "Point" as const, coordinates: [m.lng, m.lat] },
    })),
  }), [allMarkers]);

  const filteredMarkers = useMemo(() => {
    const now = new Date();
    const windowMs: Record<string, number> = {
      "24h": 24 * 3600000,
      "48h": 48 * 3600000,
      "7d": 7 * 86400000,
      "30d": 30 * 86400000,
    };
    const cutoff = new Date(now.getTime() - (windowMs[timeWindow] || windowMs["30d"]));

    return allMarkers.filter(m => {
      if (threatType !== "all" && m.category !== threatType) return false;
      if (m.severity < severityRange[0] || m.severity > severityRange[1]) return false;
      if (m.confidence < confidenceRange[0] || m.confidence > confidenceRange[1]) return false;
      if (new Date(m.datetime) < cutoff) return false;
      return true;
    });
  }, [allMarkers, threatType, timeWindow, severityRange, confidenceRange]);

  const handleMarkerClick = useCallback((marker: MarkerData) => {
    setSelectedMarker(marker);
    setDrawerOpen(true);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] gap-3">
        <Target className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-xs font-mono text-muted-foreground">THREAT MAP UNAVAILABLE</p>
        <p className="text-[10px] font-mono text-muted-foreground/60">Map token not configured.</p>
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
            <Badge variant="outline" className="text-[9px] font-mono text-green-500 border-green-500/30">LIVE</Badge>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-2">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-mono text-muted-foreground">FILTERS:</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">TYPE:</span>
            <Select value={threatType} onValueChange={setThreatType}>
              <SelectTrigger className="w-[140px] h-7 text-[10px] font-mono bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {THREAT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value} className="text-[10px] font-mono">{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">TIME:</span>
            <Select value={timeWindow} onValueChange={setTimeWindow}>
              <SelectTrigger className="w-[130px] h-7 text-[10px] font-mono bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {TIME_WINDOWS.map(tw => (
                  <SelectItem key={tw.value} value={tw.value} className="text-[10px] font-mono">{tw.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">SEVERITY:</span>
            <div className="w-[100px]">
              <Slider value={severityRange} onValueChange={setSeverityRange} min={1} max={5} step={1} className="w-full" />
            </div>
            <span className="text-[10px] font-mono text-foreground w-10">{severityRange[0]}-{severityRange[1]}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">CONF:</span>
            <div className="w-[100px]">
              <Slider value={confidenceRange} onValueChange={setConfidenceRange} min={0} max={100} step={10} className="w-full" />
            </div>
            <span className="text-[10px] font-mono text-foreground w-14">{confidenceRange[0]}-{confidenceRange[1]}%</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant={showHeatmap ? "default" : "outline"}
              size="sm"
              className="text-[10px] font-mono h-7"
              onClick={() => setShowHeatmap(!showHeatmap)}
            >
              {showHeatmap ? "MARKERS" : "HEATMAP"}
            </Button>
            <Badge variant="outline" className="text-[10px] font-mono">
              <Crosshair className="h-3 w-3 mr-1" />
              {filteredMarkers.length} / {allMarkers.length} INCIDENTS
            </Badge>
          </div>
        </div>
      </Card>

      {/* Map */}
      <div className="flex-1 rounded-lg overflow-hidden border border-border">
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="top-left" />
          {showHeatmap ? (
            <Source type="geojson" data={heatmapGeoJSON}>
              <Layer
                id="incident-heat"
                type="heatmap"
                paint={{
                  'heatmap-weight': ['interpolate', ['linear'], ['get', 'severity'], 1, 0.2, 3, 0.5, 5, 1],
                  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
                  'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 15, 9, 40],
                  'heatmap-opacity': 0.7,
                  'heatmap-color': [
                    'interpolate', ['linear'], ['heatmap-density'],
                    0, 'rgba(0,0,0,0)',
                    0.2, 'rgba(0,128,255,0.4)',
                    0.4, 'rgba(0,200,150,0.5)',
                    0.6, 'rgba(255,200,0,0.6)',
                    0.8, 'rgba(255,100,0,0.8)',
                    1, 'rgba(255,0,0,0.9)',
                  ],
                }}
              />
            </Source>
          ) : (
            filteredMarkers.map(marker => (
              <ThreatMarker key={marker.id} marker={marker} onClick={() => handleMarkerClick(marker)} />
            ))
          )}
        </Map>
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
        <span>SEVERITY:</span>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-destructive" /><span>Critical</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-600" /><span>High</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-600" /><span>Moderate</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-600" /><span>Low</span></div>
      </div>

      {/* Incident Detail Sheet */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[400px] border-l border-border overflow-y-auto">
          <SheetHeader className="border-b border-border pb-4">
            <SheetTitle className="text-sm font-mono">INCIDENT DETAIL</SheetTitle>
            <SheetDescription className="text-[10px] font-mono">
              ID: {selectedMarker?.id.slice(0, 8) || "—"} • {selectedMarker?.category?.toUpperCase() || "—"} • {selectedMarker?.status?.toUpperCase()}
            </SheetDescription>
          </SheetHeader>

          {selectedMarker ? (
            <div className="space-y-4 pt-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`${getSeverityBgClass(selectedMarker.severity)} text-[10px] font-mono`}>
                    {getSeverityLabel(selectedMarker.severity)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {selectedMarker.confidence}% CONF
                  </Badge>
                </div>
                <h3 className="text-sm font-mono font-medium text-foreground">{selectedMarker.title}</h3>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                <div>
                  <div className="text-muted-foreground mb-1">LOCATION</div>
                  <div className="flex items-center gap-1 text-foreground">
                    <MapPin className="h-3 w-3" />{selectedMarker.location}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">TIMESTAMP</div>
                  <div className="flex items-center gap-1 text-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(selectedMarker.datetime), "yyyy-MM-dd HH:mm")}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">COORDINATES</div>
                  <div className="text-foreground">{selectedMarker.lat.toFixed(4)}, {selectedMarker.lng.toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">CATEGORY</div>
                  <div className="text-foreground capitalize">{selectedMarker.category}</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <div className="text-[10px] font-mono text-muted-foreground mb-2">INTELLIGENCE SUMMARY</div>
                  <div className="bg-secondary/30 rounded p-3 text-[10px] font-mono text-muted-foreground">
                    {selectedMarker.summary || "No summary available."}
                  </div>
                </div>
                {selectedMarker.sources && selectedMarker.sources.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono text-muted-foreground mb-2">SOURCES</div>
                    <div className="bg-secondary/30 rounded p-3 text-[10px] font-mono text-foreground space-y-1">
                      {selectedMarker.sources.map((s, i) => <div key={i}>• {s}</div>)}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/dashboard/incident/${selectedMarker.id}`)}
                  className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-[10px] font-mono py-2 px-3 rounded border border-border cursor-pointer"
                >
                  VIEW FULL REPORT
                </button>
                <button
                  onClick={() => setEscalateOpen(true)}
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
      {selectedMarker && (
        <EscalateModal open={escalateOpen} onOpenChange={setEscalateOpen} incidentId={selectedMarker.id} incidentTitle={selectedMarker.title} />
      )}
    </div>
  );
}
