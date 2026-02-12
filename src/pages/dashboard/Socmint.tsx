import { useMemo, useState } from "react";
import { useIncidents, type Incident } from "@/hooks/useIncidents";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Loader2, MessageSquare, Globe, Hash, Radio, BarChart3, Shield, CloudRain, Search } from "lucide-react";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

// Map analyst field to platform metadata
const PLATFORM_META: Record<string, { label: string; icon: typeof MessageSquare; color: string }> = {
  "reddit-socmint": { label: "Reddit", icon: MessageSquare, color: "hsl(16, 100%, 50%)" },
  "twitter-socmint": { label: "Twitter / X", icon: Hash, color: "hsl(203, 89%, 53%)" },
  "telegram-socmint": { label: "Telegram", icon: Radio, color: "hsl(200, 80%, 55%)" },
  "meta-socmint": { label: "Meta", icon: Globe, color: "hsl(220, 60%, 50%)" },
};

const SOCMINT_ANALYSTS = Object.keys(PLATFORM_META);

function getSeverityBadge(severity: number) {
  switch (severity) {
    case 5: return { label: "CRITICAL", className: "bg-destructive text-destructive-foreground" };
    case 4: return { label: "HIGH", className: "bg-orange-600 text-white" };
    case 3: return { label: "MODERATE", className: "bg-amber-600 text-white" };
    case 2: return { label: "LOW", className: "bg-yellow-600 text-black" };
    default: return { label: "INFO", className: "bg-muted text-muted-foreground" };
  }
}

