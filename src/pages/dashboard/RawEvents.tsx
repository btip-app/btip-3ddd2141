import { useState, useMemo } from 'react';
import { useRawEvents, type RawEvent } from '@/hooks/useRawEvents';
import { scoreRawEvent, qualityGrade, type QualityBreakdown } from '@/lib/dataQuality';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie,
} from 'recharts';
import {
  Database, Loader2, Activity, CheckCircle2, XCircle, Copy, AlertTriangle,
  Clock, Hash, ExternalLink, RefreshCw, ShieldCheck, Flag,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bgClass: string }> = {
  raw: { label: 'RAW', color: 'hsl(210 40% 50%)', bgClass: 'bg-blue-600/20 text-blue-400' },
  normalized: { label: 'NORMALIZED', color: 'hsl(142 76% 36%)', bgClass: 'bg-emerald-600/20 text-emerald-400' },
  duplicate: { label: 'DUPLICATE', color: 'hsl(38 92% 50%)', bgClass: 'bg-amber-600/20 text-amber-400' },
  rejected: { label: 'REJECTED', color: 'hsl(0 84% 60%)', bgClass: 'bg-destructive/20 text-destructive' },
};

function MetricCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: typeof Activity; color: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase">{label}</p>
            <p className={`text-2xl font-mono font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <Icon className={`h-5 w-5 ${color} opacity-60`} />
        </div>
      </CardContent>
    </Card>
  );
}

function QualityBar({ label, value }: { label: string; value: number }) {
  const grade = qualityGrade(value);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
        <span className={`text-[10px] font-mono font-bold ${grade.color}`}>{value}/100</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}

type ScoredEvent = RawEvent & { quality: QualityBreakdown };

export default function RawEvents() {
  const { events, loading, stats, refetch } = useRawEvents();
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [qualityFilter, setQualityFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<ScoredEvent | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Score all events
  const scoredEvents: ScoredEvent[] = useMemo(() =>
    events.map(e => ({
      ...e,
      quality: scoreRawEvent(e.source_type, e.raw_payload, {
        source_url: e.source_url,
        content_hash: e.content_hash,
      }),
    })),
    [events]
  );

  // Aggregate quality stats
  const qualityStats = useMemo(() => {
    if (scoredEvents.length === 0) return { avg: 0, high: 0, low: 0, flagged: 0 };
    const scores = scoredEvents.map(e => e.quality.overall);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const high = scores.filter(s => s >= 65).length;
    const low = scores.filter(s => s < 50).length;
    const flagged = scoredEvents.filter(e => e.quality.flags.length >= 3).length;
    return { avg, high, low, flagged };
  }, [scoredEvents]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const sources = Object.keys(stats.bySource);
  const statuses = Object.keys(stats.byStatus);

  const filtered = scoredEvents.filter(e => {
    if (sourceFilter !== 'all' && e.source_type !== sourceFilter) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (qualityFilter === 'high' && e.quality.overall < 65) return false;
    if (qualityFilter === 'medium' && (e.quality.overall < 50 || e.quality.overall >= 65)) return false;
    if (qualityFilter === 'low' && e.quality.overall >= 50) return false;
    return true;
  });

  // Chart data
  const sourceBarData = Object.entries(stats.bySource)
    .map(([source, v]) => ({ source, ...v }))
    .sort((a, b) => b.total - a.total);

  const statusPieData = Object.entries(stats.byStatus).map(([status, count]) => ({
    name: STATUS_CONFIG[status]?.label || status,
    value: count,
    fill: STATUS_CONFIG[status]?.color || 'hsl(var(--muted-foreground))',
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h1 className="text-lg font-mono font-bold flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Raw Events Pipeline
          </h1>
          <p className="text-muted-foreground text-[10px] font-mono mt-0.5">
            Staging layer provenance • {stats.total} events tracked
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-[10px] font-mono h-7" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="outline" className="text-[10px] font-mono">
            <Activity className="h-3 w-3 mr-1 text-emerald-400" />
            PIPELINE ACTIVE
          </Badge>
        </div>
      </div>

      {/* KPI Cards — now 5 cols */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard
          label="Total Events"
          value={stats.total.toLocaleString()}
          sub={`${sources.length} source types`}
          icon={Database}
          color="text-primary"
        />
        <MetricCard
          label="Normalized"
          value={(stats.byStatus['normalized'] || 0).toLocaleString()}
          sub={`${stats.total > 0 ? (((stats.byStatus['normalized'] || 0) / stats.total) * 100).toFixed(1) : 0}% success rate`}
          icon={CheckCircle2}
          color="text-emerald-400"
        />
        <MetricCard
          label="Ingestion Rate"
          value={`${stats.recentRate.toFixed(1)}/hr`}
          sub="Last 24 hours average"
          icon={Clock}
          color="text-blue-400"
        />
        <MetricCard
          label="Error Rate"
          value={`${stats.errorRate.toFixed(1)}%`}
          sub={`${stats.byStatus['rejected'] || 0} rejected events`}
          icon={AlertTriangle}
          color={stats.errorRate > 10 ? 'text-destructive' : 'text-amber-400'}
        />
        <MetricCard
          label="Avg Quality"
          value={`${qualityStats.avg}`}
          sub={`${qualityStats.high} high / ${qualityStats.low} low`}
          icon={ShieldCheck}
          color={qualityGrade(qualityStats.avg).color}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Source breakdown bar chart */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono">Events by Source</CardTitle>
          </CardHeader>
          <CardContent>
            {sourceBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sourceBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="source" tick={{ fontSize: 9, fontFamily: 'monospace' }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11, fontFamily: 'monospace' }} />
                  <Bar dataKey="normalized" stackId="a" fill="hsl(142 76% 36%)" name="Normalized" />
                  <Bar dataKey="duplicate" stackId="a" fill="hsl(38 92% 50%)" name="Duplicate" />
                  <Bar dataKey="failed" stackId="a" fill="hsl(0 84% 60%)" name="Rejected" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs font-mono">
                No events ingested yet — run an ingestion pipeline to populate
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status pie chart */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={9} fontFamily="monospace">
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11, fontFamily: 'monospace' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs font-mono">
                No data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border p-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">SOURCE:</span>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[140px] h-7 text-[10px] font-mono bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all" className="text-[10px] font-mono">All Sources</SelectItem>
                {sources.map(s => (
                  <SelectItem key={s} value={s} className="text-[10px] font-mono">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">STATUS:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-7 text-[10px] font-mono bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all" className="text-[10px] font-mono">All Statuses</SelectItem>
                {statuses.map(s => (
                  <SelectItem key={s} value={s} className="text-[10px] font-mono">{STATUS_CONFIG[s]?.label || s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">QUALITY:</span>
            <Select value={qualityFilter} onValueChange={setQualityFilter}>
              <SelectTrigger className="w-[130px] h-7 text-[10px] font-mono bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all" className="text-[10px] font-mono">All Grades</SelectItem>
                <SelectItem value="high" className="text-[10px] font-mono">High (≥65)</SelectItem>
                <SelectItem value="medium" className="text-[10px] font-mono">Medium (50–64)</SelectItem>
                <SelectItem value="low" className="text-[10px] font-mono">Low (&lt;50)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono ml-auto">{filtered.length} shown</Badge>
        </div>
      </Card>

      {/* Events Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-mono">Raw Event Log</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-xs font-mono py-8 text-center">
              No raw events found. Run an ingestion pipeline from the Alerts page to populate the staging layer.
            </p>
          ) : (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-[10px] font-mono">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 px-2">STATUS</th>
                    <th className="text-left py-2 px-2">QUALITY</th>
                    <th className="text-left py-2 px-2">SOURCE</th>
                    <th className="text-left py-2 px-2">LABEL</th>
                    <th className="text-left py-2 px-2">HASH</th>
                    <th className="text-left py-2 px-2">INCIDENT</th>
                    <th className="text-left py-2 px-2">INGESTED</th>
                    <th className="text-left py-2 px-2">ERROR</th>
                    <th className="text-left py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 100).map(e => {
                    const cfg = STATUS_CONFIG[e.status] || { label: e.status, bgClass: 'bg-muted text-muted-foreground' };
                    const grade = qualityGrade(e.quality.overall);
                    return (
                      <tr key={e.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="py-1.5 px-2">
                          <Badge className={`${cfg.bgClass} text-[9px]`}>{cfg.label}</Badge>
                        </td>
                        <td className="py-1.5 px-2">
                          <span className={`font-bold ${grade.color}`}>{grade.label}</span>
                          <span className="text-muted-foreground ml-1">{e.quality.overall}</span>
                        </td>
                        <td className="py-1.5 px-2">{e.source_type}</td>
                        <td className="py-1.5 px-2 max-w-[120px] truncate">{e.source_label || '—'}</td>
                        <td className="py-1.5 px-2">
                          <span className="text-muted-foreground">{e.content_hash ? e.content_hash.slice(0, 8) + '…' : '—'}</span>
                        </td>
                        <td className="py-1.5 px-2">
                          {e.incident_id ? (
                            <span className="text-primary">{e.incident_id.slice(0, 8)}…</span>
                          ) : '—'}
                        </td>
                        <td className="py-1.5 px-2 text-muted-foreground">
                          {new Date(e.ingested_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-1.5 px-2">
                          {e.error_message ? (
                            <span className="text-destructive truncate max-w-[120px] inline-block">{e.error_message}</span>
                          ) : '—'}
                        </td>
                        <td className="py-1.5 px-2">
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setSelectedEvent(e)}>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog with Quality Breakdown */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono">Raw Event Detail</DialogTitle>
            <DialogDescription className="text-[10px] font-mono text-muted-foreground">
              Source provenance, quality assessment, and raw payload inspection
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3">
              {/* Quality Breakdown Panel */}
              <Card className="bg-secondary/30 border-border">
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-[11px] font-mono flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Data Quality Assessment
                    <span className={`ml-auto text-lg font-bold ${qualityGrade(selectedEvent.quality.overall).color}`}>
                      {qualityGrade(selectedEvent.quality.overall).label}
                    </span>
                    <span className="text-muted-foreground text-xs font-normal">{selectedEvent.quality.overall}/100</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  <QualityBar label="Completeness" value={selectedEvent.quality.completeness} />
                  <QualityBar label="Geo-Precision" value={selectedEvent.quality.geoPrecision} />
                  <QualityBar label="Source Reliability" value={selectedEvent.quality.sourceReliability} />

                  {selectedEvent.quality.flags.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-[10px] font-mono text-muted-foreground mb-1 flex items-center gap-1">
                        <Flag className="h-3 w-3" /> Quality Flags
                      </p>
                      <ul className="space-y-0.5">
                        {selectedEvent.quality.flags.map((f, i) => (
                          <li key={i} className="text-[10px] font-mono text-amber-400">• {f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                <div>
                  <span className="text-muted-foreground">ID:</span>
                  <p className="text-foreground break-all">{selectedEvent.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">STATUS:</span>
                  <p><Badge className={`${STATUS_CONFIG[selectedEvent.status]?.bgClass || 'bg-muted'} text-[9px]`}>{selectedEvent.status}</Badge></p>
                </div>
                <div>
                  <span className="text-muted-foreground">SOURCE TYPE:</span>
                  <p className="text-foreground">{selectedEvent.source_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">SOURCE LABEL:</span>
                  <p className="text-foreground">{selectedEvent.source_label || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">SOURCE URL:</span>
                  <p className="text-foreground break-all">{selectedEvent.source_url || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">CONTENT HASH:</span>
                  <p className="text-foreground break-all">{selectedEvent.content_hash || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">INGESTED AT:</span>
                  <p className="text-foreground">{new Date(selectedEvent.ingested_at).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">NORMALIZED AT:</span>
                  <p className="text-foreground">{selectedEvent.normalized_at ? new Date(selectedEvent.normalized_at).toLocaleString() : '—'}</p>
                </div>
                {selectedEvent.incident_id && (
                  <div>
                    <span className="text-muted-foreground">LINKED INCIDENT:</span>
                    <p className="text-primary">{selectedEvent.incident_id}</p>
                  </div>
                )}
                {selectedEvent.error_message && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">ERROR:</span>
                    <p className="text-destructive">{selectedEvent.error_message}</p>
                  </div>
                )}
              </div>
              <Separator />
              <div>
                <span className="text-[10px] font-mono text-muted-foreground">RAW PAYLOAD:</span>
                <pre className="mt-1 p-3 bg-secondary/50 rounded border border-border text-[10px] font-mono text-foreground overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                  {JSON.stringify(selectedEvent.raw_payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
