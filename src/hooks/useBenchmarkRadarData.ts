// src/hooks/useBenchmarkRadarData.ts
// Transforms Voltaic S5 benchmark data into 9-axis radar chart data
// Uses rank_thresholds for percentile normalization (0-100 scale)
// Combines Novice (Iron-Gold) + Intermediate (Plat-Master) into unified 8-tier ladder

import { useMemo } from 'react';

// ─── Types ───

export interface BenchmarkRadarPoint {
  subcategory: string;     // "Dynamic", "Static", "Reactive", etc.
  pillar: string;          // "Clicking", "Tracking", "Target Switching"
  percentile: number;      // 0-100 (rank-normalized)
  rank: string;            // "Platinum", "Diamond", etc.
  rankColor: string;       // hex color for vertex dot
  scenarioCount: number;   // how many scenarios contributed
}

export interface BenchmarkRadarResult {
  axes: BenchmarkRadarPoint[];
  overallPercentile: number;
  overallRank: string;
  strongest: BenchmarkRadarPoint | null;
  weakest: BenchmarkRadarPoint | null;
  hasData: boolean;
}

// ─── Constants ───

const RANK_COLORS: Record<string, string> = {
  'Iron':     '#878787',
  'Bronze':   '#CD7F32',
  'Silver':   '#C0C0C0',
  'Gold':     '#FFD700',
  'Platinum': '#3EDBD3',
  'Diamond':  '#B9F2FF',
  'Jade':     '#00A86B',
  'Master':   '#FF4655',
  'Unranked': '#5A6872',
};

// Unified 8-tier ordering (Novice + Intermediate)
const RANK_ORDER = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Jade', 'Master'];

// Subcategory → parent pillar mapping
const PILLAR_MAP: Record<string, string> = {
  'Dynamic': 'Clicking',
  'Static': 'Clicking',
  'Linear': 'Clicking',
  'Reactive': 'Tracking',
  'Precise': 'Tracking',
  'Control': 'Tracking',
  'Speed': 'Target Switching',
  'Evasive': 'Target Switching',
  'Stability': 'Target Switching',
};

// Axis order for radar layout — alternating pillars for visual balance
const AXIS_ORDER = [
  'Dynamic', 'Reactive', 'Speed',
  'Static', 'Precise', 'Evasive',
  'Linear', 'Control', 'Stability',
];

// ─── Percentile Computation ───

interface RankTier {
  name: string;
  color: string;
  threshold: number;
}

/**
 * Compute percentile (0-100) for a score against rank tier thresholds.
 *
 * Combines Novice + Intermediate into a unified 8-tier scale.
 * Each tier spans 12.5% (100 / 8 tiers).
 *
 * The tiers array may contain 4 tiers (single benchmark) or 8 (if we
 * ever merge them). We normalize to the unified RANK_ORDER.
 */
function computePercentile(score: number, tiers: RankTier[]): number {
  if (!tiers.length || score <= 0) return 0;

  // Sort tiers by threshold ascending
  const sorted = [...tiers].sort((a, b) => a.threshold - b.threshold);

  // Map each tier to its position in the unified 8-rank ladder
  const mappedTiers = sorted.map(t => ({
    ...t,
    globalIndex: RANK_ORDER.indexOf(t.name),
  })).filter(t => t.globalIndex >= 0);

  if (!mappedTiers.length) return 0;

  // Below lowest tier threshold
  const lowest = mappedTiers[0];
  if (score < lowest.threshold) {
    // Interpolate from 0 to the start of this tier's band
    const tierBandStart = lowest.globalIndex * 12.5;
    const fraction = Math.max(0, score / lowest.threshold);
    return Math.round(fraction * tierBandStart * 10) / 10;
  }

  // Check each tier bracket
  for (let i = 0; i < mappedTiers.length; i++) {
    const current = mappedTiers[i];
    const next = mappedTiers[i + 1];

    const bandStart = current.globalIndex * 12.5;

    if (!next || score < next.threshold) {
      // Score is within this tier's bracket
      if (next) {
        // Interpolate within bracket
        const progress = (score - current.threshold) / (next.threshold - current.threshold);
        return Math.min(100, Math.round((bandStart + progress * 12.5) * 10) / 10);
      } else {
        // Above highest tier — interpolate within final tier, cap at 100
        // Assume Master ceiling is 1.3× the Master threshold
        const ceiling = current.threshold * 1.3;
        const progress = Math.min(1, (score - current.threshold) / (ceiling - current.threshold));
        return Math.min(100, Math.round((bandStart + progress * 12.5) * 10) / 10);
      }
    }
  }

  return 100;
}

/**
 * Resolve rank name from score + tiers (used when current_rank is missing)
 */
