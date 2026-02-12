import { useState } from 'react';
import { useForecast, type CategoryForecast } from '@/hooks/useForecast';
import { type ForecastResult } from '@/lib/forecasting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend, BarChart, Bar,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, Activity, Loader2, Brain,
  Target, BarChart3, Clock, AlertTriangle,
} from 'lucide-react';

function ModelBadge({ result }: { result: ForecastResult }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="outline" className="text-[9px] font-mono">
        {result.method}
      </Badge>
      <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground">
        MAE: {result.mae.toFixed(2)}
      </Badge>
      <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground">
        RMSE: {result.rmse.toFixed(2)}
      </Badge>
    </div>
  );
}

function ForecastChart({ title, series, forecast, height = 220 }: {
  title: string;
  series: { date: string; value: number }[];
  forecast: ForecastResult;
  height?: number;
}) {
  // Combine historical + forecast data
  const lastDays = series.slice(-30);
  const combined = [
    ...lastDays.map(p => ({
      date: p.date.slice(5), // MM-DD
      actual: p.value,
      forecast: null as number | null,
      lower: null as number | null,
      upper: null as number | null,
    })),
    ...forecast.forecast.map(p => ({
      date: p.date.slice(5),
      actual: null as number | null,
      forecast: p.value,
      lower: p.lower,
      upper: p.upper,
    })),
  ];

  // Trend direction from forecast
  const fcVals = forecast.forecast.map(f => f.value);
  const trendDir = fcVals.length >= 2
    ? fcVals[fcVals.length - 1] > fcVals[0] + 0.5 ? 'rising'
      : fcVals[fcVals.length - 1] < fcVals[0] - 0.5 ? 'declining'
      : 'stable'
    : 'stable';

  const TrendIcon = trendDir === 'rising' ? TrendingUp : trendDir === 'declining' ? TrendingDown : Minus;
  const trendColor = trendDir === 'rising' ? 'text-destructive' : trendDir === 'declining' ? 'text-emerald-400' : 'text-muted-foreground';

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-mono">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
            <span className={`text-[10px] font-mono ${trendColor} capitalize`}>{trendDir}</span>
          </div>
        </div>
        <ModelBadge result={forecast} />
      </CardHeader>
      <CardContent>
        {forecast.forecast.length > 0 ? (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={combined}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fontFamily: 'monospace' }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11, fontFamily: 'monospace' }} />
              {/* Confidence interval */}
              <Area type="monotone" dataKey="upper" stroke="none" fill="hsl(var(--primary))" fillOpacity={0.08} />
              <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(var(--background))" fillOpacity={1} />
              {/* Historical */}
              <Line type="monotone" dataKey="actual" stroke="hsl(var(--foreground))" strokeWidth={1.5} dot={false} connectNulls={false} />
              {/* Forecast */}
              <Line type="monotone" dataKey="forecast" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2 }} connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className={`h-[${height}px] flex items-center justify-center text-muted-foreground text-xs font-mono`}>
            Insufficient data for forecasting
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ModelComparisonTable({ results }: { results: ForecastResult[] }) {
  if (results.length === 0) return null;
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-mono">Model Comparison (auto-selected by lowest RMSE)</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-[10px] font-mono">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-2 px-2">MODEL</th>
              <th className="text-left py-2 px-2">MAE</th>
              <th className="text-left py-2 px-2">RMSE</th>
              <th className="text-left py-2 px-2">MAPE</th>
              <th className="text-left py-2 px-2">7-DAY FORECAST</th>
              <th className="text-left py-2 px-2">RANK</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={r.method} className={`border-b border-border/50 ${i === 0 ? 'bg-primary/5' : 'hover:bg-secondary/30'}`}>
                <td className="py-2 px-2">
                  {r.method}
                  {i === 0 && <Badge className="ml-1 bg-primary/20 text-primary text-[8px]">BEST</Badge>}
                </td>
                <td className="py-2 px-2">{r.mae.toFixed(3)}</td>
                <td className="py-2 px-2">{r.rmse.toFixed(3)}</td>
                <td className="py-2 px-2">{r.mape.toFixed(1)}%</td>
                <td className="py-2 px-2">
                  {r.forecast.length > 0
                    ? `${r.forecast[0].value} → ${r.forecast[r.forecast.length - 1].value}`
                    : '—'}
                </td>
                <td className="py-2 px-2">#{i + 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function Forecast() {
  const [horizon, setHorizon] = useState(14);
  const [lookback, setLookback] = useState(60);
  const { globalForecast, severityForecast, categoryForecasts, regionForecasts, loading } = useForecast(lookback, horizon);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h1 className="text-lg font-mono font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Threat Forecasting
          </h1>
          <p className="text-muted-foreground text-[10px] font-mono mt-0.5">
            Statistical time-series forecasting • No LLM dependency • Auto-model selection
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">LOOKBACK:</span>
            <Select value={String(lookback)} onValueChange={v => setLookback(Number(v))}>
              <SelectTrigger className="w-[90px] h-7 text-[10px] font-mono bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="30" className="text-[10px] font-mono">30 days</SelectItem>
                <SelectItem value="60" className="text-[10px] font-mono">60 days</SelectItem>
                <SelectItem value="90" className="text-[10px] font-mono">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">HORIZON:</span>
            <Select value={String(horizon)} onValueChange={v => setHorizon(Number(v))}>
              <SelectTrigger className="w-[90px] h-7 text-[10px] font-mono bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="7" className="text-[10px] font-mono">7 days</SelectItem>
                <SelectItem value="14" className="text-[10px] font-mono">14 days</SelectItem>
                <SelectItem value="30" className="text-[10px] font-mono">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            <Brain className="h-3 w-3 mr-1" />
            STATISTICAL
          </Badge>
        </div>
      </div>

      {/* Advisory */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 text-[10px] font-mono text-amber-300 flex items-start gap-2">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          Advisory: Forecasts are statistical projections based on historical patterns. They do not account for emerging geopolitical shifts, intelligence gaps, or black swan events. Validate against ground-truth sources before operational use.
        </span>
      </div>

      <Tabs defaultValue="global" className="space-y-3">
        <TabsList className="bg-secondary/50 border border-border">
          <TabsTrigger value="global" className="text-[10px] font-mono">Global Volume</TabsTrigger>
          <TabsTrigger value="severity" className="text-[10px] font-mono">Avg Severity</TabsTrigger>
          <TabsTrigger value="category" className="text-[10px] font-mono">By Category</TabsTrigger>
          <TabsTrigger value="region" className="text-[10px] font-mono">By Region</TabsTrigger>
          <TabsTrigger value="models" className="text-[10px] font-mono">Model Comparison</TabsTrigger>
        </TabsList>

        {/* Global Volume */}
        <TabsContent value="global" className="space-y-3">
          {globalForecast ? (
            <ForecastChart
              title="Global Incident Volume Forecast"
              series={globalForecast.series}
              forecast={globalForecast.forecast.best}
              height={280}
            />
          ) : (
            <Card className="bg-card border-border p-8 text-center text-muted-foreground text-xs font-mono">
              No incident data available for forecasting
            </Card>
          )}
        </TabsContent>

        {/* Severity */}
        <TabsContent value="severity" className="space-y-3">
          {severityForecast ? (
            <ForecastChart
              title="Average Severity Forecast"
              series={severityForecast.series}
              forecast={severityForecast.forecast.best}
              height={280}
            />
          ) : (
            <Card className="bg-card border-border p-8 text-center text-muted-foreground text-xs font-mono">
              No severity data available
            </Card>
          )}
        </TabsContent>

        {/* Category */}
        <TabsContent value="category" className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {categoryForecasts.slice(0, 6).map(cf => (
              <ForecastChart
                key={cf.category}
                title={cf.category}
                series={cf.series}
                forecast={cf.forecast.best}
                height={180}
              />
            ))}
          </div>
          {categoryForecasts.length === 0 && (
            <Card className="bg-card border-border p-8 text-center text-muted-foreground text-xs font-mono">
              No category data available
            </Card>
          )}
        </TabsContent>

        {/* Region */}
        <TabsContent value="region" className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {regionForecasts.slice(0, 6).map(rf => (
              <ForecastChart
                key={rf.region}
                title={rf.region}
                series={rf.series}
                forecast={rf.forecast.best}
                height={180}
              />
            ))}
          </div>
          {regionForecasts.length === 0 && (
            <Card className="bg-card border-border p-8 text-center text-muted-foreground text-xs font-mono">
              No region data available
            </Card>
          )}
        </TabsContent>

        {/* Model Comparison */}
        <TabsContent value="models" className="space-y-3">
          {globalForecast && (
            <ModelComparisonTable results={globalForecast.forecast.all} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
