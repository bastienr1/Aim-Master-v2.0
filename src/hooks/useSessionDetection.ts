import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
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
}

export function useSessionDetection(): UseSessionDetectionReturn {
  const { user } = useAuth();
  const [sessionData, setSessionData] = useState<GroupedSession | null>(null);
  const [detecting, setDetecting] = useState(false);
  const lastDetectionRef = useRef<string | null>(null);

  const detectSession = useCallback(async (): Promise<GroupedSession | null> => {
    if (!user) return null;
    setDetecting(true);

    try {
      // 1. Get Kovaaks username
      const { data: profile } = await supabase
        .from('kovaaks_profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.username) {
        setDetecting(false);
        return null;
      }

      // 2. Call the kovaaks-sync edge function to fetch recent activity
      const { data, error } = await supabase.functions.invoke('kovaaks-sync', {
        body: { action: 'full_sync', username: profile.username },
      });

      if (error || !data?.success) {
        console.error('Session detection sync failed:', error || data);
        setDetecting(false);
        return null;
      }

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
        setDetecting(false);
        return null;
      }

      const typedScores = recentScores as unknown as ScoreRow[];

      // 4. Check if we already debriefed these scores
      const latestScoreDate = typedScores[typedScores.length - 1].session_date;
      if (lastDetectionRef.current === latestScoreDate) {
        setDetecting(false);
        return null;
      }

      // Check against existing debriefs
      const { data: existingDebrief } = await supabase
        .from('session_debriefs')
        .select('id')
        .eq('user_id', user.id)
        .gte('session_end', threeHoursAgo)
        .limit(1);

      if (existingDebrief && existingDebrief.length > 0) {
        setDetecting(false);
        return null;
      }

      // 5. Group scores into plays
      const plays: SessionPlay[] = typedScores.map((s) => ({
        scenarioName: s.scenarios?.name || 'Unknown',
        score: s.score,
        timestamp: s.session_date,
        leaderboardId: s.scenarios?.kovaaks_id || undefined,
        aimType: s.scenarios?.category || undefined,
      }));

      // 6. Detect PRs by comparing against user_scenario_stats
      const prsDetected: PRDetection[] = [];
      for (const play of plays) {
        const matchingScore = typedScores.find(
          (s) => s.scenarios?.name === play.scenarioName
        );
        if (!matchingScore) continue;

        const { data: stats } = await supabase
          .from('user_scenario_stats')
          .select('high_score')
          .eq('user_id', user.id)
          .eq('scenario_id', matchingScore.scenario_id)
          .maybeSingle();

        if (stats && play.score >= stats.high_score) {
          const { data: previousScores } = await supabase
            .from('score_history')
            .select('score')
            .eq('user_id', user.id)
            .eq('scenario_id', matchingScore.scenario_id)
            .lt('session_date', play.timestamp)
            .order('score', { ascending: false })
            .limit(1);

          if (previousScores && previousScores.length > 0 && play.score > previousScores[0].score) {
            const prevBest = previousScores[0].score;
            prsDetected.push({
              scenarioName: play.scenarioName,
              newScore: play.score,
              previousBest: prevBest,
              improvementPct: prevBest > 0 ? ((play.score - prevBest) / prevBest) * 100 : 0,
            });
          }
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

  return { sessionData, detecting, detectSession, clearSession };
}
