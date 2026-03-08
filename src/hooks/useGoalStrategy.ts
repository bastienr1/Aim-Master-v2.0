import { useMemo } from 'react';
import { SUBCATEGORY_PRESCRIPTIONS } from '@/constants/coaching-prescriptions';
import type { Goal } from '@/types/goals';
import type { BenchmarkRadarPoint } from '@/hooks/useBenchmarkRadarData';

const RANK_ORDER = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Jade', 'Master'];

export interface SubcategoryGate {
  name: string;
  rank: string;
  percentile: number;
  gapTiers: number;
  scenarios: string[];
  focusTip: string;
  sessionStructure: string;
}

export interface GoalStrategy {
  hasGoal: boolean;
  targetRank: string | null;
  gates: SubcategoryGate[];
  primaryGate: SubcategoryGate | null;
  strategicInsight: string;
  sessionPrescription: {
    scenario: string;
    focusTip: string;
    sessionStructure: string;
    estimatedMinutes: number;
  } | null;
}

/**
 * Extract a rank target from the goal title (e.g., "Reach Jade", "Hit Diamond by April").
 * Returns the rank string if found, null otherwise.
 */
function extractRankFromTitle(title: string): string | null {
  const titleLower = title.toLowerCase();
  for (const rank of [...RANK_ORDER].reverse()) {
    if (titleLower.includes(rank.toLowerCase())) {
      return rank;
    }
  }
  return null;
}

export function useGoalStrategy(
  goal: Goal | null,
  benchmarkAxes: BenchmarkRadarPoint[]
): GoalStrategy {
  return useMemo(() => {
    // No goal set
    if (!goal) {
      return {
        hasGoal: false,
        targetRank: null,
        gates: [],
        primaryGate: null,
        strategicInsight: 'Set a goal to unlock personalized coaching.',
        sessionPrescription: null,
      };
    }

    // Goal exists but no benchmark data
    if (benchmarkAxes.length === 0) {
      return {
        hasGoal: true,
        targetRank: null,
        gates: [],
        primaryGate: null,
        strategicInsight: 'Sync your benchmark scores to unlock your roadmap.',
        sessionPrescription: null,
      };
    }

    const targetRank = extractRankFromTitle(goal.title);

    // Non-rank goal (custom goal without rank keyword)
    if (!targetRank) {
      return {
        hasGoal: true,
        targetRank: null,
        gates: [],
        primaryGate: null,
        strategicInsight: `Working toward: ${goal.title}`,
        sessionPrescription: null,
      };
    }

    const targetIndex = RANK_ORDER.indexOf(targetRank);

    // Compute gates: subcategories below target rank
    const gates: SubcategoryGate[] = benchmarkAxes
      .filter((axis) => {
        const currentIndex = RANK_ORDER.indexOf(axis.rank);
        return currentIndex >= 0 && currentIndex < targetIndex;
      })
      .map((axis) => {
        const currentIndex = RANK_ORDER.indexOf(axis.rank);
        const prescription = SUBCATEGORY_PRESCRIPTIONS[axis.subcategory] || {
          scenarios: [],
          focusTip: '',
          sessionStructure: '',
        };
        return {
          name: axis.subcategory,
          rank: axis.rank,
          percentile: axis.percentile,
          gapTiers: targetIndex - currentIndex,
          scenarios: prescription.scenarios,
          focusTip: prescription.focusTip,
          sessionStructure: prescription.sessionStructure,
        };
      })
      .sort((a, b) => a.percentile - b.percentile); // worst first

    const primary = gates[0] || null;

    const strategicInsight =
      gates.length === 0
        ? `You're on track for ${targetRank}. Maintain with balanced sessions.`
        : `${primary!.name} is your gate to ${targetRank}. ${
            primary!.gapTiers
          } rank tier${primary!.gapTiers > 1 ? 's' : ''} to close.`;

    const sessionPrescription =
      primary && primary.scenarios.length > 0
        ? {
            scenario: primary.scenarios[0],
            focusTip: primary.focusTip,
            sessionStructure: primary.sessionStructure,
            estimatedMinutes: 15,
          }
        : null;

    return {
      hasGoal: true,
      targetRank,
      gates,
      primaryGate: primary,
      strategicInsight,
      sessionPrescription,
    };
  }, [goal, benchmarkAxes]);
}
