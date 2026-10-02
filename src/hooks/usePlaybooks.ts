import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Playbook,
  PlaybookSummary,
  PlaybookDetail,
  PlaybookChapter,
  PlaybookMoment,
  PlaybookDrill,
} from '@/types/playbook';

type SummaryRow = Playbook & {
  playbook_chapters: { count: number }[] | null;
  playbook_moments: { count: number }[] | null;
};

/**
 * The signed-in user's playbooks with chapter and moment counts, newest first.
 * Playbooks are few per user and change only when the vault is synced, so they
 * are fetched once per mount.
 */
export function usePlaybookIndex() {
  const { user } = useAuth();
  const [playbooks, setPlaybooks] = useState<PlaybookSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPlaybooks([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('playbooks')
        .select('*, playbook_chapters(count), playbook_moments(count)')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (cancelled) return;
      if (error) {
        // Expected until the 20261002_playbooks.sql migration has been run.
        console.error('Failed to load playbooks:', error);
        setPlaybooks([]);
      } else {
        const rows = (data ?? []) as unknown as SummaryRow[];
        setPlaybooks(
          rows.map(({ playbook_chapters, playbook_moments, ...playbook }) => ({
            ...playbook,
            chapter_count: playbook_chapters?.[0]?.count ?? 0,
            moment_count: playbook_moments?.[0]?.count ?? 0,
          }))
        );
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { playbooks, loading };
}

const EMPTY: PlaybookDetail = { chapters: [], moments: [], drills: [] };

interface Loaded {
  id: string;
  detail: PlaybookDetail;
}

/** Chapters, moments and drills of one playbook. Null id loads nothing. */
export function usePlaybookDetail(playbookId: string | null) {
  // Loading is derived: the result is stale until it was fetched for this id.
  const [result, setResult] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!playbookId) return;

    let cancelled = false;
    (async () => {
      const [chapters, moments, drills] = await Promise.all([
        supabase.from('playbook_chapters').select('*').eq('playbook_id', playbookId).order('chapter_number'),
        supabase
          .from('playbook_moments')
          .select('*')
          .eq('playbook_id', playbookId)
          .order('chapter_number')
          .order('position'),
        supabase.from('playbook_drills').select('*').eq('playbook_id', playbookId).order('position'),
      ]);

      if (cancelled) return;
      const error = chapters.error ?? moments.error ?? drills.error;
      if (error) console.error('Failed to load playbook:', error);

      setResult({
        id: playbookId,
        detail: {
          chapters: (chapters.data ?? []) as PlaybookChapter[],
          moments: (moments.data ?? []) as PlaybookMoment[],
          drills: (drills.data ?? []) as PlaybookDrill[],
        },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [playbookId]);

  const current = playbookId && result?.id === playbookId ? result.detail : null;
  return { detail: current ?? EMPTY, loading: !!playbookId && !current };
}
