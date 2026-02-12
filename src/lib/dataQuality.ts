/**
 * Data Quality Scoring Engine
 * Rates raw events on three dimensions: Completeness, Geo-Precision, Source Reliability.
 * Each dimension scores 0–100; overall is a weighted average.
 */

import type { Json } from '@/integrations/supabase/types';

export interface QualityBreakdown {
  completeness: number;   // 0-100
  geoPrecision: number;   // 0-100
  sourceReliability: number; // 0-100
  overall: number;        // 0-100  weighted
  flags: string[];        // human-readable issues
}

const WEIGHTS = { completeness: 0.4, geoPrecision: 0.3, sourceReliability: 0.3 };

// ── Source reliability tiers ──────────────────────────────────────────────────
const TIER1_SOURCES = new Set([
  'acled', 'gdelt', 'reliefweb', 'abuseipdb', 'alienvault',
]);
const TIER2_SOURCES = new Set([
  'firecrawl', 'telegram', 'twitter', 'reddit', 'meta',
]);

function sourceReliabilityScore(sourceType: string, payload: Record<string, unknown>): { score: number; flags: string[] } {
  const flags: string[] = [];
  const st = sourceType.toLowerCase();

  let base: number;
  if (TIER1_SOURCES.has(st)) {
    base = 90;
  } else if (TIER2_SOURCES.has(st)) {
    base = 65;
  } else {
    base = 40;
    flags.push('Unknown source type — low trust baseline');
  }

  // Bonus for having a source URL
  const hasUrl = typeof payload.source_url === 'string' && payload.source_url.length > 10;
  if (!hasUrl) {
    base -= 10;
    flags.push('No source URL for provenance');
  }

  // Bonus for content hash (dedup-ready)
  const hasHash = typeof payload.content_hash === 'string' && payload.content_hash.length > 0;
  if (hasHash) base += 5;

  return { score: Math.max(0, Math.min(100, base)), flags };
}

// ── Completeness scoring ──────────────────────────────────────────────────────
const REQUIRED_FIELDS = ['title', 'location', 'category', 'severity', 'datetime'];
const OPTIONAL_FIELDS = ['summary', 'sources', 'country', 'region', 'subdivision', 'confidence'];

function completenessScore(payload: Record<string, unknown>): { score: number; flags: string[] } {
  const flags: string[] = [];
  let filled = 0;

  for (const f of REQUIRED_FIELDS) {
    const v = payload[f];
    if (v !== null && v !== undefined && v !== '' && v !== 'unknown' && v !== 'Unknown') {
      filled++;
    } else {
      flags.push(`Missing required field: ${f}`);
    }
  }

  const requiredPct = (filled / REQUIRED_FIELDS.length) * 70; // 70% weight on required

  let optFilled = 0;
  for (const f of OPTIONAL_FIELDS) {
    const v = payload[f];
    if (v !== null && v !== undefined && v !== '' && v !== 'unknown') optFilled++;
  }
  const optionalPct = (optFilled / OPTIONAL_FIELDS.length) * 30; // 30% on optional

  const score = Math.round(requiredPct + optionalPct);

  if (typeof payload.title === 'string' && payload.title.length < 10) {
    flags.push('Title too short (< 10 chars)');
  }
  if (typeof payload.summary === 'string' && payload.summary.length < 20) {
    flags.push('Summary too brief');
  }

  return { score: Math.max(0, Math.min(100, score)), flags };
}

// ── Geo-precision scoring ─────────────────────────────────────────────────────
function geoPrecisionScore(payload: Record<string, unknown>): { score: number; flags: string[] } {
  const flags: string[] = [];
  let score = 0;

  const hasLat = typeof payload.lat === 'number' && !isNaN(payload.lat);
  const hasLng = typeof payload.lng === 'number' && !isNaN(payload.lng);

  if (hasLat && hasLng) {
    score += 50;
    // Check coordinate precision (more decimals = more precise)
    const latStr = String(payload.lat);
    const decimals = latStr.includes('.') ? latStr.split('.')[1]?.length || 0 : 0;
    if (decimals >= 4) {
      score += 20;
    } else if (decimals >= 2) {
      score += 10;
    } else {
      flags.push('Low coordinate precision (< 2 decimals)');
    }

    // Sanity bounds
    const lat = payload.lat as number;
    const lng = payload.lng as number;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      score -= 30;
      flags.push('Coordinates out of valid range');
    }
  } else {
    flags.push('Missing lat/lng coordinates');
  }

  // Location string quality
  const loc = typeof payload.location === 'string' ? payload.location : '';
  if (loc && loc.toLowerCase() !== 'unknown') {
    score += 15;
    if (loc.includes(',')) score += 5; // city, country format
  } else {
    flags.push('Missing or unknown location string');
  }

  // Country present
  if (payload.country && payload.country !== 'unknown') {
    score += 5;
  }

  // Subdivision present
  if (payload.subdivision) {
    score += 5;
  }

  return { score: Math.max(0, Math.min(100, score)), flags };
}

// ── Main scorer ───────────────────────────────────────────────────────────────
export function scoreRawEvent(
  sourceType: string,
  rawPayload: Json,
  eventMeta: { source_url?: string | null; content_hash?: string | null }
): QualityBreakdown {
  // Flatten: use raw_payload fields, fall back to event-level meta
  const payload: Record<string, unknown> = typeof rawPayload === 'object' && rawPayload !== null && !Array.isArray(rawPayload)
    ? { ...rawPayload, source_url: eventMeta.source_url, content_hash: eventMeta.content_hash }
    : { source_url: eventMeta.source_url, content_hash: eventMeta.content_hash };

  const comp = completenessScore(payload);
  const geo = geoPrecisionScore(payload);
  const src = sourceReliabilityScore(sourceType, payload);

  const overall = Math.round(
    comp.score * WEIGHTS.completeness +
    geo.score * WEIGHTS.geoPrecision +
    src.score * WEIGHTS.sourceReliability
  );

  return {
    completeness: comp.score,
    geoPrecision: geo.score,
    sourceReliability: src.score,
    overall,
    flags: [...comp.flags, ...geo.flags, ...src.flags],
  };
}

export function qualityGrade(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'A', color: 'text-emerald-400' };
  if (score >= 65) return { label: 'B', color: 'text-blue-400' };
  if (score >= 50) return { label: 'C', color: 'text-amber-400' };
  if (score >= 35) return { label: 'D', color: 'text-orange-400' };
  return { label: 'F', color: 'text-destructive' };
}
