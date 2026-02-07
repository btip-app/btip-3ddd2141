import { useState, useMemo } from "react";
import Map, { Marker, NavigationControl, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Home,
  ShieldAlert,
  Route,
  Plus,
  MapPin,
  Eye,
  Trash2,
} from "lucide-react";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// --- Types ---

type AssetType = "office" | "residence" | "infrastructure" | "route";

interface Asset {
  id: string;
  name: string;
  type: AssetType;
  lat: number;
  lng: number;
  tags: string[];
}

interface RouteData {
  id: string;
  name: string;
  start: { lat: number; lng: number; label: string };
  end: { lat: number; lng: number; label: string };
  checkpoints: { lat: number; lng: number; label: string }[];
  tags: string[];
}

// --- Mock Data ---

const INITIAL_ASSETS: Asset[] = [
  { id: "a1", name: "Lagos HQ", type: "office", lat: 6.4541, lng: 3.3947, tags: ["primary", "executive"] },
  { id: "a2", name: "Abuja Liaison Office", type: "office", lat: 9.0579, lng: 7.4951, tags: ["liaison"] },
  { id: "a3", name: "Exec Residence - VI", type: "residence", lat: 6.4281, lng: 3.4219, tags: ["vip", "24hr-guard"] },
  { id: "a4", name: "Bonny Island Terminal", type: "infrastructure", lat: 4.4244, lng: 7.1674, tags: ["lng", "critical"] },
  { id: "a5", name: "PHC Refinery Complex", type: "infrastructure", lat: 4.7817, lng: 7.0134, tags: ["refinery", "critical"] },
  { id: "a6", name: "Staff Housing - Lekki", type: "residence", lat: 6.4474, lng: 3.4734, tags: ["staff"] },
];

const INITIAL_ROUTES: RouteData[] = [
  {
    id: "r1",
    name: "Lagos → Abuja Express",
    start: { lat: 6.4541, lng: 3.3947, label: "Lagos HQ" },
    end: { lat: 9.0579, lng: 7.4951, label: "Abuja Office" },
    checkpoints: [
      { lat: 7.7199, lng: 4.9200, label: "Ibadan Checkpoint" },
      { lat: 8.4799, lng: 6.7300, label: "Lokoja Waypoint" },
    ],
    tags: ["primary", "exec-travel"],
  },
  {
    id: "r2",
    name: "PHC → Bonny Island",
    start: { lat: 4.7817, lng: 7.0134, label: "PHC Refinery" },
    end: { lat: 4.4244, lng: 7.1674, label: "Bonny Terminal" },
    checkpoints: [],
    tags: ["logistics", "marine"],
  },
];

// --- Helpers ---

const ASSET_TYPE_META: Record<AssetType, { label: string; icon: typeof Building2; color: string }> = {
  office: { label: "Office / Facility", icon: Building2, color: "hsl(185, 85%, 50%)" },
  residence: { label: "Residence", icon: Home, color: "hsl(45, 95%, 55%)" },
  infrastructure: { label: "Critical Infrastructure", icon: ShieldAlert, color: "hsl(0, 70%, 50%)" },
  route: { label: "Route", icon: Route, color: "hsl(145, 70%, 45%)" },
};

function getRouteGeoJSON(route: RouteData) {
  const coords = [
    [route.start.lng, route.start.lat],
    ...route.checkpoints.map(c => [c.lng, c.lat]),
    [route.end.lng, route.end.lat],
  ];
  return {
    type: "Feature" as const,
    properties: { name: route.name },
    geometry: { type: "LineString" as const, coordinates: coords },
  };
}

