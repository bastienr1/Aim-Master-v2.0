// src/hooks/useWeeklyRecap.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface WeeklyRecap {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  week_number: number;
  year: number;
  total_sessions: number;
  total_duration_seconds: number;
  total_scenarios: number;
  days_trained: number;
  total_checkins: number;
  avg_energy: number | null;
  avg_focus: number | null;
  avg_mood: number | null;
  avg_readiness: number | null;
  avg_session_quality: number | null;
  prs_this_week: number;
  pr_details: Array<{ scenario?: string; old_score?: number; new_score?: number; category?: string }>;
  most_common_theme: string | null;
  theme_frequency: Record<string, number>;
  emoji_frequency: Record<string, number>;
  intent_distribution: Record<string, number>;
  categories_trained: Record<string, number>;
  session_notes: Array<{ date: string; text: string; theme?: string; quality?: number; emoji?: string }>;
  summary_text: string | null;
  highlight: string | null;
  focus_area: string | null;
  checkin_streak_at_week_end: number;
  generation_method: string;
  created_at: string;
}

function getDismissKey(weekNumber: number, year: number): string {
  return `recap_dismissed_w${weekNumber}_${year}`;
}

export function useWeeklyRecap() {
  const { user } = useAuth();
  const [pinnedRecap, setPinnedRecap] = useState<WeeklyRecap | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [needsGeneration, setNeedsGeneration] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pastRecaps, setPastRecaps] = useState<WeeklyRecap[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPinnedRecap = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    try {
      // Current week's Monday
      const now = new Date();
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() + diffToMonday);
      currentWeekStart.setHours(0, 0, 0, 0);
      const currentWeekStartStr = currentWeekStart.toISOString().split('T')[0];

      // Fetch most recent recap where week_start < current week start
      const { data } = await supabase
        .from('weekly_recaps')
        .select('*')
        .eq('user_id', user.id)
        .lt('week_start', currentWeekStartStr)
        .order('week_start', { ascending: false })
        .limit(1);

      if (data?.length) {
        const recap = data[0] as WeeklyRecap;
        setPinnedRecap(recap);

        const dismissKey = getDismissKey(recap.week_number, recap.year);
        setIsDismissed(localStorage.getItem(dismissKey) === 'true');
        setNeedsGeneration(false);
      } else {
        setPinnedRecap(null);
        // Check if there's data from last week that needs a recap
        const lastWeekStart = new Date(currentWeekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);

        const { count } = await supabase
          .from('session_debriefs')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', lastWeekStart.toISOString())
          .lt('created_at', currentWeekStart.toISOString());

        setNeedsGeneration((count || 0) > 0);
      }
    } catch (err) {
      console.error('fetchPinnedRecap error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const dismissRecap = useCallback(() => {
    if (!pinnedRecap) return;
    const dismissKey = getDismissKey(pinnedRecap.week_number, pinnedRecap.year);
    localStorage.setItem(dismissKey, 'true');
    setIsDismissed(true);
  }, [pinnedRecap]);

  const showRecap = useCallback(() => {
    if (!pinnedRecap) return;
    const dismissKey = getDismissKey(pinnedRecap.week_number, pinnedRecap.year);
    localStorage.removeItem(dismissKey);
    setIsDismissed(false);
  }, [pinnedRecap]);

  const generateRecap = useCallback(async (weekStart?: string) => {
    if (!user) return { data: null, error: 'No user' };
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.rpc('generate_weekly_recap', {
        p_user_id: user.id,
        p_week_start: weekStart || null,
      });

      if (!error) {
        await fetchPinnedRecap();
      }
      return { data, error };
    } catch (err) {
      console.error('generateRecap error:', err);
      return { data: null, error: String(err) };
    } finally {
      setIsGenerating(false);
    }
  }, [user, fetchPinnedRecap]);

  const fetchPastRecaps = useCallback(async (limit = 10) => {
    if (!user) return;

    const { data } = await supabase
      .from('weekly_recaps')
      .select('*')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .limit(limit);

    setPastRecaps((data || []) as WeeklyRecap[]);
  }, [user]);

  useEffect(() => {
    fetchPinnedRecap();
  }, [fetchPinnedRecap]);

  return {
    pinnedRecap,
    isDismissed,
    needsGeneration,
    isGenerating,
    pastRecaps,
    loading,
    dismissRecap,
    showRecap,
    generateRecap,
    fetchPastRecaps,
  };
}
