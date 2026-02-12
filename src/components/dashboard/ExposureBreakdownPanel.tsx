import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Gauge,
  Crosshair,
  Flame,
  Clock,
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  EXPOSURE_BG_CLASSES,
  type ExposureResult,
  type ExposureBreakdown,
  computeTrend,
} from "@/lib/exposureScore";

interface ExposureBreakdownPanelProps {
  exposure: ExposureResult;
  incidents: { datetime: string; region?: string | null; country?: string | null }[];
  label?: string;
}

const TREND_META = {
  rising: { icon: TrendingUp, label: "RISING", className: "text-destructive" },
  falling: { icon: TrendingDown, label: "FALLING", className: "text-emerald-400" },
  stable: { icon: Minus, label: "STABLE", className: "text-muted-foreground" },
};

export function ExposureBreakdownPanel({
  exposure,
  incidents,
  label = "EXPOSURE SCORE",
}: ExposureBreakdownPanelProps) {
  const { breakdown } = exposure;
  const trend = computeTrend(incidents);
  const TrendIcon = TREND_META[trend].icon;

  return (
    <div className="bg-secondary/30 rounded p-2 mt-2 space-y-2.5">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <Gauge className="h-3 w-3 text-primary" />
        <span className="text-[9px] font-mono font-bold text-foreground">
          {label}
        </span>
      </div>

      {/* Score + level + trend */}
      <div className="flex items-center gap-3">
        <span className="text-2xl font-mono font-bold text-foreground">
          {exposure.score}
        </span>
        <Badge
          className={`${EXPOSURE_BG_CLASSES[exposure.level]} text-[8px] font-mono px-1.5 py-0`}
        >
          {exposure.level.toUpperCase()}
        </Badge>
        <div className="flex items-center gap-1 ml-auto">
          <TrendIcon className={`h-3 w-3 ${TREND_META[trend].className}`} />
          <span
            className={`text-[8px] font-mono ${TREND_META[trend].className}`}
          >
            {TREND_META[trend].label}
          </span>
        </div>
      </div>

      {/* Factor breakdown — only if we have nearby incidents */}
      {breakdown && (
        <>
          <div className="border-t border-border pt-2">
            <div className="text-[8px] font-mono text-muted-foreground mb-1.5">
              WHY THIS SCORE
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {/* Proximity */}
              <div className="flex items-center gap-1.5">
                <Crosshair className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                <span className="text-[8px] font-mono text-muted-foreground">
                  Avg distance
                </span>
                <span className="text-[8px] font-mono text-foreground ml-auto">
                  {breakdown.avgProximityKm} km
                </span>
              </div>

              {/* Severity */}
              <div className="flex items-center gap-1.5">
                <Flame className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                <span className="text-[8px] font-mono text-muted-foreground">
                  Avg severity
                </span>
                <span className="text-[8px] font-mono text-foreground ml-auto">
                  {breakdown.avgSeverity}/5
                </span>
              </div>

              {/* Recency */}
              <div className="flex items-center gap-1.5">
                <Clock className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                <span className="text-[8px] font-mono text-muted-foreground">
                  Last 7 days
                </span>
                <span className="text-[8px] font-mono text-foreground ml-auto">
                  {breakdown.recentCount} events
                </span>
              </div>

              {/* Density */}
              <div className="flex items-center gap-1.5">
                <Layers className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                <span className="text-[8px] font-mono text-muted-foreground">
                  Density ×
                </span>
                <span className="text-[8px] font-mono text-foreground ml-auto">
                  {breakdown.densityMultiplier}
                </span>
              </div>
            </div>

            {/* High severity callout */}
            {breakdown.highSeverityCount > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <Flame className="h-2.5 w-2.5 text-destructive flex-shrink-0" />
                <span className="text-[8px] font-mono text-destructive">
                  {breakdown.highSeverityCount} high-severity (4+) event
                  {breakdown.highSeverityCount > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          {/* Top categories */}
          {breakdown.topCategories.length > 0 && (
            <div className="border-t border-border pt-2">
              <div className="text-[8px] font-mono text-muted-foreground mb-1.5">
                TOP THREAT CATEGORIES
              </div>
              <div className="space-y-1">
                {breakdown.topCategories.map((cat) => (
                  <div key={cat.category} className="flex items-center gap-2">
                    <span className="text-[8px] font-mono text-foreground capitalize w-24 truncate">
                      {cat.category.replace(/_/g, " ")}
                    </span>
                    <Progress
                      value={cat.pct}
                      className="h-1 flex-1 bg-secondary"
                    />
                    <span className="text-[7px] font-mono text-muted-foreground w-8 text-right">
                      {cat.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary sentence */}
          <div className="text-[7px] font-mono text-muted-foreground border-t border-border pt-1.5">
            {exposure.nearbyCount} incident{exposure.nearbyCount !== 1 ? "s" : ""} within 50km
            {breakdown.highSeverityCount > 0
              ? `, ${breakdown.highSeverityCount} high-severity`
              : ""}
            {breakdown.recentCount > 0
              ? `, ${breakdown.recentCount} in the past week`
              : ""}
            . {exposure.dominantCategory
              ? `Primary threat: ${exposure.dominantCategory.replace(/_/g, " ")}.`
              : ""}
          </div>
        </>
      )}

      {/* No incidents fallback */}
      {!breakdown && (
        <div className="text-[7px] font-mono text-muted-foreground">
          No incidents within scoring radius.
        </div>
      )}
    </div>
  );
}
