import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getThemeConfig } from '@/constants/debrief-config';
import type { VaultTip } from '@/types/debrief';
import type { LastDebriefRow } from './useLastDebrief';

/** How a tip was chosen — drives whether the "Matched to" label is shown. */
export type TipMatch = 'theme' | 'kind' | 'any' | null;

/** Stable hash so one debrief always opens on the same tip across reloads. */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Picks a vault tip for the given debrief, best match first:
 *   1. tips whose `themes` overlap the debrief's primary/secondary theme
 *   2. tips whose `kind` matches the primary theme's kind
 *   3. any tip
 * Tips are few per user, so they are fetched once and tiered client-side
 * rather than costing three round-trips.
 */
export function useVaultTip(debrief: LastDebriefRow | null) {
  const { user } = useAuth();
  const [tips, setTips] = useState<VaultTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!user) {
      setTips([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('vault_tips')
        .select('id, user_id, source_path, title, body, drill, themes, tags, kind, updated_at')
        .eq('user_id', user.id);

      if (cancelled) return;
      if (error) {
        console.error('Failed to load vault tips:', error);
        setTips([]);
      } else {
        setTips((data ?? []) as VaultTip[]);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // A new debrief resets the rotation to that debrief's deterministic starting point.
  useEffect(() => {
    setOffset(0);
  }, [debrief?.id]);

  const { matched, matchedOn, matchedTheme } = useMemo(() => {
    if (tips.length === 0) {
      return { matched: [] as VaultTip[], matchedOn: null as TipMatch, matchedTheme: null as string | null };
    }

    const themes = [debrief?.primary_theme, debrief?.secondary_theme].filter(
      (t): t is string => !!t
    );

    const byTheme = tips.filter((tip) => tip.themes.some((t) => themes.includes(t)));
    if (byTheme.length > 0) {
      // Label against the primary theme when it is the one that matched.
      const primary = debrief?.primary_theme ?? null;
      const primaryMatched = byTheme.some((tip) => primary && tip.themes.includes(primary));
      return {
        matched: byTheme,
        matchedOn: 'theme' as TipMatch,
        matchedTheme: primaryMatched ? primary : debrief?.secondary_theme ?? null,
      };
    }

    const primaryKind = getThemeConfig(debrief?.primary_theme)?.kind ?? null;
    if (primaryKind) {
      const byKind = tips.filter((tip) => tip.kind === primaryKind);
      if (byKind.length > 0) {
        return {
          matched: byKind,
          matchedOn: 'kind' as TipMatch,
          matchedTheme: debrief?.primary_theme ?? null,
        };
      }
    }

    return { matched: tips, matchedOn: 'any' as TipMatch, matchedTheme: null };
  }, [tips, debrief?.primary_theme, debrief?.secondary_theme]);

  const tip = useMemo(() => {
    if (matched.length === 0) return null;
    const seed = debrief?.id ? hashString(debrief.id) : 0;
    return matched[(seed + offset) % matched.length];
  }, [matched, debrief?.id, offset]);

  const next = useCallback(() => {
    setOffset((prev) => prev + 1);
  }, []);

  return {
    tip,
    matchedOn,
    matchedTheme,
    loading,
    /** True once loaded and the user has no tips at all — drives the sync empty state. */
    isEmpty: !loading && tips.length === 0,
    hasMultiple: matched.length > 1,
    next,
  };
}
