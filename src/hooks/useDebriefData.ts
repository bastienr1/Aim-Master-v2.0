import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { GroupedSession, SessionDebrief, DebriefInsight } from '@/types/debrief';
import {
  DEBRIEF_MOTIVATIONAL_TIPS,
  INSIGHT_MIN_DEBRIEFS,
} from '@/constants/debrief-config';

export function useDebriefData() {
  const { user } = useAuth();

  /** Save a completed debrief to Supabase */
  const saveDebrief = useCallback(async (
    session: GroupedSession,
    debrief: SessionDebrief,
  ): Promise<string | null> => {
    if (!user) return null;

    try {
      // Find most recent check-in within 3 hours to link
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const { data: recentCheckin } = await supabase
        .from('mental_checkins')
        .select('id')
        .eq('user_id', user.id)
        .eq('skipped', false)
        .gte('created_at', threeHoursAgo)
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: row, error } = await supabase
        .from('session_debriefs')
        .insert({
          user_id: user.id,
          session_start: session.sessionStart,
          session_end: session.sessionEnd,
          duration_seconds: session.durationSeconds,
          scenario_count: session.scenarioCount,
          categories: session.categories,
          prs_detected: session.prsDetected,
          score_trajectory: session.scoreTrajectory,
          scores_declined: session.scoresDeclined,
          primary_theme: debrief.primaryTheme,
          secondary_theme: debrief.secondaryTheme,
          freeform_text: debrief.freeformText,
          emoji_reaction: debrief.emojiReaction,
          session_quality: debrief.sessionQuality,
          checkin_id: recentCheckin?.[0]?.id || null,
          kovaaks_play_ids: session.plays.map((p) => p.leaderboardId).filter(Boolean),
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to save debrief:', error);
        return null;
      }

      return row?.id || null;
    } catch (err) {
      console.error('saveDebrief error:', err);
      return null;
    }
  }, [user]);

  /** Get count of completed debriefs for the current user */
  const getDebriefCount = useCallback(async (): Promise<number> => {
    if (!user) return 0;
    try {
      const { count, error } = await supabase
        .from('session_debriefs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to get debrief count:', error);
        return 0;
      }
      return count ?? 0;
    } catch (err) {
      console.error('getDebriefCount error:', err);
      return 0;
    }
  }, [user]);

  /** Get insight for the session quality screen */
  const getInsight = useCallback(async (debriefCount: number): Promise<DebriefInsight> => {
    if (debriefCount < INSIGHT_MIN_DEBRIEFS) {
      const idx = Math.floor(Math.random() * DEBRIEF_MOTIVATIONAL_TIPS.length);
      return { message: DEBRIEF_MOTIVATIONAL_TIPS[idx], type: 'motivational' };
    }

    return {
      message: 'Keep logging sessions to unlock personalized training insights.',
      type: 'motivational',
    };
  }, []);

  return { saveDebrief, getDebriefCount, getInsight };
}
