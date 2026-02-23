import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SessionNote {
  id: string;
  created_at: string;
  primary_theme: string | null;
  secondary_theme: string | null;
  freeform_text: string | null;
  emoji_reaction: string | null;
  session_quality: number | null;
  prs_detected: any[];
  categories: Record<string, number>;
  duration_seconds: number | null;
  scenario_count: number | null;
}

export function useSessionNotes(limit: number = 5) {
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get total count for "View All" logic
      const { count } = await supabase
        .from('session_debriefs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch most recent notes
      const { data, error } = await supabase
        .from('session_debriefs')
        .select('id, created_at, primary_theme, secondary_theme, freeform_text, emoji_reaction, session_quality, prs_detected, categories, duration_seconds, scenario_count')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setNotes(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching session notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotes(); }, [limit]);

  return { notes, loading, totalCount, refetch: fetchNotes };
}
