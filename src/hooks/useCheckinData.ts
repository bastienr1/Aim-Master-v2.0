import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { GENERIC_COACHING_MESSAGES } from '@/constants/checkin-config';

// ─── Types ───

export interface CheckinData {
  energy_level: number;
  focus_level: number;
  mood_level: number | null;
  session_intent: string;
}

export interface CheckinRow {
  id: string;
  user_id: string;
  energy_level: number | null;
  focus_level: number | null;
  mood_level: number | null;
  session_intent: string | null;
  skipped: boolean;
  coaching_tip_shown: string | null;
  created_at: string;
}

// Matches the JSONB structure in the database:
// {"energy_level": [1, 2], "session_intent": ["push_pr"]}
type TriggerCondition = Record<string, number[] | string[]>;

interface CoachingInsightRow {
  id: string;
  tier: number;
  trigger_condition: TriggerCondition;
  message_template: string;
  priority: number;
  category: string;
}

// ─── Hook ───

export function useCheckinData() {
  /**
   * Save a completed check-in to Supabase.
   */
  const saveCheckin = useCallback(async (data: CheckinData): Promise<CheckinRow | null> => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) return null;

      const { data: row, error } = await supabase
        .from('mental_checkins')
        .insert({
          user_id: userData.user.id,
          energy_level: data.energy_level,
          focus_level: data.focus_level,
          mood_level: data.mood_level,
          session_intent: data.session_intent,
          skipped: false,
          coaching_tip_shown: null,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to save checkin:', error);
        return null;
      }

      return row as CheckinRow;
    } catch (err) {
      console.error('saveCheckin error:', err);
      return null;
    }
  }, []);

  /**
   * Save a skipped check-in entry.
   */
  const saveSkippedCheckin = useCallback(async (): Promise<CheckinRow | null> => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) return null;

      const { data: row, error } = await supabase
        .from('mental_checkins')
        .insert({
          user_id: userData.user.id,
          energy_level: null,
          focus_level: null,
          mood_level: null,
          session_intent: null,
          skipped: true,
          coaching_tip_shown: null,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to save skipped checkin:', error);
        return null;
      }

      return row as CheckinRow;
    } catch (err) {
      console.error('saveSkippedCheckin error:', err);
      return null;
    }
  }, []);

  /**
   * Get total count of non-skipped check-ins for the current user.
   * Used to determine coaching tier.
   */
  const getCheckinCount = useCallback(async (): Promise<number> => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) return 0;

      const { count, error } = await supabase
        .from('mental_checkins')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userData.user.id)
        .eq('skipped', false);

      if (error) {
        console.error('Failed to get checkin count:', error);
        return 0;
      }

      return count ?? 0;
    } catch (err) {
      console.error('getCheckinCount error:', err);
      return 0;
    }
  }, []);

  /**
   * Get the last N check-ins for the current user.
   */
  const getCheckinHistory = useCallback(async (limit: number = 10): Promise<CheckinRow[]> => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) return [];

      const { data, error } = await supabase
        .from('mental_checkins')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get checkin history:', error);
        return [];
      }

      return (data ?? []) as CheckinRow[];
    } catch (err) {
      console.error('getCheckinHistory error:', err);
      return [];
    }
  }, []);

  /**
   * Determine coaching tier from check-in count.
   * < 5 = tier 1, 5-20 = tier 2, 20+ = tier 3
   */
  const getTier = (count: number): number => {
    if (count >= 20) return 3;
    if (count >= 5) return 2;
    return 1;
  };

  /**
   * Get the best coaching insight for the given check-in data and tier.
   *
   * Matching logic:
   * - trigger_condition is JSONB with array values, e.g.:
   *   {"energy_level": [1, 2]} means "match if user's energy is 1 OR 2"
   *   {"session_intent": ["push_pr"]} means "match if intent is push_pr"
   *   {"mood_level": [4, 5], "focus_level": [4, 5]} means "match if BOTH mood AND focus are in range"
   * - ALL conditions in a single insight must match (AND logic across keys)
   * - More conditions = more specific = higher priority (handled by priority column)
   */
  const getCoachingInsight = useCallback(
    async (checkinData: CheckinData, tier: number): Promise<string> => {
      // Tier 2 & 3: placeholder for now
      if (tier >= 2) {
        return 'Personalized insights coming soon — keep checking in to unlock them.';
      }

      try {
        // Fetch all tier 1 insights, sorted by priority DESC
        const { data: insights, error } = await supabase
          .from('coaching_insights')
          .select('*')
          .eq('tier', 1)
          .eq('active', true)
          .order('priority', { ascending: false });

        if (error || !insights || insights.length === 0) {
          return getRandomGenericMessage();
        }

        // Build a lookup map from the user's check-in data
        const userValues: Record<string, number | string | null> = {
          energy_level: checkinData.energy_level,
          focus_level: checkinData.focus_level,
          mood_level: checkinData.mood_level,
          session_intent: checkinData.session_intent,
        };

        // Find matching insights
        const matches = (insights as CoachingInsightRow[]).filter((insight) => {
          const cond = insight.trigger_condition;
          if (!cond || typeof cond !== 'object') return false;

          // Every key in the condition must match
          for (const key of Object.keys(cond)) {
            const allowedValues = cond[key];
            const userValue = userValues[key];

            // If the condition references a field the user didn't provide (e.g., mood_level is null), skip this insight
            if (userValue === null || userValue === undefined) return false;

            // Check if the user's value is in the allowed array
            if (Array.isArray(allowedValues)) {
              // Handle both number arrays and string arrays
              if (!allowedValues.includes(userValue as never)) return false;
            }
          }

          return true;
        });

        if (matches.length === 0) {
          return getRandomGenericMessage();
        }

        // Return highest priority match (already sorted by priority DESC)
        return matches[0].message_template;
      } catch (err) {
        console.error('getCoachingInsight error:', err);
        return getRandomGenericMessage();
      }
    },
    []
  );

  /**
   * Update the coaching_tip_shown field on a check-in row.
   */
  const updateCoachingTip = useCallback(async (checkinId: string, tip: string): Promise<void> => {
    try {
      await supabase
        .from('mental_checkins')
        .update({ coaching_tip_shown: tip })
        .eq('id', checkinId);
    } catch (err) {
      console.error('updateCoachingTip error:', err);
    }
  }, []);

  /**
   * STUB: Get average Kovaaks scores when a specific checkin field equals a value.
   * Will be implemented later for tier 2 cross-table correlation.
   */
  const getAveragesByLevel = useCallback(
    async (_field: string, _value: number): Promise<null> => {
      return null;
    },
    []
  );

  return {
    saveCheckin,
    saveSkippedCheckin,
    getCheckinCount,
    getCheckinHistory,
    getTier,
    getCoachingInsight,
    updateCoachingTip,
    getAveragesByLevel,
  };
}

function getRandomGenericMessage(): string {
  const idx = Math.floor(Math.random() * GENERIC_COACHING_MESSAGES.length);
  return GENERIC_COACHING_MESSAGES[idx];
}
