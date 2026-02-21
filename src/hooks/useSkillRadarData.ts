import { useMemo } from 'react';

export interface RadarDataPoint {
  skill: string;
  value: number;
  fullMark: number;
}

export interface SkillRadarResult {
  radarData: RadarDataPoint[];
  strongest: RadarDataPoint;
  weakest: RadarDataPoint;
  hasData: boolean;
  dataSource: 'scores' | 'distribution' | 'none';
}

export interface CategoryScore {
  category: string;
  avg: number;
}

/** Maximum score ceiling for 0-100 normalization. 1000 ≈ Voltaic Master tier. */
const SCORE_CEILING = 1000;

/**
 * Exhaustive map: every known Supabase/Kovaaks category string → radar axis.
 * Add new entries here if new category names appear in your data.
 */
const CATEGORY_TO_AXIS: Record<string, string> = {
  // Clicking variants
  'clicking':       'Clicking',
  'click':          'Clicking',
  'flicking':       'Clicking',
  'flick':          'Clicking',
  'static':         'Clicking',
  // Tracking variants
  'tracking':       'Tracking',
  'track':          'Tracking',
  'reactive':       'Tracking',
  'reactive tracking': 'Tracking',
  // Switching variants
  'switching':      'Switching',
  'switch':         'Switching',
  'target switching': 'Switching',
  'target switch':  'Switching',
  // Speed variants (subcategory of clicking)
  'speed':          'Speed',
  'dynamic':        'Speed',
  'dynamic clicking': 'Speed',
  // Precision variants (subcategory of tracking)
  'precision':      'Precision',
  'precise':        'Precision',
  'precise tracking': 'Precision',
  // Stability variants (subcategory of switching)
  'stability':      'Stability',
  'evasive':        'Stability',
  'evasive tracking': 'Stability',
};

/**
 * Transforms aim training data into a 6-axis radar chart dataset.
 *
 * Data source priority:
 * 1. Real category average scores (from coachData) → normalized via ceiling
 * 2. Category distribution counts (from chartData) → normalized via percentage
 */
export function useSkillRadarData(
  distribution: { name: string; value: number }[] | null | undefined,
  categoryScores?: CategoryScore[] | null
): SkillRadarResult {
  return useMemo(() => {
    const hasScores = categoryScores && categoryScores.length > 0;
    const hasDist = distribution && distribution.length > 0;

    if (!hasScores && !hasDist) {
      const empty: RadarDataPoint = { skill: 'N/A', value: 0, fullMark: 100 };
      return { radarData: [], strongest: empty, weakest: empty, hasData: false, dataSource: 'none' as const };
    }

    // ── DEBUG: Remove after confirming radar works ──
    if (hasScores) {
      console.log('[BattleStats Radar] categoryScores received:', categoryScores);
    }
    if (hasDist) {
      console.log('[BattleStats Radar] distribution received:', distribution);
    }

    let radarData: RadarDataPoint[];

    if (hasScores) {
      radarData = buildFromScores(categoryScores!);
    } else {
      radarData = buildFromDistribution(distribution!);
    }

    // ── DEBUG: Remove after confirming ──
    console.log('[BattleStats Radar] radarData output:', radarData);

    const weakest = radarData.reduce((a, b) => a.value < b.value ? a : b);
    const strongest = radarData.reduce((a, b) => a.value > b.value ? a : b);

    return {
      radarData,
      strongest,
      weakest,
      hasData: true,
      dataSource: hasScores ? 'scores' as const : 'distribution' as const,
    };
  }, [distribution, categoryScores]);
}

// ─── Score-based radar (v1.0) ───────────────────────────────────────

function normalizeScore(raw: number): number {
  if (!raw || raw <= 0) return 0;
  return Math.min(Math.round((raw / SCORE_CEILING) * 100), 100);
}

/**
 * Maps a category string to its radar axis using the exhaustive lookup map.
 * Falls back to substring matching if exact match fails.
 */
function resolveAxis(categoryName: string): string | null {
  const lower = categoryName.toLowerCase().trim();

  // 1. Exact match
  if (CATEGORY_TO_AXIS[lower]) return CATEGORY_TO_AXIS[lower];

  // 2. Substring match (catches things like "Dynamic Clicking Advanced")
  for (const [keyword, axis] of Object.entries(CATEGORY_TO_AXIS)) {
    if (lower.includes(keyword) || keyword.includes(lower)) return axis;
  }

  return null;
}

function buildFromScores(scores: CategoryScore[]): RadarDataPoint[] {
  // Group scores by radar axis
  const axisScores: Record<string, number[]> = {
    Clicking: [], Tracking: [], Switching: [],
    Speed: [], Precision: [], Stability: [],
  };

  for (const score of scores) {
    const axis = resolveAxis(score.category);
    if (axis && axisScores[axis]) {
      axisScores[axis].push(score.avg);
    } else {
      console.warn(`[BattleStats Radar] Unmatched category: "${score.category}" (avg: ${score.avg})`);
    }
  }

  // Average per axis, then normalize
  const getAxisValue = (axis: string): number => {
    const vals = axisScores[axis];
    if (vals.length === 0) return 0;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return normalizeScore(avg);
  };

  const clicking = getAxisValue('Clicking');
  const tracking = getAxisValue('Tracking');
  const switching = getAxisValue('Switching');

  // Derived axes: use direct values if available, else derive from parent
  const speed = getAxisValue('Speed') || Math.round(clicking * 0.85);
  const precision = getAxisValue('Precision') || Math.round(tracking * 0.9);
  const stability = getAxisValue('Stability') || Math.round(switching * 0.88);

  return [
    { skill: 'Clicking',  value: clicking,   fullMark: 100 },
    { skill: 'Tracking',  value: tracking,   fullMark: 100 },
    { skill: 'Switching', value: switching,   fullMark: 100 },
    { skill: 'Speed',     value: speed,       fullMark: 100 },
    { skill: 'Precision', value: precision,   fullMark: 100 },
    { skill: 'Stability', value: stability,   fullMark: 100 },
  ];
}

// ─── Distribution-based radar (v0 fallback) ─────────────────────────

function buildFromDistribution(distribution: { name: string; value: number }[]): RadarDataPoint[] {
  const total = distribution.reduce((a, b) => a + b.value, 0) || 1;

  const getAxisFromDist = (axis: string): number => {
    let sum = 0;
    for (const d of distribution) {
      if (resolveAxis(d.name) === axis) {
        sum += d.value;
      }
    }
    return Math.round((sum / total) * 100);
  };

  const clicking = getAxisFromDist('Clicking');
  const tracking = getAxisFromDist('Tracking');
  const switching = getAxisFromDist('Switching');

  return [
    { skill: 'Clicking',  value: clicking,  fullMark: 100 },
    { skill: 'Tracking',  value: tracking,  fullMark: 100 },
    { skill: 'Switching', value: switching,  fullMark: 100 },
    { skill: 'Speed',     value: getAxisFromDist('Speed')     || Math.round(clicking * 0.8),  fullMark: 100 },
    { skill: 'Precision', value: getAxisFromDist('Precision')  || Math.round(tracking * 0.85), fullMark: 100 },
    { skill: 'Stability', value: getAxisFromDist('Stability')  || Math.round(switching * 0.9), fullMark: 100 },
  ];
}
