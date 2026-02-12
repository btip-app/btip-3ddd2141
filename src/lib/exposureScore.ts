/**
 * Composite Exposure Score Engine
 * Calculates risk scores for assets/routes based on:
 * - Proximity (closer incidents = higher risk)
 * - Severity (higher severity = higher weight)
 * - Recency (recent incidents weigh more)
 * - Density (more incidents = amplified risk)
 */

interface GeoIncident {
  lat: number;
  lng: number;
  severity: number;
  datetime: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface ExposureResult {
  score: number; // 0–100
  level: "minimal" | "low" | "moderate" | "elevated" | "critical";
  nearbyCount: number;
  dominantCategory?: string;
}

const LEVEL_THRESHOLDS: [number, ExposureResult["level"]][] = [
  [80, "critical"],
  [60, "elevated"],
  [40, "moderate"],
  [20, "low"],
  [0, "minimal"],
];

function getLevel(score: number): ExposureResult["level"] {
  for (const [threshold, level] of LEVEL_THRESHOLDS) {
    if (score >= threshold) return level;
  }
  return "minimal";
}

export function computeExposureScore(
  lat: number,
  lng: number,
  incidents: GeoIncident[],
  radiusKm = 50,
  maxAgeDays = 30
): ExposureResult {
  const now = Date.now();
  let rawScore = 0;
  let nearbyCount = 0;
  const categoryCounts: Record<string, number> = {};

  for (const inc of incidents) {
    const dist = haversineKm(lat, lng, inc.lat, inc.lng);
    if (dist > radiusKm) continue;

    nearbyCount++;
    const ageDays = (now - new Date(inc.datetime).getTime()) / 86400000;
    const recencyWeight = Math.max(0, 1 - ageDays / maxAgeDays);
    const proximityWeight = 1 - dist / radiusKm;
    const severityWeight = inc.severity / 5;

    rawScore += severityWeight * recencyWeight * proximityWeight * 20;
  }

  // Density amplifier: more incidents in proximity amplify risk non-linearly
  const densityMultiplier = nearbyCount > 0 ? 1 + Math.log2(nearbyCount) * 0.3 : 1;
  const score = Math.min(100, Math.round(rawScore * densityMultiplier));

  return {
    score,
    level: getLevel(score),
    nearbyCount,
  };
}

export function computeRouteExposureScore(
  points: { lat: number; lng: number }[],
  incidents: GeoIncident[],
  radiusKm = 50,
  maxAgeDays = 30
): ExposureResult {
  if (points.length === 0) return { score: 0, level: "minimal", nearbyCount: 0 };

  // Evaluate at each waypoint, take the max + average blend
  const results = points.map((p) => computeExposureScore(p.lat, p.lng, incidents, radiusKm, maxAgeDays));
  const maxScore = Math.max(...results.map((r) => r.score));
  const avgScore = results.reduce((s, r) => s + r.score, 0) / results.length;
  const totalNearby = new Set(results.flatMap((_, i) => {
    // Deduplicate is approximate; just sum unique counts
    return Array(results[i].nearbyCount).fill(i);
  })).size;

  const blended = Math.round(maxScore * 0.7 + avgScore * 0.3);

  return {
    score: Math.min(100, blended),
    level: getLevel(Math.min(100, blended)),
    nearbyCount: Math.max(...results.map((r) => r.nearbyCount)),
  };
}

/** Compute trend direction by comparing recent vs prior period incident counts */
export function computeTrend(
  incidents: { datetime: string; region?: string | null; country?: string | null }[],
  periodDays = 7,
  filterFn?: (inc: { datetime: string; region?: string | null; country?: string | null }) => boolean
): "rising" | "falling" | "stable" {
  const now = Date.now();
  const recentCutoff = now - periodDays * 86400000;
  const priorCutoff = recentCutoff - periodDays * 86400000;

  const filtered = filterFn ? incidents.filter(filterFn) : incidents;

  const recent = filtered.filter((i) => {
    const t = new Date(i.datetime).getTime();
    return t >= recentCutoff;
  }).length;

  const prior = filtered.filter((i) => {
    const t = new Date(i.datetime).getTime();
    return t >= priorCutoff && t < recentCutoff;
  }).length;

  if (prior === 0 && recent === 0) return "stable";
  if (prior === 0 && recent > 0) return "rising";
  const ratio = recent / prior;
  if (ratio > 1.2) return "rising";
  if (ratio < 0.8) return "falling";
  return "stable";
}

export const EXPOSURE_COLORS: Record<ExposureResult["level"], string> = {
  minimal: "hsl(var(--muted-foreground))",
  low: "hsl(142, 76%, 36%)",
  moderate: "hsl(45, 93%, 47%)",
  elevated: "hsl(24, 94%, 50%)",
  critical: "hsl(0, 72%, 51%)",
};

export const EXPOSURE_BG_CLASSES: Record<ExposureResult["level"], string> = {
  minimal: "bg-muted text-muted-foreground",
  low: "bg-emerald-600/20 text-emerald-400",
  moderate: "bg-yellow-600/20 text-yellow-400",
  elevated: "bg-orange-600/20 text-orange-400",
  critical: "bg-destructive/20 text-destructive",
};
