import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { ScenarioNoteSnapshot } from '@/types/debrief';

/** A debrief row as read back for display (snake_case, straight from the table). */
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

const DEFAULT_DAYS = 30;

/**
 * The user's recent debriefs, newest first, with a cursor for browsing them.
 * The Logbook steps through these; `current` at index 0 is the latest, which is
 * what useLastDebrief exposes.
 */
export function useDebriefHistory({ days = DEFAULT_DAYS }: { days?: number } = {}) {
  const { user } = useAuth();
  const [debriefs, setDebriefs] = useState<LastDebriefRow[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setDebriefs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error: err } = await supabase
        .from('session_debriefs')
        .select(SELECT)
        .eq('user_id', user.id)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(days);

      if (err) {
        console.error('Failed to load debrief history:', err);
        setError(err.message);
        setDebriefs([]);
      } else {
        setError(null);
        // The select list is a const, so supabase-js cannot infer the row shape.
        const rows = (data ?? []) as unknown as LastDebriefRow[];
        setDebriefs(
          rows.map((r) => ({ ...r, scenario_notes: r.scenario_notes ?? [] }))
        );
      }
    } catch (e) {
      console.error('useDebriefHistory error:', e);
      setError(e instanceof Error ? e.message : 'Unknown error');
      setDebriefs([]);
    } finally {
      setLoading(false);
    }
  }, [user, days]);

  useEffect(() => {
    load();
  }, [load]);

  // A reload can shorten the list; never leave the cursor past the end.
  useEffect(() => {
    setIndex((i) => (debriefs.length === 0 ? 0 : Math.min(i, debriefs.length - 1)));
  }, [debriefs.length]);

  const current = debriefs[index] ?? null;
  const hasPrev = index < debriefs.length - 1; // older
  const hasNext = index > 0; // newer

  const prev = useCallback(() => setIndex((i) => Math.min(i + 1, Math.max(0, debriefs.length - 1))), [debriefs.length]);
  const next = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  /** Edits the row being viewed, not merely the newest one. */
  const updateNextIntent = useCallback(
    async (id: string, value: string | null) => {
      if (!user) return;
      const trimmed = value?.trim() || null;

      setDebriefs((prevRows) =>
        prevRows.map((r) => (r.id === id ? { ...r, next_intent: trimmed } : r))
      );

      const { error: err } = await supabase
        .from('session_debriefs')
        .update({ next_intent: trimmed })
        .eq('id', id)
        .eq('user_id', user.id);

      if (err) console.error('Failed to update next_intent:', err);
    },
    [user]
  );

  return useMemo(
    () => ({
      debriefs,
      index,
      current,
      prev,
      next,
      hasPrev,
      hasNext,
      loading,
      error,
      reload: load,
      updateNextIntent,
    }),
    [debriefs, index, current, prev, next, hasPrev, hasNext, loading, error, load, updateNextIntent]
  );
}
