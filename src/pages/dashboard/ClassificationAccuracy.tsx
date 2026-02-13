import { useClassificationFeedback } from '@/hooks/useClassificationFeedback';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  LineChart, Line,
} from 'recharts';
import {
  CheckCircle2, XCircle, TrendingUp, TrendingDown, Minus, Brain,
  Target, BarChart3, Loader2,
} from 'lucide-react';

function MetricCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: typeof CheckCircle2; color: string;
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

export default function ClassificationAccuracy() {
  const { feedback, loading, metrics } = useClassificationFeedback();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const catData = Object.entries(metrics.categoryAccuracy)
    .map(([cat, v]) => ({ category: cat, accuracy: Math.round(v.rate), total: v.total, correct: v.correct }))
    .sort((a, b) => b.total - a.total);

  const driftDirection = metrics.severityDrift.avgDelta > 0.1
    ? 'under-estimates' : metrics.severityDrift.avgDelta < -0.1
    ? 'over-estimates' : 'well-calibrated';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h1 className="text-lg font-mono font-bold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Classification Accuracy
          </h1>
          <p className="text-muted-foreground text-[10px] font-mono mt-0.5">
            AI classification performance based on analyst feedback • {metrics.totalReviewed} reviews
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono">
          FEEDBACK LOOP ACTIVE
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Overall Accuracy"
          value={`${metrics.accuracyRate.toFixed(1)}%`}
          sub={`${metrics.confirmedCorrect} of ${metrics.totalReviewed} correct`}
          icon={Target}
          color="text-emerald-400"
        />
        <MetricCard
          label="Corrections Made"
          value={`${metrics.corrected}`}
          sub={`${metrics.totalReviewed > 0 ? ((metrics.corrected / metrics.totalReviewed) * 100).toFixed(1) : 0}% correction rate`}
          icon={XCircle}
          color="text-amber-400"
        />
        <MetricCard
          label="Severity Drift"
          value={metrics.severityDrift.avgDelta.toFixed(2)}
          sub={`AI ${driftDirection} severity`}
          icon={metrics.severityDrift.avgDelta > 0 ? TrendingUp : metrics.severityDrift.avgDelta < 0 ? TrendingDown : Minus}
          color="text-blue-400"
        />
        <MetricCard
          label="Confidence Gap"
          value={`${(metrics.confidenceCalibration.avgOriginal - metrics.confidenceCalibration.avgCorrectedOriginal).toFixed(0)}pts`}
          sub={`Correct avg: ${metrics.confidenceCalibration.avgOriginal.toFixed(0)}% • Wrong avg: ${metrics.confidenceCalibration.avgCorrectedOriginal.toFixed(0)}%`}
          icon={BarChart3}
          color="text-purple-400"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Weekly Accuracy Trend */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono">Weekly Accuracy Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.weeklyTrend.some(w => w.total > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={metrics.weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11, fontFamily: 'monospace' }}
                    formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name === 'accuracy' ? 'Accuracy' : name]}
                  />
                  <Line type="monotone" dataKey="accuracy" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs font-mono">
                No weekly data yet — review incidents to generate trends
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Accuracy */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono">Accuracy by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {catData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={catData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fontFamily: 'monospace' }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 9, fontFamily: 'monospace' }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11, fontFamily: 'monospace' }}
                    formatter={(v: number) => [`${v}%`, 'Accuracy']}
                  />
                  <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                    {catData.map((entry, i) => (
                      <Cell key={i} fill={entry.accuracy >= 80 ? 'hsl(142 76% 36%)' : entry.accuracy >= 50 ? 'hsl(38 92% 50%)' : 'hsl(0 84% 60%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs font-mono">
                No category data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Feedback Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-mono">Recent Analyst Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          {feedback.length === 0 ? (
            <p className="text-muted-foreground text-xs font-mono py-8 text-center">
              No feedback recorded yet. When analysts review AI-classified incidents (changing status from AI → Reviewed/Confirmed), corrections are automatically tracked here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 px-2">TYPE</th>
                    <th className="text-left py-2 px-2">ORIGINAL</th>
                    <th className="text-left py-2 px-2">CORRECTED</th>
                    <th className="text-left py-2 px-2">SEV DELTA</th>
                    <th className="text-left py-2 px-2">DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {feedback.slice(0, 20).map(f => (
                    <tr key={f.id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="py-2 px-2">
                        {f.feedback_type === 'confirmed_correct' ? (
                          <Badge className="bg-emerald-600/20 text-emerald-400 text-[9px]">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> CORRECT
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-600/20 text-amber-400 text-[9px]">
                            <XCircle className="h-3 w-3 mr-1" /> CORRECTED
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {f.original_category} / SEV-{f.original_severity} / {f.original_confidence}%
                      </td>
                      <td className="py-2 px-2">
                        {f.feedback_type === 'corrected'
                          ? `${f.corrected_category} / SEV-${f.corrected_severity} / ${f.corrected_confidence}%`
                          : '—'}
                      </td>
                      <td className="py-2 px-2">
                        {f.corrected_severity != null ? (
                          <span className={f.corrected_severity - f.original_severity > 0 ? 'text-destructive' : f.corrected_severity - f.original_severity < 0 ? 'text-blue-400' : 'text-muted-foreground'}>
                            {f.corrected_severity - f.original_severity > 0 ? '+' : ''}{f.corrected_severity - f.original_severity}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