// --- Component ---

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [routes, setRoutes] = useState<RouteData[]>(INITIAL_ROUTES);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("assets");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addRouteDialogOpen, setAddRouteDialogOpen] = useState(false);

  // Add asset form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<AssetType>("office");
  const [newLat, setNewLat] = useState("");
  const [newLng, setNewLng] = useState("");
  const [newTags, setNewTags] = useState("");

  // Add route form state
  const [newRouteName, setNewRouteName] = useState("");
  const [newRouteStartLabel, setNewRouteStartLabel] = useState("");
  const [newRouteStartLat, setNewRouteStartLat] = useState("");
  const [newRouteStartLng, setNewRouteStartLng] = useState("");
  const [newRouteEndLabel, setNewRouteEndLabel] = useState("");
  const [newRouteEndLat, setNewRouteEndLat] = useState("");
  const [newRouteEndLng, setNewRouteEndLng] = useState("");
  const [newRouteTags, setNewRouteTags] = useState("");

  const [viewState, setViewState] = useState({
    latitude: 7.5,
    longitude: 5.5,
    zoom: 5.5,
  });

  // Map center on selected asset
  const selectedAsset = useMemo(
    () => assets.find(a => a.id === selectedAssetId) || null,
    [assets, selectedAssetId]
  );

  const selectedRoute = useMemo(
    () => routes.find(r => r.id === selectedRouteId) || null,
    [routes, selectedRouteId]
  );

  const routeGeoJSONs = useMemo(
    () => routes.map(r => ({ id: r.id, geojson: getRouteGeoJSON(r) })),
    [routes]
  );

  function handleSelectAsset(id: string) {
    setSelectedAssetId(id === selectedAssetId ? null : id);
    setSelectedRouteId(null);
    const asset = assets.find(a => a.id === id);
    if (asset) {
      setViewState(prev => ({ ...prev, latitude: asset.lat, longitude: asset.lng, zoom: 10 }));
    }
  }

  function handleSelectRoute(id: string) {
    setSelectedRouteId(id === selectedRouteId ? null : id);
    setSelectedAssetId(null);
    const route = routes.find(r => r.id === id);
    if (route) {
      const midLat = (route.start.lat + route.end.lat) / 2;
      const midLng = (route.start.lng + route.end.lng) / 2;
      setViewState(prev => ({ ...prev, latitude: midLat, longitude: midLng, zoom: 7 }));
    }
  }

  function handleAddAsset() {
    if (!newName || !newLat || !newLng) return;
    const asset: Asset = {
      id: `a${Date.now()}`,
      name: newName,
      type: newType,
      lat: parseFloat(newLat),
      lng: parseFloat(newLng),
      tags: newTags.split(",").map(t => t.trim()).filter(Boolean),
    };
    setAssets(prev => [...prev, asset]);
    setNewName(""); setNewType("office"); setNewLat(""); setNewLng(""); setNewTags("");
    setAddDialogOpen(false);
  }

  function handleAddRoute() {
    if (!newRouteName || !newRouteStartLat || !newRouteStartLng || !newRouteEndLat || !newRouteEndLng) return;
    const route: RouteData = {
      id: `r${Date.now()}`,
      name: newRouteName,
      start: { lat: parseFloat(newRouteStartLat), lng: parseFloat(newRouteStartLng), label: newRouteStartLabel },
      end: { lat: parseFloat(newRouteEndLat), lng: parseFloat(newRouteEndLng), label: newRouteEndLabel },
      checkpoints: [],
      tags: newRouteTags.split(",").map(t => t.trim()).filter(Boolean),
    };
    setRoutes(prev => [...prev, route]);
    setNewRouteName(""); setNewRouteStartLabel(""); setNewRouteStartLat(""); setNewRouteStartLng("");
    setNewRouteEndLabel(""); setNewRouteEndLat(""); setNewRouteEndLng(""); setNewRouteTags("");
    setAddRouteDialogOpen(false);
  }

  function handleDeleteAsset(id: string) {
    setAssets(prev => prev.filter(a => a.id !== id));
    if (selectedAssetId === id) setSelectedAssetId(null);
  }

  function handleDeleteRoute(id: string) {
    setRoutes(prev => prev.filter(r => r.id !== id));
    if (selectedRouteId === id) setSelectedRouteId(null);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-mono font-bold text-foreground">Assets & Routes</h1>
          <p className="text-muted-foreground text-[10px] font-mono">
            {assets.length} assets • {routes.length} routes registered
          </p>
        </div>
      </div>

      {/* Main split: List + Map */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Left panel: Table */}
        <Card className="w-[420px] flex-shrink-0 flex flex-col border-border bg-card overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-3 pt-3">
              <TabsList className="bg-secondary">
                <TabsTrigger value="assets" className="text-[10px] font-mono">ASSETS</TabsTrigger>
                <TabsTrigger value="routes" className="text-[10px] font-mono">ROUTES</TabsTrigger>
              </TabsList>
              {activeTab === "assets" ? (
                <Button size="sm" variant="outline" className="text-[10px] font-mono h-7" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" /> ADD ASSET
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="text-[10px] font-mono h-7" onClick={() => setAddRouteDialogOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" /> ADD ROUTE
                </Button>
              )}
            </div>

            <TabsContent value="assets" className="flex-1 overflow-auto mt-0 px-1 pb-1">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-[9px] font-mono text-muted-foreground w-8"></TableHead>
                    <TableHead className="text-[9px] font-mono text-muted-foreground">NAME</TableHead>
                    <TableHead className="text-[9px] font-mono text-muted-foreground">TYPE</TableHead>
                    <TableHead className="text-[9px] font-mono text-muted-foreground">TAGS</TableHead>
                    <TableHead className="text-[9px] font-mono text-muted-foreground w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map(asset => {
                    const meta = ASSET_TYPE_META[asset.type];
                    const Icon = meta.icon;
                    const isSelected = selectedAssetId === asset.id;
                    return (
                      <TableRow
                        key={asset.id}
                        className={`cursor-pointer border-border ${isSelected ? "bg-primary/10" : "hover:bg-secondary/50"}`}
                        onClick={() => handleSelectAsset(asset.id)}
                      >
                        <TableCell className="py-2 px-2">
                          <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                        </TableCell>
                        <TableCell className="text-[10px] font-mono text-foreground py-2">{asset.name}</TableCell>
                        <TableCell className="text-[10px] font-mono text-muted-foreground py-2">{meta.label}</TableCell>
                        <TableCell className="py-2">
                          <div className="flex gap-1 flex-wrap">
                            {asset.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="outline" className="text-[8px] font-mono px-1 py-0">{tag}</Badge>
                            ))}
                            {asset.tags.length > 2 && (
                              <span className="text-[8px] font-mono text-muted-foreground">+{asset.tags.length - 2}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-2">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost" size="icon"
                              className="h-6 w-6"
                              onClick={(e) => { e.stopPropagation(); handleSelectAsset(asset.id); }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="routes" className="flex-1 overflow-auto mt-0 px-1 pb-1">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-[9px] font-mono text-muted-foreground w-8"></TableHead>
                    <TableHead className="text-[9px] font-mono text-muted-foreground">ROUTE</TableHead>
                    <TableHead className="text-[9px] font-mono text-muted-foreground">FROM → TO</TableHead>
                    <TableHead className="text-[9px] font-mono text-muted-foreground w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map(route => {
                    const isSelected = selectedRouteId === route.id;
                    return (
                      <TableRow
                        key={route.id}
                        className={`cursor-pointer border-border ${isSelected ? "bg-primary/10" : "hover:bg-secondary/50"}`}
                        onClick={() => handleSelectRoute(route.id)}
                      >
                        <TableCell className="py-2 px-2">
                          <Route className="h-3.5 w-3.5" style={{ color: ASSET_TYPE_META.route.color }} />
                        </TableCell>
                        <TableCell className="text-[10px] font-mono text-foreground py-2">{route.name}</TableCell>
                        <TableCell className="text-[10px] font-mono text-muted-foreground py-2">
                          {route.start.label} → {route.end.label}
                          {route.checkpoints.length > 0 && (
                            <span className="text-muted-foreground/60"> ({route.checkpoints.length} stops)</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 px-2">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost" size="icon"
                              className="h-6 w-6"
                              onClick={(e) => { e.stopPropagation(); handleSelectRoute(route.id); }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={(e) => { e.stopPropagation(); handleDeleteRoute(route.id); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Right panel: Map */}
        <div className="flex-1 rounded-lg overflow-hidden border border-border">
          <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-left" />

            {/* Asset markers */}
            {assets.map(asset => {
              const meta = ASSET_TYPE_META[asset.type];
              const isSelected = selectedAssetId === asset.id;
              return (
                <Marker
                  key={asset.id}
                  latitude={asset.lat}
                  longitude={asset.lng}
                  anchor="center"
                  onClick={(e) => { e.originalEvent.stopPropagation(); handleSelectAsset(asset.id); }}
                >
                  <div
                    className={`cursor-pointer rounded-full flex items-center justify-center ${isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}`}
                    style={{
                      width: isSelected ? 28 : 22,
                      height: isSelected ? 28 : 22,
                      backgroundColor: meta.color,
                    }}
                    title={asset.name}
                  >
                    <meta.icon className="text-background" style={{ width: isSelected ? 14 : 11, height: isSelected ? 14 : 11 }} />
                  </div>
                </Marker>
              );
            })}

            {/* Route lines */}
            {routeGeoJSONs.map(({ id, geojson }) => (
              <Source key={id} id={`route-${id}`} type="geojson" data={geojson}>
                <Layer
                  id={`route-line-${id}`}
                  type="line"
                  paint={{
                    "line-color": selectedRouteId === id ? "hsl(185, 85%, 50%)" : "hsl(145, 70%, 45%)",
                    "line-width": selectedRouteId === id ? 4 : 2,
                    "line-opacity": selectedRouteId === id ? 1 : 0.5,
                    "line-dasharray": [2, 2],
                  }}
                />
              </Source>
            ))}

            {/* Route endpoint markers */}
            {routes.map(route => (
              <span key={route.id}>
                <Marker latitude={route.start.lat} longitude={route.start.lng} anchor="center">
                  <div className="w-3 h-3 rounded-full border border-foreground/50" style={{ backgroundColor: "hsl(145, 70%, 45%)" }} title={route.start.label} />
                </Marker>
                <Marker latitude={route.end.lat} longitude={route.end.lng} anchor="center">
                  <div className="w-3 h-3 rounded-sm border border-foreground/50" style={{ backgroundColor: "hsl(0, 70%, 50%)" }} title={route.end.label} />
                </Marker>
                {route.checkpoints.map((cp, i) => (
                  <Marker key={i} latitude={cp.lat} longitude={cp.lng} anchor="center">
                    <div className="w-2.5 h-2.5 rounded-full border border-foreground/30" style={{ backgroundColor: "hsl(45, 95%, 55%)" }} title={cp.label} />
                  </Marker>
                ))}
              </span>
            ))}
          </Map>
        </div>
      </div>

      {/* Map legend */}
      <div className="mt-2 flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
        <span>MARKERS:</span>
        {Object.entries(ASSET_TYPE_META).filter(([k]) => k !== "route").map(([key, meta]) => (
          <div key={key} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: meta.color }} />
            <span>{meta.label}</span>
          </div>
        ))}
        <Separator orientation="vertical" className="h-3" />
        <div className="flex items-center gap-1">
          <div className="w-6 h-0.5" style={{ backgroundColor: "hsl(145, 70%, 45%)" }} />
          <span>Route</span>
        </div>
      </div>

      {/* Add Asset Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono">ADD ASSET</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[10px] font-mono text-muted-foreground">NAME</Label>
              <Input className="mt-1 text-xs font-mono bg-secondary border-border" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Lagos HQ" />
            </div>
            <div>
              <Label className="text-[10px] font-mono text-muted-foreground">TYPE</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as AssetType)}>
                <SelectTrigger className="mt-1 text-xs font-mono bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="office" className="text-xs font-mono">Office / Facility</SelectItem>
                  <SelectItem value="residence" className="text-xs font-mono">Residence</SelectItem>
                  <SelectItem value="infrastructure" className="text-xs font-mono">Critical Infrastructure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] font-mono text-muted-foreground">LATITUDE</Label>
                <Input className="mt-1 text-xs font-mono bg-secondary border-border" value={newLat} onChange={e => setNewLat(e.target.value)} placeholder="6.4541" />
              </div>
              <div>
                <Label className="text-[10px] font-mono text-muted-foreground">LONGITUDE</Label>
                <Input className="mt-1 text-xs font-mono bg-secondary border-border" value={newLng} onChange={e => setNewLng(e.target.value)} placeholder="3.3947" />
              </div>
            </div>
            <div>
              <Label className="text-[10px] font-mono text-muted-foreground">TAGS (comma separated)</Label>
              <Input className="mt-1 text-xs font-mono bg-secondary border-border" value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="primary, critical" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-[10px] font-mono" onClick={() => setAddDialogOpen(false)}>CANCEL</Button>
            <Button size="sm" className="text-[10px] font-mono" onClick={handleAddAsset}>ADD ASSET</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Route Dialog */}
      <Dialog open={addRouteDialogOpen} onOpenChange={setAddRouteDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono">ADD ROUTE</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[10px] font-mono text-muted-foreground">ROUTE NAME</Label>
              <Input className="mt-1 text-xs font-mono bg-secondary border-border" value={newRouteName} onChange={e => setNewRouteName(e.target.value)} placeholder="e.g. Lagos → Abuja Express" />
            </div>
            <Separator />
            <p className="text-[9px] font-mono text-muted-foreground">START POINT</p>
            <div>
              <Label className="text-[10px] font-mono text-muted-foreground">LABEL</Label>
              <Input className="mt-1 text-xs font-mono bg-secondary border-border" value={newRouteStartLabel} onChange={e => setNewRouteStartLabel(e.target.value)} placeholder="Lagos HQ" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] font-mono text-muted-foreground">LAT</Label>
                <Input className="mt-1 text-xs font-mono bg-secondary border-border" value={newRouteStartLat} onChange={e => setNewRouteStartLat(e.target.value)} placeholder="6.4541" />
              </div>
              <div>
                <Label className="text-[10px] font-mono text-muted-foreground">LNG</Label>
                <Input className="mt-1 text-xs font-mono bg-secondary border-border" value={newRouteStartLng} onChange={e => setNewRouteStartLng(e.target.value)} placeholder="3.3947" />
              </div>
            </div>
            <Separator />
            <p className="text-[9px] font-mono text-muted-foreground">END POINT</p>
            <div>
              <Label className="text-[10px] font-mono text-muted-foreground">LABEL</Label>
              <Input className="mt-1 text-xs font-mono bg-secondary border-border" value={newRouteEndLabel} onChange={e => setNewRouteEndLabel(e.target.value)} placeholder="Abuja Office" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] font-mono text-muted-foreground">LAT</Label>
                <Input className="mt-1 text-xs font-mono bg-secondary border-border" value={newRouteEndLat} onChange={e => setNewRouteEndLat(e.target.value)} placeholder="9.0579" />
              </div>
              <div>
                <Label className="text-[10px] font-mono text-muted-foreground">LNG</Label>
                <Input className="mt-1 text-xs font-mono bg-secondary border-border" value={newRouteEndLng} onChange={e => setNewRouteEndLng(e.target.value)} placeholder="7.4951" />
              </div>
            </div>
            <div>
              <Label className="text-[10px] font-mono text-muted-foreground">TAGS (comma separated)</Label>
              <Input className="mt-1 text-xs font-mono bg-secondary border-border" value={newRouteTags} onChange={e => setNewRouteTags(e.target.value)} placeholder="primary, exec-travel" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-[10px] font-mono" onClick={() => setAddRouteDialogOpen(false)}>CANCEL</Button>
            <Button size="sm" className="text-[10px] font-mono" onClick={handleAddRoute}>ADD ROUTE</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