function resolveRankFromScore(score: number, tiers: RankTier[]): string {
  if (!tiers.length || score <= 0) return 'Unranked';

  const sorted = [...tiers].sort((a, b) => b.threshold - a.threshold);
  for (const tier of sorted) {
    if (score >= tier.threshold) return tier.name;
  }
  return 'Unranked';
}

/**
 * Get the highest rank among a set of rank names
 */
function getHighestRank(ranks: string[]): string {
  let best = -1;
  let bestName = 'Unranked';
  for (const r of ranks) {
    const idx = RANK_ORDER.indexOf(r);
    if (idx > best) {
      best = idx;
      bestName = r;
    }
  }
  return bestName;
}

// ─── Raw data shape from Supabase query ───

export interface BenchmarkScenarioRow {
  high_score: number | string;
  current_rank: string | null;
  scenarios: {
    name: string;
    category: string;
    subcategory: string;
    benchmark_system: string;
    rank_thresholds: { tiers: RankTier[] } | null;
  };
}

// ─── Main Hook ───

export function useBenchmarkRadarData(
  data: BenchmarkScenarioRow[] | null | undefined
): BenchmarkRadarResult {
  return useMemo(() => {
    const empty: BenchmarkRadarResult = {
      axes: [],
      overallPercentile: 0,
      overallRank: 'Unranked',
      strongest: null,
      weakest: null,
      hasData: false,
    };

    if (!data?.length) return empty;

    // Group by subcategory
    const groups: Record<string, { percentiles: number[]; ranks: string[]; count: number; systems: string[] }> = {};

    for (const row of data) {
      const subcat = row.scenarios?.subcategory;
      if (!subcat || !PILLAR_MAP[subcat]) continue;

      const tiers = row.scenarios?.rank_thresholds?.tiers;
      if (!tiers?.length) continue;

      const score = Number(row.high_score) || 0;
      if (score <= 0) continue;

      const pct = computePercentile(score, tiers);
      const rank = resolveRankFromScore(Number(row.high_score), tiers);

      if (!groups[subcat]) groups[subcat] = { percentiles: [], ranks: [], count: 0, systems: [] };
      groups[subcat].percentiles.push(pct);
      groups[subcat].ranks.push(rank);
      groups[subcat].count++;
      groups[subcat].systems.push(row.scenarios?.benchmark_system || '');
    }

    // Need at least 3 subcategories to draw a meaningful radar
    if (Object.keys(groups).length < 3) return empty;

    // Build axes in display order
    const axes: BenchmarkRadarPoint[] = [];
    for (const subcat of AXIS_ORDER) {
      const group = groups[subcat];
      if (!group) {
        // Missing subcategory — still include at 0 for shape completeness
        axes.push({
          subcategory: subcat,
          pillar: PILLAR_MAP[subcat] || 'Unknown',
          percentile: 0,
          rank: 'Unranked',
          rankColor: RANK_COLORS['Unranked'],
          scenarioCount: 0,
        });
        continue;
      }

      // Prefer intermediate scores over novice when both exist
      const hasIntermediate = group.systems.some(s => s === 'voltaic_intermediate');
      let relevantPcts = group.percentiles;
      if (hasIntermediate) {
        // Only use intermediate percentiles
        relevantPcts = group.percentiles.filter((_, i) => group.systems[i] === 'voltaic_intermediate');
      }
      const avgPct = Math.round(relevantPcts.reduce((a, b) => a + b, 0) / relevantPcts.length);
      const rank = getHighestRank(group.ranks);

      axes.push({
        subcategory: subcat,
        pillar: PILLAR_MAP[subcat],
        percentile: avgPct,
        rank,
        rankColor: RANK_COLORS[rank] || '#5A6872',
        scenarioCount: group.count,
      });
    }

    const withData = axes.filter(a => a.scenarioCount > 0);
    const overallPct = withData.length
      ? Math.round(withData.reduce((a, b) => a + b.percentile, 0) / withData.length)
      : 0;

    const strongest = withData.length
      ? withData.reduce((a, b) => a.percentile > b.percentile ? a : b)
      : null;
    const weakest = withData.length
      ? withData.reduce((a, b) => a.percentile < b.percentile ? a : b)
      : null;

    // Overall rank = lowest subcategory rank (Voltaic "complete" logic)
    // You're Diamond Complete when ALL subcategories are at least Diamond
    const withDataRanks = withData.map(a => RANK_ORDER.indexOf(a.rank)).filter(i => i >= 0);
    const lowestRankIndex = withDataRanks.length ? Math.min(...withDataRanks) : 0;
    const overallRank = RANK_ORDER[lowestRankIndex] || 'Unranked';

    return {
      axes,
      overallPercentile: overallPct,
      overallRank,
      strongest,
      weakest,
      hasData: true,
    };
  }, [data]);
}

// Export for use in component
export { RANK_COLORS, RANK_ORDER, AXIS_ORDER, PILLAR_MAP };
