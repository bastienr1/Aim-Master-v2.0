import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PlaylistService, type SyncedPlay } from '@/services/PlaylistService';
import { LocalStatsService } from '@/services/LocalStatsService';
import type { GroupedSession, SessionPlay } from '@/types/debrief';
import { LOCAL_STATS_LOOKBACK_MS, SCORE_DECLINE_THRESHOLD } from '@/constants/debrief-config';
import {
  categoriesByScenario,
  distinctScenarios,
} from '../../supabase/functions/kovaaks-scores/sessionPlays';

interface UseSessionDetectionReturn {
  sessionData: GroupedSession | null;
  detecting: boolean;
  detectSession: () => Promise<GroupedSession | null>;
  clearSession: () => void;
  resetDetection: () => void;
  setEmptySessionData: (session: GroupedSession) => void;
}

function toSessionPlay(play: SyncedPlay): SessionPlay {
  return {
    scenarioName: play.scenarioName,
    score: play.score,
    timestamp: play.playedAt,
    leaderboardId: play.leaderboardId ?? undefined,
    aimType: play.aimType ?? undefined,
    playKey: play.playKey,
    source: play.source,
    isChallenge: play.isChallenge,
  };
}

/**
 * Builds the post-session summary. The kovaaks-scores edge function decides
 * which runs belong to the session (local stats files, timestamped KovaaK's
 * activity, baseline changes) and persists them; this hook only offers it the
 * local runs, then shapes its answer for the debrief.
 */
export function useSessionDetection(): UseSessionDetectionReturn {
  const { user } = useAuth();
  const [sessionData, setSessionData] = useState<GroupedSession | null>(null);
  const [detecting, setDetecting] = useState(false);
  const lastDetectionRef = useRef<string | null>(null);
  const debriefInProgressRef = useRef(false);

  const detectSession = useCallback(async (): Promise<GroupedSession | null> => {
    if (!user) { console.log('[detectSession] No user — aborting'); return null; }

    if (debriefInProgressRef.current) {
      console.log('[detectSession] BLOCKED: debrief already in progress');
      return null;
    }

    console.log('[detectSession] Starting detection...');
    setDetecting(true);

    try {
      // 1. Kovaaks username
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

      // 2. Active program scopes the score sync and the Launch baseline
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
        ? activeProgram.scenarios_data.map((s: { scenarioName?: string }) => s.scenarioName).filter((n): n is string => !!n)
        : [];

      if (programScenarioNames.length === 0) {
        console.log('[detectSession] Active program has no scenarios');
        setDetecting(false);
        return null;
      }

      // 3. Local stats folder (the only complete record of a session), when linked
      let localRuns = await LocalStatsService.readRunsSince(Date.now() - LOCAL_STATS_LOOKBACK_MS);
      if (localRuns.length > 0) {
        console.log('[detectSession] Offering', localRuns.length, 'local runs to the sync');
      } else {
        localRuns = [];
      }

      // 4. Sync — the edge function returns this session's plays and PRs
      const syncResult = await PlaylistService.syncProgramScores(programScenarioNames, {
        programId: activeProgram.id,
        localRuns,
      });
      if (!syncResult.success || !syncResult.data) {
        console.error('[detectSession] Scoped sync failed:', syncResult.error);
        setDetecting(false);
        return null;
      }
      const synced = syncResult.data;
      console.log('[detectSession] Sync succeeded:', {
        synced: synced.synced,
        matched: synced.matched,
        plays: synced.plays?.length,
        window: synced.window,
      });

      if (!Array.isArray(synced.plays)) {
        console.warn('[detectSession] kovaaks-scores did not return session plays — deploy the current function');
        setDetecting(false);
        return null;
      }

      if (synced.plays.length === 0) {
        console.log('[detectSession] No plays in the session window', synced.window);
        setDetecting(false);
        return null;
      }

      const plays = synced.plays.map(toSessionPlay);
      const latestPlayAt = plays[plays.length - 1].timestamp;

      // 5. Already debriefed these plays?
      if (lastDetectionRef.current === latestPlayAt) {
        console.log('[detectSession] BLOCKED: lastDetectionRef matches latest play:', latestPlayAt);
        setDetecting(false);
        return null;
      }

      const { data: existingDebrief } = await supabase
        .from('session_debriefs')
        .select('id')
        .eq('user_id', user.id)
        .gte('session_end', latestPlayAt)
        .limit(1);

      if (existingDebrief && existingDebrief.length > 0) {
        console.log('[detectSession] BLOCKED: a debrief already covers the latest play');
        setDetecting(false);
        return null;
      }

      // 6. Shape the session. Challenge runs drive the score trend; freeplay
      // runs still count as "played".
      const challengeScores = synced.plays.filter((p) => p.isChallenge).map((p) => p.score);
      const scores = challengeScores.length >= 2 ? challengeScores : plays.map((p) => p.score);
      const maxScore = Math.max(...scores, 1);
      const minScore = Math.min(...scores, 0);
      const range = maxScore - minScore || 1;
      const scoreTrajectory = scores.map((s) => (s - minScore) / range);

      const halfwayIdx = Math.floor(scores.length / 2);
      const firstHalfAvg = scores.slice(0, halfwayIdx).reduce((a, b) => a + b, 0) / (halfwayIdx || 1);
      const secondHalfAvg = scores.slice(halfwayIdx).reduce((a, b) => a + b, 0) / (scores.length - halfwayIdx || 1);
      const scoresDeclined =
        firstHalfAvg > 0 && (firstHalfAvg - secondHalfAvg) / firstHalfAvg > SCORE_DECLINE_THRESHOLD;

      const sessionStart = plays[0].timestamp;
      const sessionEnd = latestPlayAt;
      const durationSeconds = Math.round(
        (new Date(sessionEnd).getTime() - new Date(sessionStart).getTime()) / 1000
      );

      const prsDetected = synced.prs ?? [];
      for (const pr of prsDetected) {
        console.log('[detectSession] PR detected:', pr.scenarioName, pr.previousBest, '→', pr.newScore);
      }

      const grouped: GroupedSession = {
        sessionStart,
        sessionEnd,
        durationSeconds: Math.max(durationSeconds, 60),
        plays,
        scenarioCount: distinctScenarios(synced.plays).length,
        categories: categoriesByScenario(synced.plays),
        prsDetected,
        scoreTrajectory,
        scoresDeclined,
        hasNewScenario: false,
      };

      lastDetectionRef.current = latestPlayAt;
      debriefInProgressRef.current = true;
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
    debriefInProgressRef.current = false;
    console.log('[detectSession] Lock cleared — debrief closed');
  }, []);

  const resetDetection = useCallback(() => {
    lastDetectionRef.current = null;
    debriefInProgressRef.current = false;
    console.log('[detectSession] Detection reset — stale guard cleared, lock released');
  }, []);

  // Set a minimal empty session so debrief can open even with zero scores
  const setEmptySessionData = useCallback((session: GroupedSession) => {
    console.log('[detectSession] Setting empty session data for score-less debrief');
    debriefInProgressRef.current = true;
    setSessionData(session);
  }, []);

  return { sessionData, detecting, detectSession, clearSession, resetDetection, setEmptySessionData };
}
