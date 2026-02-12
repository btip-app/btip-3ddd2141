/**
 * Entity Similarity Engine
 * Detects potential duplicate entities using fuzzy name matching,
 * alias overlap, shared incidents, and metadata signals.
 */

import type { Entity, EntityAlias } from '@/hooks/useEntities';

export interface SimilarityMatch {
  entityA: Entity;
  entityB: Entity;
  overall: number;        // 0-100
  nameSimilarity: number;  // 0-100
  aliasOverlap: number;   // 0-100
  incidentOverlap: number; // 0-100
  metaBonus: number;       // 0-20 bonus points
  reasons: string[];
}

// ── Levenshtein distance ──────────────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// ── Bigram similarity (Dice coefficient) ──────────────────────────────────────
function bigrams(s: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  return set;
}

function diceCoefficient(a: string, b: string): number {
  const ba = bigrams(a), bb = bigrams(b);
  if (ba.size === 0 && bb.size === 0) return 1;
  let intersection = 0;
  ba.forEach(g => { if (bb.has(g)) intersection++; });
  return (2 * intersection) / (ba.size + bb.size);
}

// ── Token overlap (Jaccard) ───────────────────────────────────────────────────
function tokenJaccard(a: string, b: string): number {
  const ta = new Set(a.split(' ').filter(Boolean));
  const tb = new Set(b.split(' ').filter(Boolean));
  if (ta.size === 0 && tb.size === 0) return 1;
  let inter = 0;
  ta.forEach(t => { if (tb.has(t)) inter++; });
  const union = new Set([...ta, ...tb]).size;
  return union > 0 ? inter / union : 0;
}

// ── Name similarity (best of multiple algorithms) ─────────────────────────────
function nameSimilarity(a: string, b: string): number {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 100;

  // Containment check
  if (na.includes(nb) || nb.includes(na)) {
    const ratio = Math.min(na.length, nb.length) / Math.max(na.length, nb.length);
    return Math.round(70 + ratio * 30);
  }

  const levDist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  const levSim = maxLen > 0 ? (1 - levDist / maxLen) : 1;

  const dice = diceCoefficient(na, nb);
  const jaccard = tokenJaccard(na, nb);

  // Best of three
  const best = Math.max(levSim, dice, jaccard);
  return Math.round(best * 100);
}

// ── Alias overlap detection ───────────────────────────────────────────────────
function aliasOverlapScore(
  aliasesA: string[],
  aliasesB: string[],
  nameA: string,
  nameB: string
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const setA = new Set([normalize(nameA), ...aliasesA.map(normalize)]);
  const setB = new Set([normalize(nameB), ...aliasesB.map(normalize)]);

  let matches = 0;
  const matched: string[] = [];
  setA.forEach(a => {
    setB.forEach(b => {
      if (a === b || diceCoefficient(a, b) > 0.8) {
        matches++;
        matched.push(a);
      }
    });
  });

  if (matches > 0) {
    reasons.push(`${matches} alias overlap(s): ${matched.slice(0, 3).join(', ')}`);
  }

  const total = setA.size + setB.size;
  const score = total > 0 ? Math.min(100, Math.round((matches / (total / 2)) * 100)) : 0;
  return { score, reasons };
}

// ── Shared incident overlap ──────────────────────────────────────────────────
function incidentOverlapScore(
  incidentIdsA: string[],
  incidentIdsB: string[]
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const setA = new Set(incidentIdsA);
  const setB = new Set(incidentIdsB);

  let shared = 0;
  setA.forEach(id => { if (setB.has(id)) shared++; });

  if (shared > 0) {
    reasons.push(`${shared} shared incident(s)`);
  }

  const minSize = Math.min(setA.size, setB.size);
  const score = minSize > 0 ? Math.min(100, Math.round((shared / minSize) * 100)) : 0;
  return { score, reasons };
}

// ── Metadata bonus ────────────────────────────────────────────────────────────
function metaBonus(a: Entity, b: Entity): { bonus: number; reasons: string[] } {
  const reasons: string[] = [];
  let bonus = 0;

  // Same type
  if (a.entity_type === b.entity_type) {
    bonus += 5;
    reasons.push('Same entity type');
  }

  // Same country
  if (a.country_affiliation && b.country_affiliation &&
      a.country_affiliation.toLowerCase() === b.country_affiliation.toLowerCase()) {
    bonus += 5;
    reasons.push('Same country affiliation');
  }

  // Same region
  if (a.region && b.region && a.region.toLowerCase() === b.region.toLowerCase()) {
    bonus += 5;
    reasons.push('Same region');
  }

  // Temporal proximity (last seen within 7 days)
  const dayDiff = Math.abs(new Date(a.last_seen).getTime() - new Date(b.last_seen).getTime()) / 86400000;
  if (dayDiff <= 7) {
    bonus += 5;
    reasons.push('Active in same time window');
  }

  return { bonus: Math.min(20, bonus), reasons };
}

// ── Main detection function ───────────────────────────────────────────────────
const WEIGHTS = { name: 0.45, alias: 0.25, incident: 0.20, meta: 0.10 };

export function detectSimilarEntities(
  entities: Entity[],
  aliasesByEntity: Record<string, string[]>,
  incidentIdsByEntity: Record<string, string[]>,
  threshold = 45
): SimilarityMatch[] {
  const matches: SimilarityMatch[] = [];

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i], b = entities[j];

      const ns = nameSimilarity(a.canonical_name, b.canonical_name);
      const ao = aliasOverlapScore(
        aliasesByEntity[a.id] || [], aliasesByEntity[b.id] || [],
        a.canonical_name, b.canonical_name
      );
      const io = incidentOverlapScore(
        incidentIdsByEntity[a.id] || [], incidentIdsByEntity[b.id] || []
      );
      const mb = metaBonus(a, b);

      const overall = Math.round(
        ns * WEIGHTS.name +
        ao.score * WEIGHTS.alias +
        io.score * WEIGHTS.incident +
        mb.bonus * (WEIGHTS.meta / 0.10) * WEIGHTS.meta // scale bonus into 0-100 range
      );

      // Recalculate with simpler weighted sum capped at 100
      const rawScore = Math.round(
        ns * 0.45 + ao.score * 0.25 + io.score * 0.20 + mb.bonus
      );
      const finalScore = Math.min(100, rawScore);

      if (finalScore >= threshold) {
        matches.push({
          entityA: a,
          entityB: b,
          overall: finalScore,
          nameSimilarity: ns,
          aliasOverlap: ao.score,
          incidentOverlap: io.score,
          metaBonus: mb.bonus,
          reasons: [...ao.reasons, ...io.reasons, ...mb.reasons],
        });
      }
    }
  }

  return matches.sort((a, b) => b.overall - a.overall);
}
