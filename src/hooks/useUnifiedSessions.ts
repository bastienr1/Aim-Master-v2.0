import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface UnifiedSession {
  id: string;
  type: 'full' | 'debrief_only' | 'checkin_only';
  created_at: string;
  checkin_id: string | null;
  energy_level: number | null;
  focus_level: number | null;
  mood_level: number | null;
  session_intent: string | null;
  checkin_skipped: boolean;
  debrief_id: string | null;
  primary_theme: string | null;
  secondary_theme: string | null;
  freeform_text: string | null;
  emoji_reaction: string | null;
  session_quality: number | null;
  prs_detected: any[];
  categories: Record<string, number>;
  duration_seconds: number | null;
  scenario_count: number | null;
  scenario_notes: Array<{ scenario_name: string; notes_text: string; completed_at: string | null }> | null;
}

export function getMoodLabel(s: UnifiedSession): string {
  if (!s.debrief_id) return 'no debrief';
  const q = s.session_quality;
  if (q === null) return 'neutral';
  if (q >= 4) return 'fired up';
  if (q === 3) return 'neutral';
  if (q === 2) return 'tilted';
  return 'drained';
}

export function getMoodKey(s: UnifiedSession): 'fired' | 'neutral' | 'tilted' | 'drained' | 'none' {
  if (!s.debrief_id) return 'none';
  const q = s.session_quality;
  if (q === null) return 'neutral';
  if (q >= 4) return 'fired';
  if (q === 3) return 'neutral';
  if (q === 2) return 'tilted';
  return 'drained';
}

export function useUnifiedSessions(limit: number = 20) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<UnifiedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchSessions = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: debriefs, error: debErr } = await supabase
        .from('session_debriefs')
        .select('id, created_at, primary_theme, secondary_theme, freeform_text, emoji_reaction, session_quality, prs_detected, categories, duration_seconds, scenario_count, scenario_notes, checkin_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (debErr) throw debErr;

      const linkedCheckinIds = new Set(
        (debriefs ?? []).map(d => d.checkin_id).filter(Boolean) as string[]
      );

      const { data: checkins, error: chkErr } = await supabase
        .from('mental_checkins')
        .select('id, created_at, energy_level, focus_level, mood_level, session_intent, skipped')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit * 2);
      if (chkErr) throw chkErr;

      const checkinMap = new Map<string, (typeof checkins)[number]>();
      for (const c of checkins ?? []) checkinMap.set(c.id, c);

      const unified: UnifiedSession[] = [];

      for (const d of debriefs ?? []) {
        const c = d.checkin_id ? checkinMap.get(d.checkin_id) : null;
        unified.push({
          id: d.id,
          type: c ? 'full' : 'debrief_only',
          created_at: d.created_at,
          checkin_id: d.checkin_id,
          energy_level: c?.energy_level ?? null,
          focus_level: c?.focus_level ?? null,
          mood_level: c?.mood_level ?? null,
          session_intent: c?.session_intent ?? null,
          checkin_skipped: c?.skipped ?? false,
          debrief_id: d.id,
          primary_theme: d.primary_theme,
          secondary_theme: d.secondary_theme,
          freeform_text: d.freeform_text,
          emoji_reaction: d.emoji_reaction,
          session_quality: d.session_quality,
          prs_detected: Array.isArray(d.prs_detected) ? d.prs_detected : [],
          categories: (d.categories as Record<string, number>) ?? {},
          duration_seconds: d.duration_seconds,
          scenario_count: d.scenario_count,
          scenario_notes: Array.isArray(d.scenario_notes)
            ? (d.scenario_notes as any[]).filter(sn => sn?.notes_text?.trim())
            : null,
        });
      }

      for (const c of checkins ?? []) {
        if (!linkedCheckinIds.has(c.id) && !unified.some(u => u.checkin_id === c.id)) {
          unified.push({
            id: c.id,
            type: 'checkin_only',
            created_at: c.created_at,
            checkin_id: c.id,
            energy_level: c.energy_level,
            focus_level: c.focus_level,
            mood_level: c.mood_level,
            session_intent: c.session_intent,
            checkin_skipped: c.skipped,
            debrief_id: null,
            primary_theme: null,
            secondary_theme: null,
            freeform_text: null,
            emoji_reaction: null,
            session_quality: null,
            prs_detected: [],
            categories: {},
            duration_seconds: null,
            scenario_count: null,
            scenario_notes: null,
          });
        }
      }

      const filtered = unified.filter(s => {
        if (s.type === 'checkin_only' && s.checkin_skipped) return false;
        return true;
      });

      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSessions(filtered.slice(0, limit));

      const { count } = await supabase
        .from('session_debriefs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setTotalCount(count ?? 0);
    } catch (err) {
      console.error('useUnifiedSessions error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, limit]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  return { sessions, loading, totalCount, refetch: fetchSessions };
}
