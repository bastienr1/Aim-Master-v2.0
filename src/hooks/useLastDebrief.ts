import { useCallback } from 'react';
import { useDebriefHistory } from './useDebriefHistory';
import type { LastDebriefRow } from './useDebriefHistory';

export type { LastDebriefRow };

/**
 * The single most recent debrief — a thin view over useDebriefHistory's index 0.
 * Kept so callers that only want "the last session" need not carry a cursor.
 */
export function useLastDebrief() {
  const history = useDebriefHistory();
  const debrief = history.debriefs[0] ?? null;

  const updateNextIntent = useCallback(
    async (value: string | null) => {
      if (!debrief) return;
      await history.updateNextIntent(debrief.id, value);
    },
    [debrief, history]
  );

  return {
    debrief,
    loading: history.loading,
    error: history.error,
    reload: history.reload,
    updateNextIntent,
  };
}
