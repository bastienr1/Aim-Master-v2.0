import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PlaylistService } from '@/services/PlaylistService';
import type { GroupedSession, SessionPlay, PRDetection } from '@/types/debrief';
import { SCORE_DECLINE_THRESHOLD } from '@/constants/debrief-config';

interface ScoreRow {
  score: number;
  session_date: string;
  scenario_id: string;
  scenarios: {
    name: string;
    category: string;
    kovaaks_id: string;
  };
}

interface UseSessionDetectionReturn {
  sessionData: GroupedSession | null;
  detecting: boolean;
  detectSession: () => Promise<GroupedSession | null>;
  clearSession: () => void;
  resetDetection: () => void;
  setEmptySessionData: (session: GroupedSession) => void;
}

export function useSessionDetection(): UseSessionDetectionReturn {
  const { user } = useAuth();
  const [sessionData, setSessionData] = useState<GroupedSession | null>(null);
  const [detecting, setDetecting] = useState(false);
  const lastDetectionRef = useRef<string | null>(null);

  const detectSession = useCallback(async (): Promise<GroupedSession | null> => {
    if (!user) { console.log('[detectSession] No user — aborting'); return null; }
    console.log('[detectSession] Starting detection...');
    setDetecting(true);

    try {
      // 1. Get Kovaaks username
      const { data: profile } = await supabase
        .from('kovaaks_profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.username) {
        console.log('[detectSession] No kovaaks username found — aborting');
        setDetecting(false);
        return null;
      }
      console.log('[detectSession] Username:', profile.username);

      // 2. Fetch active program to scope the sync
      const { data: activeProgram } = await supabase
        .from('training_programs')
        .select('id, scenarios_data')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!activeProgram) {
        console.log('[detectSession] No active program — skipping sync');
        setDetecting(false);
        return null;
      }

      const programScenarioNames: string[] = Array.isArray(activeProgram.scenarios_data)
        ? activeProgram.scenarios_data.map((s: any) => s.scenarioName).filter(Boolean)
        : [];

      if (programScenarioNames.length === 0) {
        console.log('[detectSession] Active program has no scenarios');
        setDetecting(false);
        return null;
      }

      // 2b. SCOPED sync: only sync the program's scenarios, not the whole profile
      console.log('[detectSession] Syncing', programScenarioNames.length, 'program scenarios (scoped)');
      const syncResult = await PlaylistService.syncProgramScores(programScenarioNames);
      if (!syncResult.success) {
        console.error('[detectSession] Scoped sync failed:', syncResult.error);
        setDetecting(false);
        return null;
      }
      console.log('[detectSession] Scoped sync succeeded:', syncResult.data);

      // 3. Get recent scores from score_history (written by full_sync)
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const { data: recentScores, error: scoresError } = await supabase
        .from('score_history')
        .select(`
          score,
          session_date,
          scenario_id,
          scenarios!inner(name, category, kovaaks_id)
        `)
        .eq('user_id', user.id)
        .gte('session_date', threeHoursAgo)
        .order('session_date', { ascending: true });

      if (scoresError || !recentScores || recentScores.length === 0) {
        console.log('[detectSession] No recent scores in last 3 hours. Error:', scoresError);
        setDetecting(false);
        return null;
      }
      console.log('[detectSession] Found', recentScores.length, 'recent scores');

      const typedScores = recentScores as unknown as ScoreRow[];

      // 4. Check if we already debriefed these scores
      const latestScoreDate = typedScores[typedScores.length - 1].session_date;
      if (lastDetectionRef.current === latestScoreDate) {
        console.log('[detectSession] BLOCKED: lastDetectionRef matches latest score date:', latestScoreDate);
        setDetecting(false);
        return null;
      }
      console.log('[detectSession] New scores detected, latest:', latestScoreDate);

      // Check against existing debriefs
      const { data: existingDebrief } = await supabase
        .from('session_debriefs')
        .select('id')
        .eq('user_id', user.id)
        .gte('session_end', threeHoursAgo)
        .limit(1);

      if (existingDebrief && existingDebrief.length > 0) {
        console.log('[detectSession] BLOCKED: existing debrief found within 3 hours');
        setDetecting(false);
        return null;
      }
      console.log('[detectSession] No existing debrief blocking — building session data');

      // 5. Group scores into plays
      const plays: SessionPlay[] = typedScores.map((s) => ({
        scenarioName: s.scenarios?.name || 'Unknown',
        score: s.score,
        timestamp: s.session_date,
        leaderboardId: s.scenarios?.kovaaks_id || undefined,
        aimType: s.scenarios?.category || undefined,
      }));

      // 6. Detect PRs by comparing against session_baselines (pre-launch snapshot)
      const baselineMap = await PlaylistService.getLatestBaseline(user.id, activeProgram.id);
      console.log('[detectSession] Loaded baseline with', baselineMap.size, 'scenarios');

      const prsDetected: PRDetection[] = [];
      // Track best score per scenario in this session (multiple plays per scenario possible)
      const bestBySession = new Map<string, number>();
      for (const play of plays) {
        const current = bestBySession.get(play.scenarioName) ?? 0;
        if (play.score > current) bestBySession.set(play.scenarioName, play.score);
      }

      for (const [scenarioName, sessionBest] of bestBySession.entries()) {
        const baseline = baselineMap.get(scenarioName);

        if (baseline === undefined) {
          // No baseline — scenario wasn't part of pre-launch snapshot. Skip silently.
          console.log('[detectSession] No baseline for', scenarioName, '— skipping PR check');
          continue;
        }

        if (sessionBest > baseline) {
          prsDetected.push({
            scenarioName,
            newScore: sessionBest,
            previousBest: baseline,
            improvementPct: baseline > 0 ? ((sessionBest - baseline) / baseline) * 100 : 0,
          });
          console.log('[detectSession] PR detected:', scenarioName, baseline, '→', sessionBest);
        }
      }

      // 7. Calculate categories
      const categories: Record<string, number> = {};
      for (const play of plays) {
        const cat = (play.aimType || 'other').toLowerCase();
        categories[cat] = (categories[cat] || 0) + 1;
      }

      // 8. Calculate score trajectory (normalized 0-1)
      const scores = plays.map((p) => p.score);
      const maxScore = Math.max(...scores, 1);
      const minScore = Math.min(...scores, 0);
      const range = maxScore - minScore || 1;
      const scoreTrajectory = scores.map((s) => (s - minScore) / range);

      // 9. Detect score decline
      const halfwayIdx = Math.floor(scores.length / 2);
      const firstHalfAvg =
        scores.slice(0, halfwayIdx).reduce((a, b) => a + b, 0) / (halfwayIdx || 1);
      const secondHalfAvg =
        scores.slice(halfwayIdx).reduce((a, b) => a + b, 0) /
        (scores.length - halfwayIdx || 1);
      const scoresDeclined =
        firstHalfAvg > 0 &&
        (firstHalfAvg - secondHalfAvg) / firstHalfAvg > SCORE_DECLINE_THRESHOLD;

      // 10. Calculate duration
      const sessionStart = plays[0].timestamp;
      const sessionEnd = plays[plays.length - 1].timestamp;
      const durationSeconds = Math.round(
        (new Date(sessionEnd).getTime() - new Date(sessionStart).getTime()) / 1000
      );

      const grouped: GroupedSession = {
        sessionStart,
        sessionEnd,
        durationSeconds: Math.max(durationSeconds, 60),
        plays,
        scenarioCount: plays.length,
        categories,
        prsDetected,
        scoreTrajectory,
        scoresDeclined,
        hasNewScenario: false,
      };

      lastDetectionRef.current = latestScoreDate;
      setSessionData(grouped);
      setDetecting(false);
      return grouped;
    } catch (err) {
      console.error('useSessionDetection error:', err);
      setDetecting(false);
      return null;
    }
  }, [user]);

  const clearSession = useCallback(() => {
    setSessionData(null);
  }, []);

  const resetDetection = useCallback(() => {
    lastDetectionRef.current = null;
    console.log('[detectSession] Detection reset — stale guard cleared');
  }, []);

  // Set a minimal empty session so debrief can open even with zero scores
  const setEmptySessionData = useCallback((session: GroupedSession) => {
    console.log('[detectSession] Setting empty session data for score-less debrief');
    setSessionData(session);
  }, []);

  return { sessionData, detecting, detectSession, clearSession, resetDetection, setEmptySessionData };
}
