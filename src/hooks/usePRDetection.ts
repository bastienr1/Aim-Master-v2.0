import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { PersonalRecord, PRStreakData } from '@/types/debrief';

// ─── Hook ───

export function usePRDetection(
  options?: {
    windowDays?: number;       // default: 7
    sessionId?: string;        // if provided, scopes to single session
  }
): PRStreakData {
  const { user } = useAuth();
  const windowDays = options?.windowDays ?? 7;
  const sessionId = options?.sessionId;

  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [prDaysInWindow, setPrDaysInWindow] = useState<Set<string>>(new Set());
  const [streakDays, setStreakDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      if (sessionId) {
        // ─── Mode B: Single session ───
        const { data, error } = await supabase
          .from('session_debriefs')
          .select('prs_detected, created_at')
          .eq('id', sessionId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        const records = normalizePrs(data?.prs_detected, data?.created_at);
        setPrs(records);
        setPrDaysInWindow(new Set());
        setStreakDays(0);
        setIsEmpty(!data);
      } else {
        // ─── Mode A: Rolling window (dashboard) ───
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - windowDays);

        const { data, error } = await supabase
          .from('session_debriefs')
          .select('prs_detected, created_at')
          .eq('user_id', user.id)
          .gte('created_at', cutoff.toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
          // Distinguish "new user" from "no recent PRs"
          const { count } = await supabase
            .from('session_debriefs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          setPrs([]);
          setPrDaysInWindow(new Set());
          setStreakDays(0);
          setIsEmpty((count ?? 0) === 0);
          setIsLoading(false);
          return;
        }

        // Flatten all PRs from the window
        const allPrs: PersonalRecord[] = [];
        const daysWithPrs = new Set<string>();

        for (const row of data) {
          const records = normalizePrs(row.prs_detected, row.created_at);
          if (records.length > 0) {
            allPrs.push(...records);
            const day = row.created_at?.split('T')[0];
            if (day) daysWithPrs.add(day);
          }
        }

        setPrs(allPrs);
        setPrDaysInWindow(daysWithPrs);
        setStreakDays(calculateStreakDays(daysWithPrs));
        setIsEmpty(false);
      }
    } catch (err) {
      console.error('usePRDetection error:', err);
      setPrs([]);
      setPrDaysInWindow(new Set());
      setStreakDays(0);
    } finally {
      setIsLoading(false);
    }
  }, [user, windowDays, sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  // Derived values
  const totalPRs = prs.length;

  const bestImprovement = useMemo(() => {
    if (prs.length === 0) return null;
    return prs.reduce((best, pr) =>
      pr.improvement > best.improvement ? pr : best
    );
  }, [prs]);

  return {
    prs,
    totalPRs,
    streakDays,
    bestImprovement,
    prDaysInWindow,
    isLoading,
    isEmpty,
  };
}

// ─── Helpers ───

/**
 * Normalize raw prs_detected JSONB into PersonalRecord[].
 * Handles both the existing PRDetection shape (scenarioName, newScore,
 * previousBest, improvementPct) and the spec shape (scenario_name, new_score,
 * previous_best, category).
 */
function normalizePrs(
  raw: unknown,
  debriefCreatedAt?: string,
): PersonalRecord[] {
  if (!Array.isArray(raw)) return [];

  const records: PersonalRecord[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;

    try {
      const scenarioName = item.scenarioName ?? item.scenario_name ?? '';
      const newScore = Number(item.newScore ?? item.new_score ?? 0);
      const previousBest = Number(item.previousBest ?? item.previous_best ?? 0);

      // Use existing improvementPct if available, otherwise compute
      let improvement: number;
      if (item.improvementPct != null) {
        improvement = Number(item.improvementPct);
      } else if (previousBest > 0) {
        improvement = ((newScore - previousBest) / previousBest) * 100;
      } else {
        improvement = 0;
      }

      const isFirstPlay = !previousBest || previousBest === 0;

      records.push({
        scenarioName,
        newScore,
        previousBest,
        improvement,
        category: item.category ?? null,
        achievedAt: debriefCreatedAt ?? new Date().toISOString(),
        isFirstPlay,
      });
    } catch {
      // Skip malformed entries
      continue;
    }
  }

  return records;
}

/** Count consecutive days (from today backward) that have at least 1 PR */
function calculateStreakDays(prDays: Set<string>): number {
  if (prDays.size === 0) return 0;

  let streak = 0;
  const current = new Date();

  for (let i = 0; i < 7; i++) {
    const dateStr = current.toISOString().split('T')[0];

    if (prDays.has(dateStr)) {
      streak++;
    } else if (streak > 0) {
      break; // streak broken
    }
    // If streak is still 0 and today has no PR, keep checking backward
    // (allows "streak started yesterday" case)

    current.setDate(current.getDate() - 1);
  }

  return streak;
}
