import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { ScenarioNoteSnapshot } from '@/types/debrief';

/** The most recent debrief row, as read back for display (snake_case, straight from the table). */
export interface LastDebriefRow {
  id: string;
  session_start: string;
  session_end: string;
  duration_seconds: number;
  scenario_count: number;
  primary_theme: string | null;
  secondary_theme: string | null;
  session_quality: number | null;
  freeform_text: string | null;
  scenario_notes: ScenarioNoteSnapshot[];
  next_intent: string | null;
  created_at: string;
}

const SELECT =
  'id, session_start, session_end, duration_seconds, scenario_count, primary_theme, ' +
  'secondary_theme, session_quality, freeform_text, scenario_notes, next_intent, created_at';

/**
 * Most recent session debrief for the signed-in user — the source for the Home
 * "Last session" card and for pre-filling the next check-in's carry-forward.
 */
export function useLastDebrief() {
  const { user } = useAuth();
  const [debrief, setDebrief] = useState<LastDebriefRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setDebrief(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('session_debriefs')
        .select(SELECT)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (err) {
        console.error('Failed to load last debrief:', err);
        setError(err.message);
        setDebrief(null);
      } else {
        setError(null);
        // The select list is a const, so supabase-js can't infer the row shape.
        const row = data as LastDebriefRow | null;
        setDebrief(
          row ? { ...row, scenario_notes: row.scenario_notes ?? [] } : null
        );
      }
    } catch (e) {
      console.error('useLastDebrief error:', e);
      setError(e instanceof Error ? e.message : 'Unknown error');
      setDebrief(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  /** Edit the carry-forward on the stored row (Home card + check-in share this). */
  const updateNextIntent = useCallback(
    async (nextIntent: string | null) => {
      if (!user || !debrief) return;

      const value = nextIntent?.trim() || null;
      setDebrief((prev) => (prev ? { ...prev, next_intent: value } : prev));

      const { error: err } = await supabase
        .from('session_debriefs')
        .update({ next_intent: value })
        .eq('id', debrief.id)
        .eq('user_id', user.id);

      if (err) console.error('Failed to update next_intent:', err);
    },
    [user, debrief]
  );

  return { debrief, loading, error, reload: load, updateNextIntent };
}