export default function Socmint() {
  const { incidents, loading } = useIncidents();
  const [platformFilter, setPlatformFilter] = useState("all");
  const [ipQuery, setIpQuery] = useState("");
  const [ipResults, setIpResults] = useState<any[]>([]);
  const [checkingIp, setCheckingIp] = useState(false);
  const [weatherData, setWeatherData] = useState<any[]>([]);
  const [loadingWeather, setLoadingWeather] = useState(false);

  async function handleCheckIp() {
    if (!ipQuery.trim()) return;
    setCheckingIp(true);
    try {
      const ips = ipQuery.split(",").map((s) => s.trim()).filter(Boolean);
      const { data, error } = await supabase.functions.invoke("check-ip-reputation", {
        body: { ips },
      });
      if (error) throw error;
      setIpResults(data.results || []);
      toast.success(`Checked ${data.checked} IP(s)`);
    } catch (e: any) {
      toast.error(e.message || "IP check failed");
    } finally {
      setCheckingIp(false);
    }
  }

  async function handleLoadWeather() {
    setLoadingWeather(true);
    try {
      const { data, error } = await supabase.functions.invoke("weather-risk", { body: {} });
      if (error) throw error;
      setWeatherData(data.regions || []);
      if (data.regions?.length === 0) {
        toast.info("No monitored regions configured. Add regions from Daily Brief.");
      } else {
        toast.success(`Weather data loaded for ${data.regions.length} regions`);
      }
    } catch (e: any) {
      toast.error(e.message || "Weather fetch failed");
    } finally {
      setLoadingWeather(false);
    }
  }

  // Filter to only SOCMINT-sourced incidents
  const socmintIncidents = useMemo(
    () => incidents.filter((i) => i.analyst && SOCMINT_ANALYSTS.includes(i.analyst)),
    [incidents]
  );

  const filtered = useMemo(() => {
    if (platformFilter === "all") return socmintIncidents;
    return socmintIncidents.filter((i) => i.analyst === platformFilter);
  }, [socmintIncidents, platformFilter]);

  // Stats by platform
  const platformStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const i of socmintIncidents) {
      const key = i.analyst ?? "unknown";
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts).map(([analyst, count]) => ({
      analyst,
      label: PLATFORM_META[analyst]?.label ?? analyst,
      count,
      color: PLATFORM_META[analyst]?.color ?? "hsl(0,0%,50%)",
    }));
  }, [socmintIncidents]);

  // Severity distribution
  const severityStats = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    for (const i of socmintIncidents) counts[i.severity - 1]++;
    return [
      { name: "Info", value: counts[0], fill: "hsl(var(--muted))" },
      { name: "Low", value: counts[1], fill: "hsl(50, 80%, 50%)" },
      { name: "Moderate", value: counts[2], fill: "hsl(40, 90%, 50%)" },
      { name: "High", value: counts[3], fill: "hsl(25, 95%, 50%)" },
      { name: "Critical", value: counts[4], fill: "hsl(var(--destructive))" },
    ].filter((d) => d.value > 0);
  }, [socmintIncidents]);

  // Category breakdown
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const i of socmintIncidents) {
      counts[i.category] = (counts[i.category] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [socmintIncidents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="tracking-tight">SOCMINT</span> Dashboard
          </h1>
          <p className="text-muted-foreground text-[10px] font-mono">
            {socmintIncidents.length} incidents from social media intelligence sources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[160px] h-7 text-[10px] font-mono bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all" className="text-[10px] font-mono">All Platforms</SelectItem>
              {Object.entries(PLATFORM_META).map(([key, meta]) => (
                <SelectItem key={key} value={key} className="text-[10px] font-mono">
                  {meta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-[10px] font-mono">
            <Radio className="h-3 w-3 mr-1 text-green-500" /> LIVE
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(PLATFORM_META).map(([key, meta]) => {
          const count = socmintIncidents.filter((i) => i.analyst === key).length;
          const PlatformIcon = meta.icon;
          return (
            <Card key={key} className="p-3 bg-card border-border">
              <div className="flex items-center gap-2 mb-1">
                <PlatformIcon className="h-4 w-4" style={{ color: meta.color }} />
                <span className="text-[10px] font-mono font-bold text-foreground">{meta.label}</span>
              </div>
              <p className="text-2xl font-mono font-bold text-foreground">{count}</p>
              <p className="text-[9px] font-mono text-muted-foreground">incidents ingested</p>
            </Card>
          );
        })}
      </div>

      {/* Tabs: Charts / Table */}
      <Tabs defaultValue="table" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-fit">
          <TabsTrigger value="table" className="text-[10px] font-mono">Incident Feed</TabsTrigger>
          <TabsTrigger value="charts" className="text-[10px] font-mono">Analytics</TabsTrigger>
          <TabsTrigger value="cyber" className="text-[10px] font-mono">Cyber Intel</TabsTrigger>
          <TabsTrigger value="weather" className="text-[10px] font-mono">Weather Risk</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="flex-1 overflow-auto mt-2">
          <Card className="border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-mono w-[100px]">Source</TableHead>
                  <TableHead className="text-[10px] font-mono w-[80px]">Severity</TableHead>
                  <TableHead className="text-[10px] font-mono">Title</TableHead>
                  <TableHead className="text-[10px] font-mono w-[120px]">Category</TableHead>
                  <TableHead className="text-[10px] font-mono w-[100px]">Location</TableHead>
                  <TableHead className="text-[10px] font-mono w-[130px]">Datetime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-[10px] font-mono text-muted-foreground py-8">
                      No SOCMINT incidents found. Run ingestion from the Alerts page.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.slice(0, 100).map((inc) => {
                    const platform = PLATFORM_META[inc.analyst ?? ""] ?? { label: inc.analyst, color: "gray" };
                    const sev = getSeverityBadge(inc.severity);
                    return (
                      <TableRow key={inc.id}>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] font-mono" style={{ borderColor: platform.color, color: platform.color }}>
                            {platform.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${sev.className} text-[8px] font-mono px-1.5 py-0`}>{sev.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-foreground max-w-[300px] truncate">
                          {inc.title}
                        </TableCell>
                        <TableCell className="text-[10px] font-mono text-muted-foreground">{inc.category}</TableCell>
                        <TableCell className="text-[10px] font-mono text-muted-foreground">{inc.country || inc.region}</TableCell>
                        <TableCell className="text-[10px] font-mono text-muted-foreground">
                          {format(new Date(inc.datetime), "yyyy-MM-dd HH:mm")}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="flex-1 overflow-auto mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Platform Distribution Pie */}
            <Card className="p-4 bg-card border-border">
              <h3 className="text-xs font-mono font-bold text-foreground mb-3">Platform Distribution</h3>
              {platformStats.length === 0 ? (
                <p className="text-[10px] font-mono text-muted-foreground text-center py-8">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={platformStats} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={80} label={({ label, count }) => `${label}: ${count}`}>
                      {platformStats.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 10, fontFamily: "monospace" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Category Bar Chart */}
            <Card className="p-4 bg-card border-border">
              <h3 className="text-xs font-mono font-bold text-foreground mb-3">Top Categories</h3>
              {categoryStats.length === 0 ? (
                <p className="text-[10px] font-mono text-muted-foreground text-center py-8">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={categoryStats} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 9, fontFamily: "monospace", fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fontFamily: "monospace", fill: "hsl(var(--muted-foreground))" }} width={55} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 10, fontFamily: "monospace" }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Severity Distribution */}
            <Card className="p-4 bg-card border-border md:col-span-2">
              <h3 className="text-xs font-mono font-bold text-foreground mb-3">Severity Distribution</h3>
              {severityStats.length === 0 ? (
                <p className="text-[10px] font-mono text-muted-foreground text-center py-8">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={severityStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontFamily: "monospace", fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 9, fontFamily: "monospace", fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 10, fontFamily: "monospace" }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {severityStats.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Cyber Intel Tab */}
        <TabsContent value="cyber" className="flex-1 overflow-auto mt-2">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-mono font-bold text-foreground">IP Reputation Check (AbuseIPDB)</h3>
            </div>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Enter IP address(es), comma-separated"
                value={ipQuery}
                onChange={(e) => setIpQuery(e.target.value)}
                className="text-[10px] font-mono h-8"
                onKeyDown={(e) => e.key === "Enter" && handleCheckIp()}
              />
              <Button size="sm" className="h-8 text-[10px] font-mono" onClick={handleCheckIp} disabled={checkingIp}>
                {checkingIp ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Search className="h-3 w-3 mr-1" />}
                Check
              </Button>
            </div>
            {ipResults.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] font-mono">IP Address</TableHead>
                    <TableHead className="text-[10px] font-mono">Abuse Score</TableHead>
                    <TableHead className="text-[10px] font-mono">Country</TableHead>
                    <TableHead className="text-[10px] font-mono">ISP</TableHead>
                    <TableHead className="text-[10px] font-mono">Reports</TableHead>
                    <TableHead className="text-[10px] font-mono">Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ipResults.map((r: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-[10px] font-mono font-bold">{r.ipAddress}</TableCell>
                      <TableCell>
                        <Badge className={`text-[8px] font-mono ${
                          r.abuseConfidenceScore > 75 ? "bg-destructive text-destructive-foreground" :
                          r.abuseConfidenceScore > 40 ? "bg-orange-600 text-white" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {r.abuseConfidenceScore}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] font-mono">{r.countryCode || "—"}</TableCell>
                      <TableCell className="text-[10px] font-mono">{r.isp || "—"}</TableCell>
                      <TableCell className="text-[10px] font-mono">{r.totalReports}</TableCell>
                      <TableCell className="flex gap-1">
                        {r.isTor && <Badge variant="outline" className="text-[7px] font-mono">TOR</Badge>}
                        {r.isWhitelisted && <Badge variant="outline" className="text-[7px] font-mono">SAFE</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* Weather Risk Tab */}
        <TabsContent value="weather" className="flex-1 overflow-auto mt-2">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-mono font-bold text-foreground">Environmental Risk Layer</h3>
              </div>
              <Button size="sm" className="h-7 text-[10px] font-mono" onClick={handleLoadWeather} disabled={loadingWeather}>
                {loadingWeather ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CloudRain className="h-3 w-3 mr-1" />}
                {loadingWeather ? "Loading…" : "Load Weather"}
              </Button>
            </div>
            {weatherData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {weatherData.map((r: any) => (
                  <Card key={r.regionId} className={`p-3 border-border ${
                    r.riskLevel === "severe" ? "border-l-2 border-l-destructive" :
                    r.riskLevel === "high" ? "border-l-2 border-l-orange-500" :
                    r.riskLevel === "moderate" ? "border-l-2 border-l-amber-500" : ""
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold text-foreground">{r.regionName}</span>
                      <Badge className={`text-[8px] font-mono ${
                        r.riskLevel === "severe" ? "bg-destructive text-destructive-foreground" :
                        r.riskLevel === "high" ? "bg-orange-600 text-white" :
                        r.riskLevel === "moderate" ? "bg-amber-600 text-white" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {r.riskLevel.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-[9px] font-mono text-muted-foreground mb-2">
                      <div><span className="block text-foreground">{r.temp}°C</span>Temp</div>
                      <div><span className="block text-foreground">{r.humidity}%</span>Humidity</div>
                      <div><span className="block text-foreground">{r.windSpeed} m/s</span>Wind</div>
                      <div><span className="block text-foreground capitalize">{r.description}</span>Condition</div>
                    </div>
                    {r.riskFactors.length > 0 && (
                      <div className="text-[8px] font-mono text-amber-400 space-y-0.5">
                        {r.riskFactors.map((f: string, i: number) => (
                          <div key={i}>⚠ {f}</div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-[10px] font-mono text-muted-foreground text-center py-8">
                Click "Load Weather" to fetch environmental data for your monitored regions.
              </p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
