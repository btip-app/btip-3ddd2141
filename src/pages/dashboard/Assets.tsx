import { useState, useMemo } from "react";
import { useIncidents } from "@/hooks/useIncidents";
import { useAssets, type Asset, type RouteData } from "@/hooks/useAssets";
import { useAuth } from "@/contexts/AuthContext";
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
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  REGIONS as GEO_REGIONS,
  getCountriesForRegion,
  getSubdivisionsForCountry,
  getSubdivisionTerm,
  type Country,
  type Subdivision,
} from "@/data/geography";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

type AssetType = "office" | "residence" | "infrastructure" | "route";

interface ProximityIncident {
  id: string;
  lat: number;
  lng: number;
  title: string;
  category: string;
  severity: number;
}

const PROXIMITY_RADIUS_KM = 10;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceToRoute(lat: number, lng: number, route: RouteData): number {
  const points = [
    { lat: route.start_lat, lng: route.start_lng },
    ...route.checkpoints,
    { lat: route.end_lat, lng: route.end_lng },
  ];
  let minDist = Infinity;
  for (const pt of points) {
    const d = haversineKm(lat, lng, pt.lat, pt.lng);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

const ASSET_TYPE_META: Record<AssetType, { label: string; icon: typeof Building2; color: string }> = {
  office: { label: "Office / Facility", icon: Building2, color: "hsl(185, 85%, 50%)" },
  residence: { label: "Residence", icon: Home, color: "hsl(45, 95%, 55%)" },
  infrastructure: { label: "Critical Infrastructure", icon: ShieldAlert, color: "hsl(0, 70%, 50%)" },
  route: { label: "Route", icon: Route, color: "hsl(145, 70%, 45%)" },
};

function geoLabel(item: { region?: string | null; country?: string | null; subdivision?: string | null }): string {
  const parts: string[] = [];
  if (item.subdivision) {
    const subs = item.country ? getSubdivisionsForCountry(item.country) : [];
    const sub = subs.find(s => s.value === item.subdivision);
    if (sub) parts.push(sub.label);
  }
  if (item.country) {
    const countries = item.region ? getCountriesForRegion(item.region) : GEO_REGIONS.flatMap(r => r.countries);
    const c = countries.find(co => co.value === item.country);
    if (c) parts.push(c.label);
  }
  return parts.join(", ") || "";
}

function GeoSelectors({
  region, country, subdivision,
  onRegionChange, onCountryChange, onSubdivisionChange,
  countryOptions, subdivisionOptions, subdivisionLabel,
}: {
  region: string; country: string; subdivision: string;
  onRegionChange: (v: string) => void;
  onCountryChange: (v: string) => void;
  onSubdivisionChange: (v: string) => void;
  countryOptions: Country[];
  subdivisionOptions: Subdivision[];
  subdivisionLabel: string;
}) {
  return (
    <>
      <Separator />
      <p className="text-[9px] font-mono text-muted-foreground">LOCATION</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] font-mono text-muted-foreground">REGION</Label>
          <Select value={region} onValueChange={onRegionChange}>
            <SelectTrigger className="mt-1 text-xs font-mono bg-secondary border-border"><SelectValue placeholder="Select region" /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              {GEO_REGIONS.map(r => (<SelectItem key={r.value} value={r.value} className="text-xs font-mono">{r.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] font-mono text-muted-foreground">COUNTRY</Label>
          <Select value={country} onValueChange={onCountryChange} disabled={!region}>
            <SelectTrigger className="mt-1 text-xs font-mono bg-secondary border-border"><SelectValue placeholder="Select country" /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              {countryOptions.map(c => (<SelectItem key={c.value} value={c.value} className="text-xs font-mono">{c.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {country && subdivisionOptions.length > 0 && (
        <div>
          <Label className="text-[10px] font-mono text-muted-foreground">{subdivisionLabel.toUpperCase()}</Label>
          <Select value={subdivision} onValueChange={onSubdivisionChange}>
            <SelectTrigger className="mt-1 text-xs font-mono bg-secondary border-border"><SelectValue placeholder={`Select ${subdivisionLabel.toLowerCase()}`} /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              {subdivisionOptions.map(s => (<SelectItem key={s.value} value={s.value} className="text-xs font-mono">{s.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
}

function getRouteGeoJSON(route: RouteData) {
  const coords = [
    [route.start_lng, route.start_lat],
    ...route.checkpoints.map(c => [c.lng, c.lat]),
    [route.end_lng, route.end_lat],
  ];
  return {
    type: "Feature" as const,
    properties: { name: route.name },
    geometry: { type: "LineString" as const, coordinates: coords },
  };
}

export default function Assets() {
  const { user } = useAuth();
  const { incidents, loading: incidentsLoading } = useIncidents();
  const { assets, routes, loading: assetsLoading, addAsset, deleteAsset, addRoute, deleteRoute } = useAssets();
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
  const [newRegion, setNewRegion] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newSubdivision, setNewSubdivision] = useState("");

  // Add route form state
  const [newRouteName, setNewRouteName] = useState("");
  const [newRouteStartLabel, setNewRouteStartLabel] = useState("");
  const [newRouteStartLat, setNewRouteStartLat] = useState("");
  const [newRouteStartLng, setNewRouteStartLng] = useState("");
  const [newRouteEndLabel, setNewRouteEndLabel] = useState("");
  const [newRouteEndLat, setNewRouteEndLat] = useState("");
  const [newRouteEndLng, setNewRouteEndLng] = useState("");
  const [newRouteTags, setNewRouteTags] = useState("");
  const [newRouteRegion, setNewRouteRegion] = useState("");
  const [newRouteCountry, setNewRouteCountry] = useState("");
  const [newRouteSubdivision, setNewRouteSubdivision] = useState("");

  const newCountryOptions = useMemo(() => newRegion ? getCountriesForRegion(newRegion) : [], [newRegion]);
  const newSubdivisionOptions = useMemo(() => newCountry ? getSubdivisionsForCountry(newCountry) : [], [newCountry]);
  const newSubdivisionLabel = useMemo(() => newCountry ? getSubdivisionTerm(newCountry) : "Subdivision", [newCountry]);

  const newRouteCountryOptions = useMemo(() => newRouteRegion ? getCountriesForRegion(newRouteRegion) : [], [newRouteRegion]);
  const newRouteSubdivisionOptions = useMemo(() => newRouteCountry ? getSubdivisionsForCountry(newRouteCountry) : [], [newRouteCountry]);
  const newRouteSubdivisionLabel = useMemo(() => newRouteCountry ? getSubdivisionTerm(newRouteCountry) : "Subdivision", [newRouteCountry]);

  const [viewState, setViewState] = useState({ latitude: 7.5, longitude: 5.5, zoom: 5.5 });

  const selectedAsset = useMemo(() => assets.find(a => a.id === selectedAssetId) || null, [assets, selectedAssetId]);
  const selectedRoute = useMemo(() => routes.find(r => r.id === selectedRouteId) || null, [routes, selectedRouteId]);

  const routeGeoJSONs = useMemo(() => routes.map(r => ({ id: r.id, geojson: getRouteGeoJSON(r) })), [routes]);

  const proximityIncidents: ProximityIncident[] = useMemo(() =>
    incidents.filter(i => i.lat != null && i.lng != null)
      .map(i => ({ id: i.id, lat: i.lat!, lng: i.lng!, title: i.title, category: i.category, severity: i.severity })),
    [incidents]
  );

  const assetProximity = useMemo(() => {
    const map: Record<string, ProximityIncident[]> = {};
    for (const asset of assets) map[asset.id] = proximityIncidents.filter(inc => haversineKm(asset.lat, asset.lng, inc.lat, inc.lng) <= PROXIMITY_RADIUS_KM);
    return map;
  }, [assets, proximityIncidents]);

  const routeProximity = useMemo(() => {
    const map: Record<string, ProximityIncident[]> = {};
    for (const route of routes) map[route.id] = proximityIncidents.filter(inc => distanceToRoute(inc.lat, inc.lng, route) <= PROXIMITY_RADIUS_KM);
    return map;
  }, [routes, proximityIncidents]);

  function handleSelectAsset(id: string) {
    setSelectedAssetId(id === selectedAssetId ? null : id);
    setSelectedRouteId(null);
    const asset = assets.find(a => a.id === id);
    if (asset) setViewState(prev => ({ ...prev, latitude: asset.lat, longitude: asset.lng, zoom: 10 }));
  }

  function handleSelectRoute(id: string) {
    setSelectedRouteId(id === selectedRouteId ? null : id);
    setSelectedAssetId(null);
    const route = routes.find(r => r.id === id);
    if (route) {
      const midLat = (route.start_lat + route.end_lat) / 2;
      const midLng = (route.start_lng + route.end_lng) / 2;
      setViewState(prev => ({ ...prev, latitude: midLat, longitude: midLng, zoom: 7 }));
    }
  }

  async function handleAddAsset() {
    if (!newName || !newLat || !newLng || !user) return;
    const error = await addAsset({
      user_id: user.id,
      name: newName,
      type: newType,
      lat: parseFloat(newLat),
      lng: parseFloat(newLng),
      tags: newTags.split(",").map(t => t.trim()).filter(Boolean),
      region: newRegion || null,
      country: newCountry || null,
      subdivision: newSubdivision || null,
    });
    if (error) { toast.error('Failed to add asset', { description: error.message }); return; }
    toast.success('Asset added');
    setNewName(""); setNewType("office"); setNewLat(""); setNewLng(""); setNewTags("");
    setNewRegion(""); setNewCountry(""); setNewSubdivision("");
    setAddDialogOpen(false);
  }

  async function handleAddRoute() {
    if (!newRouteName || !newRouteStartLat || !newRouteStartLng || !newRouteEndLat || !newRouteEndLng || !user) return;
    const error = await addRoute({
      user_id: user.id,
      name: newRouteName,
      start_label: newRouteStartLabel,
      start_lat: parseFloat(newRouteStartLat),
      start_lng: parseFloat(newRouteStartLng),
      end_label: newRouteEndLabel,
      end_lat: parseFloat(newRouteEndLat),
      end_lng: parseFloat(newRouteEndLng),
      checkpoints: [],
      tags: newRouteTags.split(",").map(t => t.trim()).filter(Boolean),
      region: newRouteRegion || null,
      country: newRouteCountry || null,
      subdivision: newRouteSubdivision || null,
    });
    if (error) { toast.error('Failed to add route', { description: error.message }); return; }
    toast.success('Route added');
    setNewRouteName(""); setNewRouteStartLabel(""); setNewRouteStartLat(""); setNewRouteStartLng("");
    setNewRouteEndLabel(""); setNewRouteEndLat(""); setNewRouteEndLng(""); setNewRouteTags("");
    setNewRouteRegion(""); setNewRouteCountry(""); setNewRouteSubdivision("");
    setAddRouteDialogOpen(false);
  }

  async function handleDeleteAsset(id: string) {
    const error = await deleteAsset(id);
    if (error) toast.error('Failed to delete asset');
    else if (selectedAssetId === id) setSelectedAssetId(null);
  }

  async function handleDeleteRoute(id: string) {
    const error = await deleteRoute(id);
    if (error) toast.error('Failed to delete route');
    else if (selectedRouteId === id) setSelectedRouteId(null);
  }

  const loading = assetsLoading || incidentsLoading;

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] gap-3">
        <ShieldAlert className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-xs font-mono text-muted-foreground">ASSETS MAP UNAVAILABLE</p>
        <p className="text-[10px] font-mono text-muted-foreground/60">Map token not configured.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-mono font-bold text-foreground">Assets & Routes</h1>
          <p className="text-muted-foreground text-[10px] font-mono">
            {loading ? 'Loading...' : `${assets.length} assets • ${routes.length} routes registered`}
          </p>
        </div>
      </div>

      <div className="flex-1 flex gap-3 min-h-0">
        {/* Left panel */}
        <Card className="w-[420px] flex-shrink-0 flex flex-col border-border bg-card overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-3 pt-3">
              <TabsList className="bg-secondary">
                <TabsTrigger value="assets" className="text-[10px] font-mono">ASSETS</TabsTrigger>
                <TabsTrigger value="routes" className="text-[10px] font-mono">ROUTES</TabsTrigger>
              </TabsList>
              <Button variant="outline" size="sm" className="text-[10px] font-mono h-7" onClick={() => activeTab === "assets" ? setAddDialogOpen(true) : setAddRouteDialogOpen(true)}>
                <Plus className="h-3 w-3 mr-1" /> ADD {activeTab === "assets" ? "ASSET" : "ROUTE"}
              </Button>
            </div>

            <TabsContent value="assets" className="flex-1 overflow-auto mt-0 px-1 pb-2">
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-[9px] font-mono text-muted-foreground">NAME</TableHead>
                      <TableHead className="text-[9px] font-mono text-muted-foreground">TYPE</TableHead>
                      <TableHead className="text-[9px] font-mono text-muted-foreground">THREATS</TableHead>
                      <TableHead className="text-[9px] font-mono text-muted-foreground w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map(asset => {
                      const nearby = assetProximity[asset.id] || [];
                      const TypeIcon = ASSET_TYPE_META[asset.type as AssetType]?.icon || Building2;
                      return (
                        <TableRow key={asset.id} className={`border-border cursor-pointer ${selectedAssetId === asset.id ? 'bg-primary/10' : 'hover:bg-secondary/50'}`} onClick={() => handleSelectAsset(asset.id)}>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              <TypeIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: ASSET_TYPE_META[asset.type as AssetType]?.color }} />
                              <div>
                                <div className="text-[10px] font-mono font-medium text-foreground">{asset.name}</div>
                                <div className="text-[8px] font-mono text-muted-foreground">{geoLabel(asset)}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-[9px] font-mono text-muted-foreground py-2 capitalize">{asset.type}</TableCell>
                          <TableCell className="py-2">
                            {nearby.length > 0 ? (
                              <Badge variant="destructive" className="text-[8px] font-mono px-1.5 py-0">{nearby.length}</Badge>
                            ) : (
                              <span className="text-[8px] font-mono text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleSelectAsset(asset.id); }}><Eye className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id); }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {assets.length === 0 && !loading && (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-[10px] font-mono text-muted-foreground">No assets registered. Click ADD ASSET to create one.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="routes" className="flex-1 overflow-auto mt-0 px-1 pb-2">
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-[9px] font-mono text-muted-foreground">ROUTE</TableHead>
                      <TableHead className="text-[9px] font-mono text-muted-foreground">THREATS</TableHead>
                      <TableHead className="text-[9px] font-mono text-muted-foreground w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routes.map(route => {
                      const nearby = routeProximity[route.id] || [];
                      return (
                        <TableRow key={route.id} className={`border-border cursor-pointer ${selectedRouteId === route.id ? 'bg-primary/10' : 'hover:bg-secondary/50'}`} onClick={() => handleSelectRoute(route.id)}>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-2">
                              <Route className="h-3.5 w-3.5 flex-shrink-0" style={{ color: ASSET_TYPE_META.route.color }} />
                              <div>
                                <div className="text-[10px] font-mono font-medium text-foreground">{route.name}</div>
                                <div className="text-[8px] font-mono text-muted-foreground">{route.start_label} → {route.end_label}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            {nearby.length > 0 ? (
                              <Badge variant="destructive" className="text-[8px] font-mono px-1.5 py-0">{nearby.length}</Badge>
                            ) : (
                              <span className="text-[8px] font-mono text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleSelectRoute(route.id); }}><Eye className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteRoute(route.id); }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {routes.length === 0 && !loading && (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-[10px] font-mono text-muted-foreground">No routes registered. Click ADD ROUTE to create one.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        {/* Right: Map */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 rounded-lg overflow-hidden border border-border">
            <Map {...viewState} onMove={evt => setViewState(evt.viewState)} mapboxAccessToken={MAPBOX_TOKEN} mapStyle="mapbox://styles/mapbox/dark-v11" style={{ width: '100%', height: '100%' }}>
              <NavigationControl position="top-left" />
              {/* Asset markers */}
              {assets.map(asset => {
                const meta = ASSET_TYPE_META[asset.type as AssetType] || ASSET_TYPE_META.office;
                return (
                  <Marker key={asset.id} latitude={asset.lat} longitude={asset.lng} anchor="center" onClick={e => { e.originalEvent.stopPropagation(); handleSelectAsset(asset.id); }}>
                    <div className="cursor-pointer relative group" title={asset.name}>
                      <div className="w-5 h-5 rounded-full border-2 border-white/80 shadow-lg flex items-center justify-center" style={{ backgroundColor: meta.color }}>
                        <meta.icon className="h-2.5 w-2.5 text-white" />
                      </div>
                    </div>
                  </Marker>
                );
              })}
              {/* Route lines */}
              {routeGeoJSONs.map(({ id, geojson }) => (
                <Source key={id} type="geojson" data={geojson as any}>
                  <Layer id={`route-${id}`} type="line" paint={{ 'line-color': selectedRouteId === id ? '#22c55e' : '#6366f1', 'line-width': selectedRouteId === id ? 4 : 2, 'line-opacity': 0.8 }} />
                </Source>
              ))}
              {/* Route start/end markers */}
              {routes.map(route => (
                <div key={route.id}>
                  <Marker latitude={route.start_lat} longitude={route.start_lng} anchor="center">
                    <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white/80 shadow" title={route.start_label} />
                  </Marker>
                  <Marker latitude={route.end_lat} longitude={route.end_lng} anchor="center">
                    <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white/80 shadow" title={route.end_label} />
                  </Marker>
                </div>
              ))}
            </Map>
          </div>

          {/* Detail panel */}
          {(selectedAsset || selectedRoute) && (
            <Card className="mt-2 p-3 bg-card border-border">
              {selectedAsset && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {(() => { const meta = ASSET_TYPE_META[selectedAsset.type as AssetType] || ASSET_TYPE_META.office; return <meta.icon className="h-4 w-4" style={{ color: meta.color }} />; })()}
                    <span className="text-xs font-mono font-bold text-foreground">{selectedAsset.name}</span>
                    <Badge variant="outline" className="text-[8px] font-mono capitalize">{selectedAsset.type}</Badge>
                  </div>
                  <div className="flex gap-4 text-[10px] font-mono text-muted-foreground">
                    <span><MapPin className="h-3 w-3 inline mr-0.5" />{selectedAsset.lat.toFixed(4)}, {selectedAsset.lng.toFixed(4)}</span>
                    <span>{geoLabel(selectedAsset)}</span>
                  </div>
                  {selectedAsset.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">{selectedAsset.tags.map(t => <Badge key={t} variant="outline" className="text-[8px] font-mono">{t}</Badge>)}</div>
                  )}
                  {(assetProximity[selectedAsset.id] || []).length > 0 && (
                    <div>
                      <div className="text-[9px] font-mono text-muted-foreground mt-2 mb-1">NEARBY THREATS ({(assetProximity[selectedAsset.id] || []).length})</div>
                      {(assetProximity[selectedAsset.id] || []).map(inc => (
                        <div key={inc.id} className="flex items-center gap-2 text-[9px] font-mono">
                          <AlertTriangle className="h-2.5 w-2.5 text-destructive" />
                          <span className="text-foreground truncate">{inc.title}</span>
                          <Badge variant="outline" className="text-[7px] font-mono px-1 py-0 ml-auto">SEV-{inc.severity}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {selectedRoute && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4" style={{ color: ASSET_TYPE_META.route.color }} />
                    <span className="text-xs font-mono font-bold text-foreground">{selectedRoute.name}</span>
                  </div>
                  <div className="flex gap-4 text-[10px] font-mono text-muted-foreground">
                    <span>{selectedRoute.start_label} → {selectedRoute.end_label}</span>
                    <span>{geoLabel(selectedRoute)}</span>
                  </div>
                  {selectedRoute.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">{selectedRoute.tags.map(t => <Badge key={t} variant="outline" className="text-[8px] font-mono">{t}</Badge>)}</div>
                  )}
                  {(routeProximity[selectedRoute.id] || []).length > 0 && (
                    <div>
                      <div className="text-[9px] font-mono text-muted-foreground mt-2 mb-1">ROUTE THREATS ({(routeProximity[selectedRoute.id] || []).length})</div>
                      {(routeProximity[selectedRoute.id] || []).map(inc => (
                        <div key={inc.id} className="flex items-center gap-2 text-[9px] font-mono">
                          <AlertTriangle className="h-2.5 w-2.5 text-destructive" />
                          <span className="text-foreground truncate">{inc.title}</span>
                          <Badge variant="outline" className="text-[7px] font-mono px-1 py-0 ml-auto">SEV-{inc.severity}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Legend */}
          <div className="mt-2 flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
            {Object.entries(ASSET_TYPE_META).map(([key, meta]) => (
              <div key={key} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: meta.color }} />
                <span>{meta.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Asset Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader><DialogTitle className="text-sm font-mono">ADD ASSET</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-[10px] font-mono text-muted-foreground">NAME</Label><Input value={newName} onChange={e => setNewName(e.target.value)} className="mt-1 text-xs font-mono bg-secondary border-border" /></div>
            <div><Label className="text-[10px] font-mono text-muted-foreground">TYPE</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as AssetType)}>
                <SelectTrigger className="mt-1 text-xs font-mono bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {Object.entries(ASSET_TYPE_META).filter(([k]) => k !== 'route').map(([k, v]) => (<SelectItem key={k} value={k} className="text-xs font-mono">{v.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px] font-mono text-muted-foreground">LATITUDE</Label><Input type="number" step="any" value={newLat} onChange={e => setNewLat(e.target.value)} className="mt-1 text-xs font-mono bg-secondary border-border" /></div>
              <div><Label className="text-[10px] font-mono text-muted-foreground">LONGITUDE</Label><Input type="number" step="any" value={newLng} onChange={e => setNewLng(e.target.value)} className="mt-1 text-xs font-mono bg-secondary border-border" /></div>
            </div>
            <div><Label className="text-[10px] font-mono text-muted-foreground">TAGS (comma-separated)</Label><Input value={newTags} onChange={e => setNewTags(e.target.value)} className="mt-1 text-xs font-mono bg-secondary border-border" placeholder="e.g. critical, vip" /></div>
            <GeoSelectors region={newRegion} country={newCountry} subdivision={newSubdivision}
              onRegionChange={(v) => { setNewRegion(v); setNewCountry(""); setNewSubdivision(""); }}
              onCountryChange={(v) => { setNewCountry(v); setNewSubdivision(""); }}
              onSubdivisionChange={setNewSubdivision}
              countryOptions={newCountryOptions} subdivisionOptions={newSubdivisionOptions} subdivisionLabel={newSubdivisionLabel} />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs font-mono" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button size="sm" className="text-xs font-mono" onClick={handleAddAsset} disabled={!newName || !newLat || !newLng}>Add Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Route Dialog */}
      <Dialog open={addRouteDialogOpen} onOpenChange={setAddRouteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader><DialogTitle className="text-sm font-mono">ADD ROUTE</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-[10px] font-mono text-muted-foreground">ROUTE NAME</Label><Input value={newRouteName} onChange={e => setNewRouteName(e.target.value)} className="mt-1 text-xs font-mono bg-secondary border-border" /></div>
            <Separator />
            <p className="text-[9px] font-mono text-muted-foreground">START POINT</p>
            <div><Label className="text-[10px] font-mono text-muted-foreground">LABEL</Label><Input value={newRouteStartLabel} onChange={e => setNewRouteStartLabel(e.target.value)} className="mt-1 text-xs font-mono bg-secondary border-border" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px] font-mono text-muted-foreground">LAT</Label><Input type="number" step="any" value={newRouteStartLat} onChange={e => setNewRouteStartLat(e.target.value)} className="mt-1 text-xs font-mono bg-secondary border-border" /></div>
              <div><Label className="text-[10px] font-mono text-muted-foreground">LNG</Label><Input type="number" step="any" value={newRouteStartLng} onChange={e => setNewRouteStartLng(e.target.value)} className="mt-1 text-xs font-mono bg-secondary border-border" /></div>
            </div>
            <Separator />
            <p className="text-[9px] font-mono text-muted-foreground">END POINT</p>
            <div><Label className="text-[10px] font-mono text-muted-foreground">LABEL</Label><Input value={newRouteEndLabel} onChange={e => setNewRouteEndLabel(e.target.value)} className="mt-1 text-xs font-mono bg-secondary border-border" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px] font-mono text-muted-foreground">LAT</Label><Input type="number" step="any" value={newRouteEndLat} onChange={e => setNewRouteEndLat(e.target.value)} className="mt-1 text-xs font-mono bg-secondary border-border" /></div>
              <div><Label className="text-[10px] font-mono text-muted-foreground">LNG</Label><Input type="number" step="any" value={newRouteEndLng} onChange={e => setNewRouteEndLng(e.target.value)} className="mt-1 text-xs font-mono bg-secondary border-border" /></div>
            </div>
            <div><Label className="text-[10px] font-mono text-muted-foreground">TAGS (comma-separated)</Label><Input value={newRouteTags} onChange={e => setNewRouteTags(e.target.value)} className="mt-1 text-xs font-mono bg-secondary border-border" /></div>
            <GeoSelectors region={newRouteRegion} country={newRouteCountry} subdivision={newRouteSubdivision}
              onRegionChange={(v) => { setNewRouteRegion(v); setNewRouteCountry(""); setNewRouteSubdivision(""); }}
              onCountryChange={(v) => { setNewRouteCountry(v); setNewRouteSubdivision(""); }}
              onSubdivisionChange={setNewRouteSubdivision}
              countryOptions={newRouteCountryOptions} subdivisionOptions={newRouteSubdivisionOptions} subdivisionLabel={newRouteSubdivisionLabel} />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs font-mono" onClick={() => setAddRouteDialogOpen(false)}>Cancel</Button>
            <Button size="sm" className="text-xs font-mono" onClick={handleAddRoute} disabled={!newRouteName || !newRouteStartLat || !newRouteEndLat}>Add Route</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
